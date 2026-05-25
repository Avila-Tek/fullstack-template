import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type {
	CreateProvisionedUserParams,
	UserRepositoryPort,
} from '../../../application/ports/out/user-repository.port';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/user.value-object';
import * as schema from '../db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../drizzle.module';

function rowToUser(row: typeof schema.user.$inferSelect): User {
	return User.reconstitute({
		id: row.id,
		email: Email.create(row.email),
		emailVerified: row.emailVerified,
	});
}

@Injectable()
export class DrizzleUserRepository implements UserRepositoryPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb) {}

	async findById(id: string): Promise<User | null> {
		const [row] = await this.db
			.select()
			.from(schema.user)
			.where(eq(schema.user.id, id))
			.limit(1);
		return row ? rowToUser(row) : null;
	}

	async findByEmail(email: Email): Promise<User | null> {
		const [row] = await this.db
			.select()
			.from(schema.user)
			.where(eq(schema.user.normalizedEmail, email.value))
			.limit(1);
		return row ? rowToUser(row) : null;
	}

	async save(user: User): Promise<void> {
		await this.db
			.update(schema.user)
			.set({
				email: user.email.value,
				// normalizedEmail is always the same as the normalized email.value
				normalizedEmail: user.email.value,
			})
			.where(eq(schema.user.id, user.id));
	}

	async updateSessionInvalidBefore(
		userId: string,
		timestamp: Date,
	): Promise<void> {
		await this.db
			.update(schema.user)
			.set({ sessionInvalidBefore: timestamp })
			.where(eq(schema.user.id, userId));
	}

	async updateTwoFactorEnabled(
		userId: string,
		enabled: boolean,
	): Promise<void> {
		await this.db
			.update(schema.user)
			.set({ twoFactorEnabled: enabled })
			.where(eq(schema.user.id, userId));
	}

	async findByNormalizedEmail(normalizedEmail: string): Promise<User | null> {
		const [row] = await this.db
			.select()
			.from(schema.user)
			.where(eq(schema.user.normalizedEmail, normalizedEmail))
			.limit(1);
		return row ? rowToUser(row) : null;
	}

	async markEmailVerified(userId: string): Promise<void> {
		await this.db
			.update(schema.user)
			.set({ emailVerified: true })
			.where(eq(schema.user.id, userId));
	}

	async createProvisioned(params: CreateProvisionedUserParams): Promise<User> {
		const [row] = await this.db
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
