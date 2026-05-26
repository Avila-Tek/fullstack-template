import { Inject, Injectable } from '@nestjs/common';
import type { TNationalQuoteLimitsResponse } from '@zoom/schemas';
import { RouteNotFoundException } from '../../domain/exceptions/route-not-found.exception';
import {
	GetNationalQuoteLimitsUseCasePort,
	type TGetNationalQuoteLimitsInternalQuery,
} from '../ports/in/get-national-quote-limits.use-case.port';
import { CatalogReaderPort } from '../ports/out/catalog-reader.port';
import { PricingRuleRepositoryPort } from '../ports/out/pricing-rule-repository.port';
import { convertBsToUsd } from '../primitives/convert-bs-to-usd';

/**
 * Returns the per-selection bounds the Nacional guía calculate use case
 * enforces before computing a quote:
 *   - `weightKg.max`     — route-level `ruta.pesomax` for office pickup,
 *                          falling back to `ciudad.pesomax`; just
 *                          `ciudad.pesomax` for home delivery.
 *   - `declaredValueUsd` — global, date-effective `insurance_rule` bounds
 *                          (computed internally in Bs and projected to USD
 *                          via `convertBsToUsd(bound, bcvRate)`), or `null`
 *                          when no rule is active today (matches the
 *                          calculate path, which skips the range check).
 *
 * No eligibility filtering (`paperDeliveryDisabled`, `supportsCod`) — those
 * remain calculate-time guards.
 */
@Injectable()
export class GetNationalQuoteLimitsUseCase
	implements GetNationalQuoteLimitsUseCasePort
{
	constructor(
		@Inject(PricingRuleRepositoryPort)
		private readonly pricingRepo: PricingRuleRepositoryPort,
		@Inject(CatalogReaderPort)
		private readonly catalogReader: CatalogReaderPort,
	) {}

	async execute(
		query: TGetNationalQuoteLimitsInternalQuery,
	): Promise<TNationalQuoteLimitsResponse> {
		const today = new Date();

		const [destCtx, routeMaxWeightKg, insuranceBounds] = await Promise.all([
			this.catalogReader.findCityContext({
				cityId: query.destinationCityId,
			}),
			query.destinationType === 'office' && query.destinationOfficeId
				? this.pricingRepo.findRouteMaxWeightKg({
						returnOfficeId: query.destinationOfficeId,
					})
				: Promise.resolve(null),
			this.pricingRepo.findInsuranceBounds({ today }),
		]);

		if (!destCtx) {
			throw new RouteNotFoundException({
				destinationCityId: query.destinationCityId,
			});
		}

		const maxWeightKg =
			query.destinationType === 'office'
				? (routeMaxWeightKg ?? destCtx.maxWeightKg)
				: destCtx.maxWeightKg;

		// Round-trip safety padding for the USD bounds.
		//
		// `convertBsToUsd` rounds to 2 decimals with `Math.round`. Without
		// padding, a raw Bs `min` whose exact USD value is e.g. 1.014 would
		// be displayed as 1.01 — but the calculate endpoint would then reject
		// 1.01 because 1.01 × bcvRate < raw min Bs. Same problem at the top:
		// a raw max of 100.015 USD would display as 100.02 and exceed the
		// server bound.
		//
		// We shift the Bs bound by a half-cent's worth of Bs *before*
		// converting, so the resulting USD value rounds in the safe
		// direction: UP for `min` (always ≥ raw min), DOWN for `max` (always
		// ≤ raw max). The UI can therefore display these bounds verbatim
		// without the calculate endpoint ever rejecting a value the user
		// could legitimately enter.
		//
		// 0.0049 (instead of exactly 0.005) keeps us strictly below the
		// tied-rounding midpoint, so we never depend on `Math.round`'s
		// behavior at .5 (which is IEEE-754-sensitive in JS).
		const epsilon = 0.0049 * query.bcvRate;

		return {
			weightKg: { max: maxWeightKg },
			declaredValueUsd: insuranceBounds
				? {
						min: convertBsToUsd(insuranceBounds.min + epsilon, query.bcvRate),
						max: convertBsToUsd(insuranceBounds.max - epsilon, query.bcvRate),
					}
				: null,
		};
	}
}
