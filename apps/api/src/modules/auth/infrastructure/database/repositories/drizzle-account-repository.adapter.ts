import { Inject, Injectable } from '@nestjs/common';
import { normalizeEmail } from '@zoom/utils';
import { and, eq, isNull, ne, or } from 'drizzle-orm';
import type {
	AccountRepositoryPort,
	CreateCredentialParams,
	CredentialAccount,
} from '../../../application/ports/out/account-repository.port';
import * as schema from '../db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../drizzle.module';

@Injectable()
export class DrizzleAccountRepository implements AccountRepositoryPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb) {}

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
		const normalizedKeptEmail = normalizeEmail(keptEmail);
		await this.db
			.delete(schema.account)
			.where(
				and(
					eq(schema.account.userId, userId),
					ne(schema.account.providerId, 'credential'),
					or(
						isNull(schema.account.normalizedProviderEmail),
						ne(schema.account.normalizedProviderEmail, normalizedKeptEmail),
					),
				),
			);
	}

	async createCredential(params: CreateCredentialParams): Promise<void> {
		await this.db.insert(schema.account).values({
			id: crypto.randomUUID(),
			accountId: params.userId,
			providerId: 'credential',
			userId: params.userId,
			password: params.passwordHash,
		});
	}

	async deleteCredential(userId: string): Promise<void> {
		await this.db
			.delete(schema.account)
			.where(
				and(
					eq(schema.account.userId, userId),
					eq(schema.account.providerId, 'credential'),
				),
			);
	}
}
