import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '@/infrastructure/database/drizzle.module';
import type { UserRepositoryPort } from '../../../application/ports/out/user-repository.port';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/user.value-object';
import * as schema from '../db-schema';

@Injectable()
export class DrizzleUserRepository implements UserRepositoryPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findById(id: string): Promise<User | null> {
		const [row] = await this.db
			.select()
			.from(schema.user)
			.where(eq(schema.user.id, id))
			.limit(1);

		if (!row) return null;

		return User.reconstitute({
			id: row.id,
			email: Email.create(row.email),
			emailVerified: row.emailVerified,
		});
	}

	async findByEmail(email: Email): Promise<User | null> {
		const [row] = await this.db
			.select()
			.from(schema.user)
			.where(eq(schema.user.normalizedEmail, email.value))
			.limit(1);

		if (!row) return null;

		return User.reconstitute({
			id: row.id,
			email: Email.create(row.email),
			emailVerified: row.emailVerified,
		});
	}

	async save(user: User): Promise<void> {
		await this.db
			.update(schema.user)
			.set({
				email: user.email.value,
				normalizedEmail: user.email.value,
			})
			.where(eq(schema.user.id, user.id));
	}
}
