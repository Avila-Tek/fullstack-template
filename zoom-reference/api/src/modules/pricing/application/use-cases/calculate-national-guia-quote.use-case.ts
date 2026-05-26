import { Inject, Injectable } from '@nestjs/common';
import type { TNationalPricingResponse } from '@zoom/schemas';
import { CityNotEligibleException } from '../../domain/exceptions/city-not-eligible.exception';
import { DeclaredValueOutOfRangeException } from '../../domain/exceptions/declared-value-out-of-range.exception';
import { RouteNotFoundException } from '../../domain/exceptions/route-not-found.exception';
import { WeightExceedsLimitException } from '../../domain/exceptions/weight-exceeds-limit.exception';
import {
	CalculateNationalGuiaQuoteUseCasePort,
	type TCalculateNationalPricingInternalCommand,
} from '../ports/in/calculate-national-guia-quote.use-case.port';
import { CatalogReaderPort } from '../ports/out/catalog-reader.port';
import { CityTaxRatesReaderPort } from '../ports/out/city-tax-rates-reader.port';
import { PricingRuleRepositoryPort } from '../ports/out/pricing-rule-repository.port';
import { calculateInsurance } from '../primitives/calculate-insurance';
import { calculateNationalBaseFreight } from '../primitives/calculate-national-base-freight';
import { calculateNationalCommission } from '../primitives/calculate-national-commission';
import { calculateNationalOverweightAmount } from '../primitives/calculate-national-overweight-amount';
import { calculatePostalTax } from '../primitives/calculate-postal-tax';
import { calculateTransportCharge } from '../primitives/calculate-transport-charge';
import { convertBsToUsd } from '../primitives/convert-bs-to-usd';
import { convertUsdToBs } from '../primitives/convert-usd-to-bs';
import {
	resolveBaseTypeCode,
	resolveOverweightTypeCode,
} from '../primitives/nacional-rate-type-codes';
import { resolveCityTaxRates } from '../primitives/resolve-city-tax-rates';
import { resolveWeightTypeCode } from '../primitives/resolve-weight-type-code';
import { roundMonetary } from '../primitives/round-monetary';

// LEGACY: complement applied to a single component — used by the use case
// after primitives return raw amounts (Deviation 1 pattern).
const applyComplement = (value: number, complementRate: number): number =>
	roundMonetary(value + (value * complementRate) / 100);

@Injectable()
export class CalculateNationalGuiaQuoteUseCase
	implements CalculateNationalGuiaQuoteUseCasePort
{
	constructor(
		@Inject(PricingRuleRepositoryPort)
		private readonly pricingRepo: PricingRuleRepositoryPort,
		@Inject(CatalogReaderPort)
		private readonly catalogReader: CatalogReaderPort,
		@Inject(CityTaxRatesReaderPort)
		private readonly cityTaxRatesReader: CityTaxRatesReaderPort,
	) {}

	async execute(
		cmd: TCalculateNationalPricingInternalCommand,
	): Promise<TNationalPricingResponse> {
		const today = new Date();
		// LEGACY: `tipo_tarifa=1` (COD) ↔ paymentType='destination';
		//         `tipo_tarifa=2` (Nacional contado) ↔ paymentType='origin'.
		const isCod = cmd.paymentType === 'destination';

		// Convert wire input (USD) → Bs once, here at the boundary. The legacy
		// pricing math is denominated in Bs end-to-end.
		const { bcvRate } = cmd;
		const declaredValue = convertUsdToBs(cmd.declaredValueUsd, bcvRate);

		// ═════════════════════════════════════════════════════════════════
		// Phase 1 — Fetch destination city context + validate eligibility.
		// ═════════════════════════════════════════════════════════════════
		// LEGACY: was `ciudad_destinatario` context fetch in calculoTarifaNacional.
		const destCtx = await this.catalogReader.findCityContext({
			cityId: cmd.destinationCityId,
		});
		if (!destCtx) {
			throw new RouteNotFoundException({
				destinationCityId: cmd.destinationCityId,
			});
		}

		// LEGACY: `getValidarCiudadDestino` — noentregapap check rejects
		// home-delivery shipments to cities that don't deliver to addresses.
		if (cmd.destinationType === 'home' && destCtx.paperDeliveryDisabled) {
			throw new CityNotEligibleException(
				'PRICING_HOME_DELIVERY_NOT_AVAILABLE',
				{
					destinationCityId: cmd.destinationCityId,
				},
			);
		}

		// LEGACY: `ciudad.cod = 't'` check in calculoTarifaNacional — COD
		// requires the destination to support pago en destino.
		if (isCod && !destCtx.supportsCod) {
			throw new CityNotEligibleException('PRICING_COD_NOT_AVAILABLE', {
				destinationCityId: cmd.destinationCityId,
			});
		}

		// ═════════════════════════════════════════════════════════════════
		// Phase 2 — Weight ceiling validation.
		// ═════════════════════════════════════════════════════════════════
		// LEGACY: office pickup uses `ruta.pesomax` via oficina→ruta JOIN;
		// home delivery uses `ciudad.pesomax / 1000`.
		let maxWeightKg: number;
		if (cmd.destinationType === 'office') {
			// `destinationOfficeId` is guaranteed by the request-schema `refine`
			// guard, but we still narrow for the type-checker.
			const officeId = cmd.destinationOfficeId;
			if (!officeId) {
				throw new RouteNotFoundException({ reason: 'missing_office_id' });
			}
			const routeMax = await this.pricingRepo.findRouteMaxWeightKg({
				returnOfficeId: officeId,
			});
			maxWeightKg = routeMax ?? destCtx.maxWeightKg;
		} else {
			maxWeightKg = destCtx.maxWeightKg;
		}
		if (cmd.weightKg > maxWeightKg) {
			throw new WeightExceedsLimitException(maxWeightKg);
		}

		// ═════════════════════════════════════════════════════════════════
		// Phase 3 — Declared value validation against insurance bounds.
		// ═════════════════════════════════════════════════════════════════
		if (declaredValue > 0) {
			const bounds = await this.pricingRepo.findInsuranceBounds({ today });
			if (
				bounds &&
				(declaredValue < bounds.min || declaredValue > bounds.max)
			) {
				throw new DeclaredValueOutOfRangeException(bounds.min, bounds.max);
			}
		}

		// ═════════════════════════════════════════════════════════════════
		// Phase 4 — Resolve routing + tax (parallelized).
		// ═════════════════════════════════════════════════════════════════
		// LEGACY: IVA city selection — ALWAYS origin. Both legacy entry points
		// (the pre-2019 `tarifas_nacional.php` / `tarifas_cod.php` pages and the
		// modern `routing2702enproduccion.php` flow via
		// `class.ciudad::_calculaiva($codciudadori)`) pass the origin city to
		// `funiva` regardless of paymentType. Verified 2026-05-15 against the
		// docker_legacy diff harness; an earlier "destination-for-COD" rule
		// did not reflect any production legacy path.
		const ivaCityId = cmd.originCityId;

		const [taxRates, weightTypeCode, transitEstimate, shippingServiceId] =
			await Promise.all([
				// LEGACY: `funiva` + `funcomplemento` combined per S-002 Deviation 3.
				resolveCityTaxRates(
					{ cityId: ivaCityId, taxTypeCode: 1 },
					{ cityTaxRatesReader: this.cityTaxRatesReader },
				),
				// LEGACY: `_calculoTipoPeso` (`codtipopes` from `origendestino`).
				// Every Nacional shipment is a `guia` recipient (home OR office
				// pickup); the adapter's `guia` branch performs the operating-
				// office indirection (legacy
				// `$ciudad->getOne('codoficinaope', "codciudad=…")` →
				// `_codTipoPes($codciudadori, $oficina)`) — the use case doesn't
				// need to know the operating office id.
				resolveWeightTypeCode(
					{
						recipientType: 'guia',
						originCityId: cmd.originCityId,
						destinationCityId: cmd.destinationCityId,
					},
					{ catalogReader: this.catalogReader },
				),
				// AC-06: transit estimate is non-blocking — `null` when the O/D
				// pair has no `transit_matrix` row.
				this.catalogReader.findTransitEstimate({
					originCityId: cmd.originCityId,
					destinationCityId: cmd.destinationCityId,
				}),
				// Resolve the `shipping_service_master.id` (UUID) once. Primitives
				// that hit `national_overweight_rule` / `postal_tax_rule` need the
				// UUID; the new `calculateNationalBaseFreight` resolves it
				// internally from the domain enums.
				// LEGACY: `codservicio` — Nacional contado=2, COD=1.
				this.catalogReader.findShippingServiceIdByLegacyId(isCod ? 1 : 2),
			]);

		if (!shippingServiceId) {
			throw new RouteNotFoundException({
				reason: 'shipping_service_not_found',
			});
		}

		const { vatRate, surcharge: complementRate } = taxRates;

		// ═════════════════════════════════════════════════════════════════
		// Phase 5 — Fetch base data (parallelized) + compute overweight.
		// ═════════════════════════════════════════════════════════════════
		// LEGACY: was `tiposob` lookup — now a hardcoded constant (no table).
		const overweightTypeCode = resolveOverweightTypeCode(
			cmd.paymentType,
			cmd.destinationType,
		);

		// LEGACY: `funbasiconac_age` + `funtraslado_age` + `funseguros` parallelized.
		const [baseFreightResult, transportChargeAmount, insuranceRaw] =
			await Promise.all([
				calculateNationalBaseFreight(
					{
						weightKg: cmd.weightKg,
						weightTypeCode,
						paymentType: cmd.paymentType,
						destinationType: cmd.destinationType,
						today,
					},
					{ pricingRepo: this.pricingRepo },
				),
				destCtx.transportChargeRuleId
					? calculateTransportCharge(
							{
								transportChargeRuleId: destCtx.transportChargeRuleId,
								today,
							},
							{ pricingRepo: this.pricingRepo },
						)
					: Promise.resolve(0),
				// LEGACY: insurance — Nacional SUMS into subtotal/total (unlike
				// Casillero §5.7 peculiarity #3). Primitive short-circuits to 0
				// when declaredValue <= 0.
				calculateInsurance(
					{ declaredValue, today },
					{ pricingRepo: this.pricingRepo },
				),
			]);

		const { baseFreight: baseFreightRaw, overweightHalfKilos } =
			baseFreightResult;

		// LEGACY: `funsobrepesonac_age` — reusing the shared primitive. Takes
		// the resolved UUID since the port shape predates the domain-enum
		// refactor for the Nacional methods.
		const overweightRaw =
			overweightHalfKilos > 0
				? await calculateNationalOverweightAmount(
						{
							overweightKilos: overweightHalfKilos,
							shippingServiceId,
							weightTypeCode,
							overweightTypeCode,
							today,
						},
						{ pricingRepo: this.pricingRepo },
					)
				: 0;

		// ═════════════════════════════════════════════════════════════════
		// Phase 6 — COD commission (only for paymentType='destination').
		// ═════════════════════════════════════════════════════════════════
		// LEGACY: `merchandiseValue` maps to `declaredValue` for COD
		// (exploration GAP A resolution). Two branches inside the primitive:
		//   merchandiseValue > 0 → by-value (modalidad=2)
		//   merchandiseValue = 0 → by-weight (modalidad=1)
		let commissionRaw = 0;
		if (isCod) {
			const commissionResult = await calculateNationalCommission(
				{
					merchandiseValue: declaredValue,
					weightGrams: cmd.weightKg * 1000,
					subtotalBeforeCommission:
						baseFreightRaw +
						overweightRaw +
						transportChargeAmount +
						insuranceRaw,
					today,
				},
				{ pricingRepo: this.pricingRepo },
			);
			commissionRaw = commissionResult.commissionAmount;
		}

		// ═════════════════════════════════════════════════════════════════
		// Phase 7 — Apply complement + postal tax correction (§5.5).
		// ═════════════════════════════════════════════════════════════════
		// LEGACY: complement applied per component at the use-case level — the
		// Deviation 1 pattern (Casillero/Nacional disagreement resolved in
		// favor of the TarifaDAL counter algorithm).
		const baseFreight = applyComplement(baseFreightRaw, complementRate);
		const overweight = applyComplement(overweightRaw, complementRate);
		// LEGACY: complement is NOT applied to `transportCharge` — the legacy
		// line was commented out 2019-11-19 ("El complemento se va a calcular
		// del flete total"). Preserved verbatim.
		const transportCharge = transportChargeAmount;
		const insurance = applyComplement(insuranceRaw, complementRate);
		const commission = isCod
			? applyComplement(commissionRaw, complementRate)
			: 0;

		// LEGACY: complement-corrected postal tax path (§5.5 of
		// `national-pricing-calculation.md`). Three calls to
		// `calculatePostalTax` keep franqueo postal linear in the
		// pre-complement flete; bypassed entirely when complement is 0.
		const fleteRaw = baseFreightRaw + overweightRaw + transportChargeAmount;
		const extra = isCod ? commissionRaw : 0;
		const postalTax = await this.computePostalTax({
			fleteRaw,
			extra,
			insuranceRaw,
			complementRate,
			weightTypeCode,
			weightGrams: cmd.weightKg * 1000,
			shippingServiceId,
			today,
		});

		// ═════════════════════════════════════════════════════════════════
		// Phase 8 — Final totals (§5.6).
		// ═════════════════════════════════════════════════════════════════
		// LEGACY: Nacional contado: flete = basico + sobrepeso + traslado, commission=0
		//         COD:              flete = basico + sobrepeso + traslado + commission
		const freight = baseFreight + overweight + transportCharge + commission;
		// LEGACY: insurance SUMMED into subtotal for Nacional (Casillero excludes it).
		const subtotal = freight + insurance;
		const vat = roundMonetary((subtotal * vatRate) / 100);
		const total = roundMonetary(subtotal + vat + postalTax);
		const totalUsd = convertBsToUsd(total, bcvRate);

		return {
			baseFreight,
			overweight,
			transportCharge,
			freight,
			commission,
			insurance,
			subtotal,
			vat,
			vatPercentage: vatRate,
			postalTax,
			total,
			bcvRate,
			totalUsd,
			transitEstimate: transitEstimate
				? {
						merchandiseDays: transitEstimate.merchandiseDays,
						documentDays: transitEstimate.documentDays,
					}
				: null,
			detail: {
				overweightHalfKilos,
				weightTypeCode,
				// LEGACY: `codtipobas` / `codtiposob` are persisted as integer
				// columns on the rate tables. The rate lookup itself resolves
				// `codtipobas` inside the repository; we resolve it again here
				// only for the audit `detail` block exposed in the response.
				baseTypeCode: resolveBaseTypeCode(cmd.paymentType, cmd.destinationType),
				overweightTypeCode,
				complementPercentage: complementRate,
				transportChargeRuleId: destCtx.transportChargeRuleId,
			},
		};
	}

	private async computePostalTax(args: {
		fleteRaw: number;
		extra: number;
		insuranceRaw: number;
		complementRate: number;
		weightTypeCode: number;
		weightGrams: number;
		shippingServiceId: string;
		today: Date;
	}): Promise<number> {
		const {
			fleteRaw,
			extra,
			insuranceRaw,
			complementRate,
			weightTypeCode,
			weightGrams,
			shippingServiceId,
			today,
		} = args;

		if (complementRate <= 0) {
			return calculatePostalTax(
				{
					shippingServiceId,
					weightTypeCode,
					weightGrams,
					freightAmount: fleteRaw,
					today,
				},
				{ pricingRepo: this.pricingRepo },
			);
		}

		// LEGACY: §5.5 — three calls so percentage-based postal tax stays
		// linear in pre-complement flete. The complement-corrected freight
		// (`fleteCc`) and the bare freight (`fleteDd`) yield a delta
		// `fpCorrection`; we subtract that delta from the complement-adjusted
		// flete before the final tax call.
		const subtotalComplement = roundMonetary(
			((fleteRaw + extra + insuranceRaw) * complementRate) / 100,
		);
		const fleteCc = fleteRaw + subtotalComplement;
		const [fpCc, fpDd] = await Promise.all([
			calculatePostalTax(
				{
					shippingServiceId,
					weightTypeCode,
					weightGrams,
					freightAmount: fleteCc,
					today,
				},
				{ pricingRepo: this.pricingRepo },
			),
			calculatePostalTax(
				{
					shippingServiceId,
					weightTypeCode,
					weightGrams,
					freightAmount: fleteRaw,
					today,
				},
				{ pricingRepo: this.pricingRepo },
			),
		]);
		const fpCorrection = fpCc - fpDd;
		const correctedFlete = fleteRaw + subtotalComplement - fpCorrection;
		return calculatePostalTax(
			{
				shippingServiceId,
				weightTypeCode,
				weightGrams,
				freightAmount: correctedFlete,
				today,
			},
			{ pricingRepo: this.pricingRepo },
		);
	}
}
