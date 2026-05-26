import { Injectable } from '@nestjs/common';
import type { TLockerPricingResponse } from '@zoom/schemas';
import {
	FLAT_CODES,
	WITH_FREIGHT_CODES,
} from '../../domain/constants/service-code-branches';
import { LockerInvalidException } from '../../domain/exceptions/locker-invalid.exception';
import {
	CalculateLockerPricingUseCasePort,
	type TCalculateLockerPricingInternalCommand,
} from '../ports/in/calculate-locker-pricing.use-case.port';
import { ValidateLockerUseCasePort } from '../ports/in/validate-locker.use-case.port';
import { CatalogReaderPort } from '../ports/out/catalog-reader.port';
import { CityTaxRatesReaderPort } from '../ports/out/city-tax-rates-reader.port';
import { PricingRuleRepositoryPort } from '../ports/out/pricing-rule-repository.port';
import { calculateInsurance } from '../primitives/calculate-insurance';
import { calculateNationalOverweightAmount } from '../primitives/calculate-national-overweight-amount';
import { calculateOverweightKilos } from '../primitives/calculate-overweight-kilos';
import { calculatePostalTax } from '../primitives/calculate-postal-tax';
import { calculateTransportCharge } from '../primitives/calculate-transport-charge';
import { convertBsToUsd } from '../primitives/convert-bs-to-usd';
import { convertUsdToBs } from '../primitives/convert-usd-to-bs';
import { resolveCityTaxRates } from '../primitives/resolve-city-tax-rates';
import { resolveWeightTypeCode } from '../primitives/resolve-weight-type-code';

const round2 = (n: number): number => Math.round(n * 100) / 100;

@Injectable()
export class CalculateLockerPricingUseCase
	implements CalculateLockerPricingUseCasePort
{
	constructor(
		private readonly validateLocker: ValidateLockerUseCasePort,
		private readonly pricingRuleRepository: PricingRuleRepositoryPort,
		private readonly catalogReader: CatalogReaderPort,
		private readonly cityTaxRatesReader: CityTaxRatesReaderPort,
	) {}

	async execute(
		cmd: TCalculateLockerPricingInternalCommand,
	): Promise<TLockerPricingResponse> {
		// Convert wire input (USD) → Bs at the boundary. The legacy insurance
		// primitive expects Bs.
		const { bcvRate } = cmd;
		const declaredValue = convertUsdToBs(cmd.declaredValueUsd ?? 0, bcvRate);

		// ─── Step 1: Validate locker ───────────────────────────────────────
		// LEGACY: the granular PRICING_LOCKER_* failureCodes from the validate
		// use case must collapse to PRICING_LOCKER_INVALID here — story AC-02
		// mandates a single catch-all message for the pricing flow.
		const locker = await this.validateLocker.execute({
			siglas: cmd.siglas,
			lockerNumber: cmd.lockerNumber,
		});
		if (!locker.valid) {
			throw new LockerInvalidException({ failureCode: locker.failureCode });
		}

		const serviceCode = locker.serviceCode; // LEGACY: was `codservicio`
		const today = new Date();

		// ─── Pre-flight: serviceCode must belong to a known branch ─────────
		// Validate up-front so an unknown codservicio fails fast WITHOUT
		// firing the four downstream rule lookups (taxRates, weightTypeCode,
		// insurance, bcvRate). Defensive — the validate-locker use case
		// already guarantees a service row exists, but the code may still
		// fall outside the two pricing-branch sets (e.g. a newly catalogued
		// service we haven't classified yet).
		if (!WITH_FREIGHT_CODES.has(serviceCode) && !FLAT_CODES.has(serviceCode)) {
			throw new LockerInvalidException({
				failureCode: 'NOT_FOUND',
				reason: 'unknown_service_code',
				serviceCode,
			});
		}

		// ─── Steps 2-4 + insurance in parallel ─────────────────────────────
		// All three reads are independent of each other (and of the branch
		// decision in Step 5). The legacy PHP runs them sequentially but
		// no value depends on another — each rule is a self-contained
		// numeric lookup — so the math is identical regardless of order.
		// Insurance is computed unconditionally (legacy `procesarFormCasillero`
		// computes `seguroori` on every Casillero call, then discards it from
		// the total per §5.7 peculiarity #3).
		const [taxRates, weightTypeCode, insuranceAmount] = await Promise.all([
			// ─── Step 2: Resolve origin city VAT + complement ──────────────────
			// LEGACY: was `ivanac` + `complementonac` (funiva + funcomplemento).
			// IVA city is ALWAYS origin for Casillero — same as Nacional contado,
			// NOT like COD (§5.7 peculiarity #6). funiva + funcomplemento combined
			// into one read per Phase 4 Deviation 3.
			resolveCityTaxRates(
				{ cityId: cmd.originCityId, taxTypeCode: 1 },
				{ cityTaxRatesReader: this.cityTaxRatesReader },
			),
			// ─── Step 3: Resolve weight-type code ──────────────────────────────
			// LEGACY: was `codtipopes` from `_calculoTipoPeso`. Casillero passes
			// `codestaciondes = locker.office.codoficina` (Branch 1 of the legacy
			// helper — see catalog-reader.adapter.ts JSDoc).
			resolveWeightTypeCode(
				{
					recipientType: 'locker',
					originCityId: cmd.originCityId,
					destinationOfficeLegacyId: locker.officeLegacyId,
				},
				{ catalogReader: this.catalogReader },
			),
			// ─── Step 6: Insurance — computed but NOT summed into total ────────
			// LEGACY: was `seguroori`. Legacy `procesarFormCasillero` stores the
			// value but NEVER adds it to `subtotori` / `totalpag` (§5.7
			// peculiarity #3). May be a latent legacy bug — replicated verbatim.
			// DO NOT add `total += insuranceAmount` "to fix it" — that would
			// overcharge customers vs. the legacy counter.
			calculateInsurance(
				{ declaredValue, today },
				{ pricingRepo: this.pricingRuleRepository },
			),
		]);

		const { vatRate: nationalVat, surcharge: nationalComplement } = taxRates;

		// ─── Step 4: Transport-charge rule reference ───────────────────────
		// LEGACY: was `codtraslado` in procesarFormCasillero. The new design
		// folds the second `ciudad->selectById` read into the validation
		// facade (Deviation 4) — pricing never hits `city_master` directly.
		const transportChargeCode = locker.cityTransportChargeRuleId;

		// ─── Step 5: Branch on service code ────────────────────────────────
		const isWithFreight = WITH_FREIGHT_CODES.has(serviceCode);
		const isFlat = FLAT_CODES.has(serviceCode);

		let overweightKilos = 0;
		let overweightAmount = 0;
		let transportChargeAmount = 0;
		let originFreightTotal = 0;
		let originVatAmount = 0;
		let postalTaxAmount = 0;
		let branch: 'with_freight' | 'flat';

		const weightGrams = cmd.weight * 1000;

		if (isWithFreight) {
			branch = 'with_freight';

			// LEGACY: `_kiloSobrePes` (class.servicios.php:101) wraps the
			// inline SQL CASE that calls
			// `funpesomax_age($codservicio, $codtipopes, 0, 0, today, 0)`
			// and runs `ceil((peso - pesomax/1000) / 0.5)` on the result.
			// We split that into (a) the port call (`funpesomax_age` analog)
			// and (b) the pure primitive (the math). Both pieces stay 1:1
			// with legacy.
			//
			// `baseTypeCode = 0` is hardcoded because `procesarFormCasillero`
			// never overrides `_kiloSobrePes`'s default `$codtipobas = 0`.
			//
			// With production basiconac data, no Casillero codservicio has
			// a row → port returns null → primitive returns 0 chunks → no
			// overweight. Data-driven: insert a basiconac row for the
			// Casillero codservicio and overweight starts billing
			// automatically, matching legacy `funpesomax_age` behavior.
			// See spec_back.md Appendix A.
			//
			// ⚠ `overweightKilos` is a MISNOMER preserved from legacy
			// `kilossob` — value is a count of half-kilo chunks, not kg.
			// See JSDoc at top of `calculate-overweight-kilos.ts`.
			const ceilingWeightGrams =
				await this.pricingRuleRepository.findNationalBaseRateCeiling({
					shippingServiceLegacyId: serviceCode,
					baseTypeCode: 0,
					weightTypeCode,
					today,
				});
			overweightKilos = calculateOverweightKilos({
				weightKg: cmd.weight,
				maxWeightKg:
					ceilingWeightGrams === null ? null : ceilingWeightGrams / 1000,
			});

			// Overweight, transport, and postal-tax rule lookups are
			// independent — each hits a distinct rule table, no shared
			// state, no ordering effect on the math. Legacy runs them
			// sequentially in `procesarFormCasillero`; we parallelize for
			// latency without changing any output.
			const [rawOverweightAmount, transportFromRule, postalTax] =
				await Promise.all([
					// LEGACY: `_calculoSobrePeso` (routing2702enproduccion.php
					// L16617). Primitive returns RAW chunk × rate amount;
					// complement is applied here in the use case (Deviation 1).
					calculateNationalOverweightAmount(
						{
							overweightKilos,
							shippingServiceId: locker.shippingServiceId,
							weightTypeCode,
							// LEGACY: was `codtiposob`. Casillero & puerta-a-puerta
							// use 0; only RO/PP COD office-pickup uses non-zero.
							overweightTypeCode: 0,
							today,
						},
						{ pricingRepo: this.pricingRuleRepository },
					),
					// LEGACY: `_calculoTraslado` (routing2702enproduccion.php L16647).
					// NO complement on transport charge (Deviation 2 — legacy stopped
					// applying it in 2019-11-19). When the destination city has no
					// `transport_charge_rule_id`, skip the lookup entirely.
					transportChargeCode !== null
						? calculateTransportCharge(
								{ transportChargeRuleId: transportChargeCode, today },
								{ pricingRepo: this.pricingRuleRepository },
							)
						: Promise.resolve(0),
					// LEGACY: `_calculoTasaPostal($peso,$codservicio,$codtipopes)`
					// (procesarFormCasillero L11937) — even on the with-freight branch
					// the call signature OMITS `$montoflete`, so the percentage path
					// of the rule never fires for Casillero. We pass freightAmount=0
					// explicitly to preserve that behavior (§5.7 peculiarity #2).
					calculatePostalTax(
						{
							shippingServiceId: locker.shippingServiceId,
							weightTypeCode,
							weightGrams,
							today,
							freightAmount: 0,
						},
						{ pricingRepo: this.pricingRuleRepository },
					),
				]);

			overweightAmount = round2(
				rawOverweightAmount * (1 + nationalComplement / 100),
			);
			transportChargeAmount = transportFromRule;
			postalTaxAmount = postalTax;

			originFreightTotal = overweightAmount + transportChargeAmount;

			// LEGACY: `$form['ivaori'] = ($form['totalfleori']*$iva)/100`
			// (procesarFormCasillero L11934). VAT applies to with-freight
			// origin freight total only — not to insurance, not to postal tax.
			originVatAmount = round2((originFreightTotal * nationalVat) / 100);
		} else if (isFlat) {
			branch = 'flat';
			// Flat branch — MVP primary case codservicio=18.
			// LEGACY: originVatAmount is hardcoded to 0 on the flat branch
			// (§5.7 peculiarity #4) — no IVA on zero freight even though
			// `originFreightTotal * vat / 100` would also yield 0.
			originVatAmount = 0;

			// LEGACY: passes freightAmount = 0 to funfpo (procesarFormCasillero
			// L11937 calls `_calculoTasaPostal` without `$montoflete`, defaulting
			// to 0). The percentage branch of the rule therefore never fires
			// for Casillero; the fixed `tasapos` amount is used.
			postalTaxAmount = await calculatePostalTax(
				{
					shippingServiceId: locker.shippingServiceId,
					weightTypeCode,
					weightGrams,
					today,
					freightAmount: 0,
				},
				{ pricingRepo: this.pricingRuleRepository },
			);
		} else {
			// Unknown codservicio — outside both FLAT_CODES and
			// WITH_FREIGHT_CODES. Defensively treat as locker-invalid.
			throw new LockerInvalidException({
				failureCode: 'NOT_FOUND',
				reason: 'unknown_service_code',
				serviceCode,
			});
		}

		const total = originFreightTotal + originVatAmount + postalTaxAmount;
		const totalUsd = convertBsToUsd(total, bcvRate);

		return {
			serviceCode,
			branch,
			freight: round2(originFreightTotal),
			insurance: round2(insuranceAmount),
			subtotal: round2(originFreightTotal),
			vat: round2(originVatAmount),
			vatPercentage: round2(nationalVat),
			postalTax: round2(postalTaxAmount),
			total: round2(total),
			bcvRate,
			totalUsd,
			detail: {
				weightTypeCode,
				transportChargeCode,
				overweightKilos,
				overweightAmount: round2(overweightAmount),
				transportCharge: round2(transportChargeAmount),
				complementPercentage: round2(nationalComplement),
			},
		};
	}
}
