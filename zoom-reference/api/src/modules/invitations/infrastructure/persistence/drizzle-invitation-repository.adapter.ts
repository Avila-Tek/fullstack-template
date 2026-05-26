import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { businessAccount } from '../../../profiles/infrastructure/persistence/business-account.schema';
import type {
	InvitationRepositoryPort,
	InviteRecord,
	InviteWithAccount,
	NewBusinessAccountInviteProps,
} from '../../application/ports/out/invitation-repository.port';
import { businessAccountInvite } from './business-account-invite.schema';

@Injectable()
export class DrizzleInvitationRepositoryAdapter
	implements InvitationRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async hasPendingInviteForEmail(
		businessAccountId: string,
		normalizedEmail: string,
	): Promise<boolean> {
		const rows = await this.db
			.select({ id: businessAccountInvite.id })
			.from(businessAccountInvite)
			.where(
				and(
					eq(businessAccountInvite.businessAccountId, businessAccountId),
					eq(businessAccountInvite.normalizedEmail, normalizedEmail),
					eq(businessAccountInvite.status, 'pending'),
				),
			)
			.limit(1);
		return rows.length > 0;
	}

	async create(data: NewBusinessAccountInviteProps): Promise<{ id: string }> {
		const [row] = await this.db
			.insert(businessAccountInvite)
			.values({
				businessAccountId: data.businessAccountId,
				businessProfileId: data.businessProfileId,
				email: data.email,
				normalizedEmail: data.normalizedEmail,
				role: data.role,
				status: data.status,
				tokenHash: data.tokenHash,
				createdByUserId: data.createdByUserId,
			})
			.returning({ id: businessAccountInvite.id });
		return { id: row.id };
	}

	async findByTokenHash(tokenHash: string): Promise<InviteWithAccount | null> {
		const rows = await this.db
			.select({
				id: businessAccountInvite.id,
				businessAccountId: businessAccountInvite.businessAccountId,
				businessProfileId: businessAccountInvite.businessProfileId,
				email: businessAccountInvite.email,
				normalizedEmail: businessAccountInvite.normalizedEmail,
				status: businessAccountInvite.status,
				businessAccountName: businessAccount.legalName,
			})
			.from(businessAccountInvite)
			.innerJoin(
				businessAccount,
				eq(businessAccountInvite.businessAccountId, businessAccount.id),
			)
			.where(eq(businessAccountInvite.tokenHash, tokenHash))
			.limit(1);

		if (rows.length === 0) return null;

		const row = rows[0];
		return {
			id: row.id,
			businessAccountId: row.businessAccountId,
			businessProfileId: row.businessProfileId,
			email: row.email,
			normalizedEmail: row.normalizedEmail,
			status: row.status,
			businessAccountName: row.businessAccountName ?? '',
		};
	}

	async findById(id: string): Promise<InviteRecord | null> {
		const rows = await this.db
			.select({
				id: businessAccountInvite.id,
				businessAccountId: businessAccountInvite.businessAccountId,
				businessProfileId: businessAccountInvite.businessProfileId,
				email: businessAccountInvite.email,
				normalizedEmail: businessAccountInvite.normalizedEmail,
				status: businessAccountInvite.status,
			})
			.from(businessAccountInvite)
			.where(eq(businessAccountInvite.id, id))
			.limit(1);

		if (rows.length === 0) return null;

		return rows[0];
	}

	async accept(id: string, userId: string, now: Date): Promise<void> {
		await this.db
			.update(businessAccountInvite)
			.set({
				status: 'accepted',
				acceptedByUserId: userId,
				acceptedAt: now,
			})
			.where(
				and(
					eq(businessAccountInvite.id, id),
					eq(businessAccountInvite.status, 'pending'),
				),
			);
	}

	async reject(id: string, userId: string, now: Date): Promise<void> {
		await this.db
			.update(businessAccountInvite)
			.set({
				status: 'rejected',
				rejectedByUserId: userId,
				rejectedAt: now,
			})
			.where(
				and(
					eq(businessAccountInvite.id, id),
					eq(businessAccountInvite.status, 'pending'),
				),
			);
	}

	async cancel(id: string, canceledByUserId: string, now: Date): Promise<void> {
		await this.db
			.update(businessAccountInvite)
			.set({
				status: 'canceled',
				canceledByUserId,
				canceledAt: now,
			})
			.where(
				and(
					eq(businessAccountInvite.id, id),
					eq(businessAccountInvite.status, 'pending'),
				),
			);
	}

	async resend(
		id: string,
		newTokenHash: string,
		_resentByUserId: string,
		_now: Date,
	): Promise<void> {
		await this.db
			.update(businessAccountInvite)
			.set({ tokenHash: newTokenHash })
			.where(
				and(
					eq(businessAccountInvite.id, id),
					eq(businessAccountInvite.status, 'pending'),
				),
			);
	}
}
