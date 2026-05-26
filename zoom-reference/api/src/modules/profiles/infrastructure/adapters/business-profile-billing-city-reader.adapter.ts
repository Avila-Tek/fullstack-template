import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { BusinessProfileBillingCityReaderPort } from '../../../pricing/application/ports/out/business-profile-billing-city-reader.port';
import { address } from '../persistence/address.schema';
import { businessAccount } from '../persistence/business-account.schema';
import { businessProfile } from '../persistence/business-profile.schema';

/**
 * Resolves the authenticated user's origin city for pricing flows.
 *
 * LEGACY: `$_SESSION['codciudadori']` was set at login from the user's
 * profile (routing2702enproduccion.php L146) and consumed by
 * `procesarFormCasillero` L11899–L11907. The new design moves the resolution
 * out of session state into an explicit cross-module read.
 *
 * Resolution order:
 *   1. business_profile.billing_address → address.city_id  (preferred)
 *   2. business_account.billing_address → address.city_id  (fallback)
 *   3. null  (controller throws PRICING_ORIGIN_CITY_NOT_CONFIGURED)
 *
 * The two queries are kept independent so the fallback only fires when the
 * profile has no billing address; if the profile address row exists with a
 * null `city_id`, we still try the business_account address (covers partial
 * onboarding states).
 */
@Injectable()
export class BusinessProfileBillingCityReaderAdapter
	implements BusinessProfileBillingCityReaderPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async resolveBillingCityId(userId: string): Promise<string | null> {
		// 1. Preferred: profile's billing address.
		const profileRows = await this.db
			.select({ cityId: address.cityId })
			.from(businessProfile)
			.innerJoin(address, eq(address.id, businessProfile.billingAddressId))
			.where(eq(businessProfile.userId, userId))
			.limit(1);
		const profileCityId = profileRows[0]?.cityId;
		if (profileCityId) {
			return profileCityId;
		}

		// 2. Fallback: business_account's billing address. Resolved via the
		//    user's profile to find the right business_account.
		const accountRows = await this.db
			.select({ cityId: address.cityId })
			.from(businessProfile)
			.innerJoin(
				businessAccount,
				eq(businessAccount.id, businessProfile.businessAccountId),
			)
			.innerJoin(address, eq(address.id, businessAccount.billingAddressId))
			.where(eq(businessProfile.userId, userId))
			.limit(1);
		return accountRows[0]?.cityId ?? null;
	}
}
