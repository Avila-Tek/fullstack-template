import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { ForceRevokeRepos } from '../../../application/ports/out/force-revoke-unit-of-work.port';
import { ForceRevokeUnitOfWorkPort } from '../../../application/ports/out/force-revoke-unit-of-work.port';
import type { SessionRepositoryPort } from '../../../application/ports/out/session-repository.port';
import type {
	SystemAuditEventParams,
	SystemAuditLogPort,
} from '../../../application/ports/out/system-audit-log.port';
import type {
	TwoFactorRepositoryPort,
	UserTwoFactorDto,
} from '../../../application/ports/out/two-factor-repository.port';
import type { UserRepositoryPort } from '../../../application/ports/out/user-repository.port';
import * as schema from '../db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../drizzle.module';
import { userTwoFactor } from '../schema/user-two-factor.schema';

type AuthTx = Parameters<Parameters<AuthDb['transaction']>[0]>[0];

class TxSessionRepository
	implements Pick<SessionRepositoryPort, 'revokeAllForUser'>
{
	constructor(private readonly tx: AuthTx) {}

	async revokeAllForUser(userId: string): Promise<number> {
		const deleted = await this.tx
			.delete(schema.session)
			.where(eq(schema.session.userId, userId))
			.returning({ id: schema.session.id });
		return deleted.length;
	}
}

class TxUserRepository
	implements
		Pick<
			UserRepositoryPort,
			'updateSessionInvalidBefore' | 'updateTwoFactorEnabled'
		>
{
	constructor(private readonly tx: AuthTx) {}

	async updateSessionInvalidBefore(
		userId: string,
		timestamp: Date,
	): Promise<void> {
		await this.tx
			.update(schema.user)
			.set({ sessionInvalidBefore: timestamp })
			.where(eq(schema.user.id, userId));
	}

	async updateTwoFactorEnabled(
		userId: string,
		enabled: boolean,
	): Promise<void> {
		await this.tx
			.update(schema.user)
			.set({ twoFactorEnabled: enabled })
			.where(eq(schema.user.id, userId));
	}
}

class TxTwoFactorRepository
	implements
		Pick<TwoFactorRepositoryPort, 'findEnabledByUserId' | 'forceEnableEmail'>
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

	async forceEnableEmail(userId: string): Promise<void> {
		await this.tx
			.insert(userTwoFactor)
			.values({
				userId,
				method: 'email',
				enabled: true,
				verifiedAt: new Date(),
			})
			.onConflictDoNothing(); // ← relies on uq_user_two_factor_user_enabled;
	}
}

class TxAuditLogAdapter implements Pick<SystemAuditLogPort, 'log'> {
	constructor(private readonly tx: AuthTx) {}

	async log(params: SystemAuditEventParams): Promise<void> {
		await this.tx.insert(schema.securityAuditLog).values({
			id: crypto.randomUUID(),
			eventType: params.eventType,
			platformAdminUserId: params.platformAdminUserId ?? null,
			targetUserId: params.targetUserId ?? null,
			systemId: params.systemId ?? null,
			keyPrefix: params.keyPrefix ?? null,
			ipAddress: params.ipAddress ?? null,
			userAgent: params.userAgent ?? null,
			details: params.details ?? null,
		});
	}
}

@Injectable()
export class DrizzleForceRevokeUnitOfWorkAdapter
	implements ForceRevokeUnitOfWorkPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb) {}

	async run<T>(work: (repos: ForceRevokeRepos) => Promise<T>): Promise<T> {
		return this.db.transaction(async (tx) => {
			return work({
				session: new TxSessionRepository(tx),
				user: new TxUserRepository(tx),
				twoFactor: new TxTwoFactorRepository(tx),
				auditLog: new TxAuditLogAdapter(tx),
			});
		});
	}
}
