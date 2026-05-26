import { Inject, Injectable } from '@nestjs/common';
import type { TShippingServiceKey } from '@zoom/schemas';
import { and, count, eq, inArray, notInArray, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { KEY_TO_TUPLE } from '../../../profiles/infrastructure/persistence/shipping-service-enums.schema';
import { businessProfileService } from '../../../role-templates/infrastructure/persistence/business-profile-service.schema';
import { businessProfileServiceRecipientWhitelist } from '../../../role-templates/infrastructure/persistence/business-profile-service-recipient-whitelist.schema';
import {
	BusinessProfileServiceRepositoryPort,
	type BusinessProfileServiceUpsertProps,
} from '../../application/ports/out/business-profile-service-repository.port';

@Injectable()
export class DrizzleBusinessProfileServiceRepositoryAdapter extends BusinessProfileServiceRepositoryPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {
		super();
	}

	async upsertAllForProfile(
		businessProfileId: string,
		data: BusinessProfileServiceUpsertProps[],
	): Promise<void> {
		// 1. Collect existing service row IDs so we can clear their whitelist entries.
		const existingRows = await this.db
			.select({ id: businessProfileService.id })
			.from(businessProfileService)
			.where(eq(businessProfileService.businessProfileId, businessProfileId));

		// 2. Clear all whitelist entries for this profile's services atomically.
		if (existingRows.length > 0) {
			await this.db.delete(businessProfileServiceRecipientWhitelist).where(
				inArray(
					businessProfileServiceRecipientWhitelist.businessProfileServiceId,
					existingRows.map((r) => r.id),
				),
			);
		}

		// 3. Upsert service rows — preserve row IDs for existing keys.
		const submittedKeys = data.map((d) => d.key);
		let upsertedRows: Array<{ id: string; key: TShippingServiceKey }> = [];

		if (data.length > 0) {
			upsertedRows = await this.db
				.insert(businessProfileService)
				.values(
					data.map((d) => {
						const tuple = KEY_TO_TUPLE[d.key];
						return {
							businessProfileId,
							key: d.key,
							shippingScope: tuple.shippingScope,
							recipientType: tuple.recipientType,
							paymentType: tuple.paymentType,
							shippingServiceId: null,
							enabled: d.enabled,
							whitelistEnabled: d.whitelistEnabled,
						};
					}),
				)
				.onConflictDoUpdate({
					target: [
						businessProfileService.businessProfileId,
						businessProfileService.key,
					],
					set: {
						shippingScope: sql`excluded.shipping_scope`,
						recipientType: sql`excluded.recipient_type`,
						paymentType: sql`excluded.payment_type`,
						shippingServiceId: sql`excluded.shipping_service_id`,
						enabled: sql`excluded.enabled`,
						whitelistEnabled: sql`excluded.whitelist_enabled`,
					},
				})
				.returning({
					id: businessProfileService.id,
					key: businessProfileService.key,
				});
		}

		// 4. Disable keys present in the DB but absent from the submitted payload.
		// Empty submission is treated as a no-op — callers that intend to disable all
		// services should not reach this path (guarded upstream by MemberAtLeastOneServiceRequiredException).
		if (submittedKeys.length > 0) {
			await this.db
				.update(businessProfileService)
				.set({ enabled: false, whitelistEnabled: false })
				.where(
					and(
						eq(businessProfileService.businessProfileId, businessProfileId),
						notInArray(businessProfileService.key, submittedKeys),
					),
				);
		}

		// 5. Insert fresh whitelist entries for services that have recipient IDs.
		const keyToId = new Map(upsertedRows.map((r) => [r.key, r.id]));
		const whitelistEntries = data.flatMap((svc) => {
			if (!svc.whitelistEnabled || svc.recipientIds.length === 0) return [];
			const serviceId = keyToId.get(svc.key);
			if (!serviceId) return [];
			return svc.recipientIds.map((recipientId) => ({
				businessProfileServiceId: serviceId,
				recipientId,
			}));
		});
		if (whitelistEntries.length > 0) {
			await this.db
				.insert(businessProfileServiceRecipientWhitelist)
				.values(whitelistEntries);
		}
	}

	async findAllForProfile(businessProfileId: string) {
		return this.db
			.select({
				id: businessProfileService.id,
				key: businessProfileService.key,
				shippingScope: businessProfileService.shippingScope,
				recipientType: businessProfileService.recipientType,
				paymentType: businessProfileService.paymentType,
				enabled: businessProfileService.enabled,
				whitelistEnabled: businessProfileService.whitelistEnabled,
				recipientCount: sql<number | null>`
					CASE WHEN ${businessProfileService.whitelistEnabled}
					THEN ${count(businessProfileServiceRecipientWhitelist.id)}::int
					ELSE NULL
					END
				`,
			})
			.from(businessProfileService)
			.leftJoin(
				businessProfileServiceRecipientWhitelist,
				eq(
					businessProfileServiceRecipientWhitelist.businessProfileServiceId,
					businessProfileService.id,
				),
			)
			.where(eq(businessProfileService.businessProfileId, businessProfileId))
			.groupBy(businessProfileService.id);
	}
}
