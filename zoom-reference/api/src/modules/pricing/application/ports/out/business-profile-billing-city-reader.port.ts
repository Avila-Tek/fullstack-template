/**
 * BusinessProfileBillingCityReaderPort — pricing's cross-module facade for
 * resolving the authenticated user's origin city (used as the VAT / complement
 * city under §5.7).
 *
 * Per `apps/api/CLAUDE.md` rule 2, the abstract class is defined HERE
 * (pricing is the consumer) and implemented by `profiles`. The adapter walks
 * `findProfileDetailByUserId(userId)` → `billing_address.city_id` with
 * fallback to `business_account.billing_address.city_id`; returns null if
 * neither is configured.
 *
 * The pricing controller throws `PRICING_ORIGIN_CITY_NOT_CONFIGURED` inline
 * when this returns null — no separate resolver service wraps the two-line
 * check.
 */
export abstract class BusinessProfileBillingCityReaderPort {
	abstract resolveBillingCityId(userId: string): Promise<string | null>;
}
