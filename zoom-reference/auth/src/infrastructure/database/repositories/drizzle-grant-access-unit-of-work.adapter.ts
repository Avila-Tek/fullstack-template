import { Inject, Injectable } from '@nestjs/common';

import type { AccountRepositoryPort } from '../../../application/ports/out/account-repository.port';
import type {
	GrantAccessRepos,
	GrantAccessUnitOfWorkPort,
} from '../../../application/ports/out/grant-access-unit-of-work.port';
import type { SystemMembershipRepositoryPort } from '../../../application/ports/out/system-membership-repository.port';
import type {
	CreateProvisionedUserParams,
	UserRepositoryPort,
} from '../../../application/ports/out/user-repository.port';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/user.value-object';
import * as schema from '../db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../drizzle.module';

type AuthTx = Parameters<Parameters<AuthDb['transaction']>[0]>[0];

function rowToUser(row: typeof schema.user.$inferSelect): User {
	return User.reconstitute({
		id: row.id,
		email: Email.create(row.email),
		emailVerified: row.emailVerified,
	});
}

class TxUserRepository
	implements Pick<UserRepositoryPort, 'createProvisioned'>
{
	constructor(private readonly tx: AuthTx) {}

	async createProvisioned(params: CreateProvisionedUserParams): Promise<User> {
		const [row] = await this.tx
			.insert(schema.user)
			.values({
				id: crypto.randomUUID(),
				email: params.email,
				normalizedEmail: params.normalizedEmail,
				fullName: params.fullName,
				emailVerified: false,
				twoFactorEnabled: false,
				platformAdmin: false,
			})
			.returning();
		// biome-ignore lint/style/noNonNullAssertion: guaranteed by INSERT returning
		return rowToUser(row!);
	}
}

class TxAccountRepository
	implements Pick<AccountRepositoryPort, 'createCredential'>
{
	constructor(private readonly tx: AuthTx) {}

	async createCredential(params: {
		userId: string;
		passwordHash: string;
	}): Promise<void> {
		await this.tx.insert(schema.account).values({
			id: crypto.randomUUID(),
			accountId: params.userId,
			providerId: 'credential',
			userId: params.userId,
			password: params.passwordHash,
		});
	}
}

class TxMembershipRepository
	implements Pick<SystemMembershipRepositoryPort, 'insertMembership'>
{
	constructor(private readonly tx: AuthTx) {}

	async insertMembership(
		params: Parameters<SystemMembershipRepositoryPort['insertMembership']>[0],
	) {
		const [row] = await this.tx
			.insert(schema.systemMembership)
			.values({
				userId: params.userId,
				systemId: params.systemId,
				organizationId: params.organizationId,
				role: params.role,
				status: 'active',
				isDeleted: false,
			})
			.returning();
		// biome-ignore lint/style/noNonNullAssertion: guaranteed by INSERT returning
		const r = row!;
		return {
			id: r.id,
			systemId: r.systemId,
			organizationId: r.organizationId,
			userId: r.userId,
			role: r.role,
			status: r.status,
			isDeleted: r.isDeleted,
		};
	}
}

@Injectable()
export class DrizzleGrantAccessUnitOfWorkAdapter
	implements GrantAccessUnitOfWorkPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb) {}

	async run<T>(work: (repos: GrantAccessRepos) => Promise<T>): Promise<T> {
		return this.db.transaction(async (tx) => {
			return work({
				user: new TxUserRepository(tx),
				account: new TxAccountRepository(tx),
				membership: new TxMembershipRepository(tx),
			});
		});
	}
}
