import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { UserRepository } from '../../application/ports/out/UserRepository';
import { NewUser } from '../../domain/NewUser';
import { User } from '../../domain/User';
import { Email } from '../../domain/value-objects/Email';
import { UserId } from '../../domain/value-objects/UserId';
import { users } from './user.schema';
import { UserStatus, type UserStatusEnum } from '../../domain/value-objects/UserStatus';

@Injectable()
export class UserRepositoryAdapter implements UserRepository {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async create(user: NewUser): Promise<User> {
		const [inserted] = await this.db
			.insert(users)
			.values({
				email: user.email.value,
				passwordHash: user.passwordHash,
				firstName: user.firstName,
				lastName: user.lastName,
				status: user.status.getValue(),
			})
			.returning();

		return User.restore({
			id: UserId.create(inserted.id),
			email: Email.create(inserted.email),
			passwordHash: inserted.passwordHash,
			firstName: inserted.firstName,
			lastName: inserted.lastName,
			status: UserStatus.restore(inserted.status as UserStatusEnum),
		});
	}

	async save(user: User): Promise<User> {
		if (user.passwordHash === null) {
			throw new Error('Cannot save user without a password hash');
		}

		const [inserted] = await this.db
			.insert(users)
			.values({
				id: user.id.value,
				email: user.email.value,
				passwordHash: user.passwordHash,
				firstName: user.firstName,
				lastName: user.lastName,
				status: user.status.getValue(),
			})
			.returning();

		return User.restore({
			id: UserId.create(inserted.id),
			email: Email.create(inserted.email),
			passwordHash: inserted.passwordHash,
			firstName: inserted.firstName,
			lastName: inserted.lastName,
			status: UserStatus.restore(inserted.status as UserStatusEnum),
		});
	}

	async findById(id: string): Promise<User | null> {
		const result = await this.db
			.select({
				id: users.id,
				email: users.email,
				firstName: users.firstName,
				lastName: users.lastName,
				status: users.status,
			})
			.from(users)
			.where(eq(users.id, id));

		const row = result[0];
		return row
			? User.restore({
					id: UserId.create(row.id),
					email: Email.create(row.email),
					passwordHash: null,
					firstName: row.firstName,
					lastName: row.lastName,
					status: UserStatus.restore(row.status as UserStatusEnum),
				})
			: null;
	}

	async findByEmail(email: string): Promise<User | null> {
		const result = await this.db
			.select({
				id: users.id,
				email: users.email,
				firstName: users.firstName,
				lastName: users.lastName,
				status: users.status,
			})
			.from(users)
			.where(eq(users.email, email));

		const row = result[0];
		return row
			? User.restore({
					id: UserId.create(row.id),
					email: Email.create(row.email),
					passwordHash: null,
					firstName: row.firstName,
					lastName: row.lastName,
					status: UserStatus.restore(row.status as UserStatusEnum),
				})
			: null;
	}

	async findByEmailWithCredentials(email: string): Promise<User | null> {
		const result = await this.db
			.select({
				id: users.id,
				email: users.email,
				passwordHash: users.passwordHash,
				firstName: users.firstName,
				lastName: users.lastName,
				status: users.status,
			})
			.from(users)
			.where(eq(users.email, email));

		const row = result[0];
		return row
			? User.restore({
					id: UserId.create(row.id),
					email: Email.create(row.email),
					passwordHash: row.passwordHash,
					firstName: row.firstName,
					lastName: row.lastName,
					status: UserStatus.restore(row.status as UserStatusEnum),
				})
			: null;
	}
}
