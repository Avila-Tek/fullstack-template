import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { TwoFactorActivateRepos } from '../../../application/ports/out/two-factor-activate-unit-of-work.port';
import { TwoFactorActivateUnitOfWorkPort } from '../../../application/ports/out/two-factor-activate-unit-of-work.port';
import type {
	InsertTwoFactorEventParams,
	TwoFactorAuditLogRepositoryPort,
} from '../../../application/ports/out/two-factor-audit-log-repository.port';
import type {
	TwoFactorInsertParams,
	TwoFactorRepositoryPort,
	UserTwoFactorDto,
} from '../../../application/ports/out/two-factor-repository.port';
import * as schema from '../db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../drizzle.module';
import { userTwoFactor } from '../schema/user-two-factor.schema';

type AuthTx = Parameters<Parameters<AuthDb['transaction']>[0]>[0];

class TxTwoFactorRepository
	implements
		Pick<
			TwoFactorRepositoryPort,
			'findEnabledByUserId' | 'insert' | 'deactivate'
		>
{
	constructor(private readonly tx: AuthTx) {}

	async findEnabledByUserId(userId: string): Promise<UserTwoFactorDto | null> {
		const [row] = await this.tx
			.select({
				id: userTwoFactor.id,
				userId: userTwoFactor.userId,
				method: userTwoFactor.method,
				enabled: userTwoFactor.enabled,
				verifiedAt: userTwoFactor.verifiedAt,
			})
			.from(userTwoFactor)
			.where(
				and(eq(userTwoFactor.userId, userId), eq(userTwoFactor.enabled, true)),
			)
			.limit(1);

		return row ?? null;
	}

	async insert(userId: string, params: TwoFactorInsertParams): Promise<void> {
		const { method, verifiedAt } = params;
		await this.tx
			.insert(userTwoFactor)
			.values({ userId, method, enabled: true, verifiedAt });
	}

	async deactivate(userId: string): Promise<void> {
		await this.tx
			.update(userTwoFactor)
			.set({ enabled: false, updatedAt: new Date() })
			.where(
				and(eq(userTwoFactor.userId, userId), eq(userTwoFactor.enabled, true)),
			);
	}
}

class TxTwoFactorAuditLogAdapter
	implements Pick<TwoFactorAuditLogRepositoryPort, 'insertEvent'>
{
	constructor(private readonly tx: AuthTx) {}

	async insertEvent(params: InsertTwoFactorEventParams): Promise<void> {
		await this.tx.insert(schema.twoFactorAuditLog).values({
			id: crypto.randomUUID(),
			userId: params.userId,
			eventType: params.eventType,
			correlationId: params.correlationId,
			ipHash: params.ipHash,
			userAgent: params.userAgent,
			method: params.method ?? null,
		});
	}
}

@Injectable()
export class DrizzleTwoFactorActivateUnitOfWorkAdapter extends TwoFactorActivateUnitOfWorkPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb) {
		super();
	}

	async run<T>(
		work: (repos: TwoFactorActivateRepos) => Promise<T>,
	): Promise<T> {
		return this.db.transaction(async (tx) => {
			return work({
				twoFactor: new TxTwoFactorRepository(tx),
				auditLog: new TxTwoFactorAuditLogAdapter(tx),
			});
		});
	}
}
