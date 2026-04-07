import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ne } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '@/infrastructure/database/drizzle.module';
import type {
	AccountRepositoryPort,
	CredentialAccount,
} from '../../../application/ports/out/account-repository.port';
import * as schema from '../db-schema';

@Injectable()
export class DrizzleAccountRepository implements AccountRepositoryPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findCredentialAccount(
		userId: string,
	): Promise<CredentialAccount | null> {
		const [row] = await this.db
			.select({ id: schema.account.id, password: schema.account.password })
			.from(schema.account)
			.where(
				and(
					eq(schema.account.userId, userId),
					eq(schema.account.providerId, 'credential'),
				),
			)
			.limit(1);

		if (!row) return null;

		return { id: row.id, passwordHash: row.password };
	}

	async updatePassword(accountId: string, newHash: string): Promise<void> {
		await this.db
			.update(schema.account)
			.set({ password: newHash })
			.where(eq(schema.account.id, accountId));
	}

	async unlinkSocialAccountsExcept(
		userId: string,
		keptEmail: string,
	): Promise<void> {
		// Spec §10: remove social accounts whose providerEmail no longer matches.
		// Keeps the credential account and any social account already tied to keptEmail.
		await this.db
			.delete(schema.account)
			.where(
				and(
					eq(schema.account.userId, userId),
					ne(schema.account.providerId, 'credential'),
					ne(schema.account.providerEmail, keptEmail),
				),
			);
	}
}
