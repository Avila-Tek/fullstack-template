import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type {
	TwoFactorInsertParams,
	TwoFactorRepositoryPort,
	UserTwoFactorDto,
} from '../../../application/ports/out/two-factor-repository.port';
import { type AuthDb, DRIZZLE_CLIENT } from '../drizzle.module';
import { userTwoFactor } from '../schema/user-two-factor.schema';

@Injectable()
export class DrizzleTwoFactorRepository implements TwoFactorRepositoryPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb) {}

	async findEnabledByUserId(userId: string): Promise<UserTwoFactorDto | null> {
		const [row] = await this.db
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
		await this.db
			.insert(userTwoFactor)
			.values({
				userId,
				method: 'email',
				enabled: true,
				verifiedAt: new Date(),
			})
			.onConflictDoNothing(); // ← relies on uq_user_two_factor_user_enabled
	}

	async insert(userId: string, params: TwoFactorInsertParams): Promise<void> {
		const { method, verifiedAt } = params;
		await this.db
			.insert(userTwoFactor)
			.values({ userId, method, enabled: true, verifiedAt });
	}

	async deactivate(userId: string): Promise<void> {
		await this.db
			.update(userTwoFactor)
			.set({ enabled: false, updatedAt: new Date() })
			.where(
				and(eq(userTwoFactor.userId, userId), eq(userTwoFactor.enabled, true)),
			);
	}
}
