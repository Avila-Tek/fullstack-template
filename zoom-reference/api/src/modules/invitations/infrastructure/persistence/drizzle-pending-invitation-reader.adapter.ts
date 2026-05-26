import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import type { PendingInvitationRecord } from '../../../profiles/application/ports/out/pending-invitation-reader.port';
import { businessAccount } from '../../../profiles/infrastructure/persistence/business-account.schema';
import { businessAccountInvite } from './business-account-invite.schema';

@Injectable()
export class DrizzlePendingInvitationReaderAdapter {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findPendingByProfileId(
		profileId: string,
	): Promise<PendingInvitationRecord | null> {
		const rows = await this.db
			.select({
				id: businessAccountInvite.id,
				businessAccountName: businessAccount.legalName,
				role: businessAccountInvite.role,
			})
			.from(businessAccountInvite)
			.innerJoin(
				businessAccount,
				eq(businessAccountInvite.businessAccountId, businessAccount.id),
			)
			.where(
				and(
					eq(businessAccountInvite.businessProfileId, profileId),
					eq(businessAccountInvite.status, 'pending'),
				),
			)
			.limit(1);

		if (rows.length === 0) return null;
		const row = rows[0];
		return {
			id: row.id,
			businessAccountName: row.businessAccountName ?? '',
			role: row.role as 'member',
		};
	}
}
