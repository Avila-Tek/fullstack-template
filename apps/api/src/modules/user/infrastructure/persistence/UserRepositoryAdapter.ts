import { Injectable } from '@nestjs/common';
import type { UserRepository } from '../../application/ports/out/UserRepository';
import { User } from '../../domain/User';
import { Email } from '../../domain/value-objects/Email';
import { UserId } from '../../domain/value-objects/UserId';
import type { NewUser } from '../../domain/NewUser';

@Injectable()
export class UserRepositoryAdapter implements UserRepository {
	async create(user: NewUser): Promise<User> {
		return new Promise((resolve) =>
			resolve(
				User.restore({
					id: UserId.create(crypto.randomUUID()),
					email: Email.create(user.email.value),
					password: user.password,
					firstName: user.firstName,
					lastName: user.lastName,
					timezone: user.timezone,
					status: user.status,
					roleId: null,
				}),
			),
		);
	}

	async save(user: User): Promise<User> {
		return new Promise((resolve) =>
			resolve(
				User.restore({
					id: UserId.create(user.id.value),
					email: Email.create(user.email.value),
					password: user.password,
					firstName: user.firstName,
					lastName: user.lastName,
					timezone: user.timezone,
					status: user.status,
					roleId: null,
				}),
			),
		);
	}

	async findById(id: string): Promise<User | null> {
		return new Promise((resolve) =>
			resolve(
				User.restore({
					id: UserId.create(id),
					email: Email.create('mocked@example.com'),
					password: 'mockedPassword',
					firstName: 'MockedFirstName',
					lastName: 'MockedLastName',
					timezone: 'America/New_York',
					status: 'active',
					roleId: null,
				}),
			),
		);
	}

	async findByEmail(email: string): Promise<User | null> {
		return new Promise((resolve) =>
			resolve(
				User.restore({
					id: UserId.create('mocked-id'),
					email: Email.create(email),
					password: 'mockedPassword',
					firstName: 'MockedFirstName',
					lastName: 'MockedLastName',
					timezone: 'America/New_York',
					status: 'active',
					roleId: null,
				}),
			),
		);
	}

	async findByEmailWithCredentials(email: string): Promise<User | null> {
		return new Promise((resolve) =>
			resolve(
				User.restore({
					id: UserId.create('mocked-id'),
					email: Email.create(email),
					password: 'mockedPassword',
					firstName: 'MockedFirstName',
					lastName: 'MockedLastName',
					timezone: 'America/New_York',
					status: 'active',
					roleId: null,
				}),
			),
		);
	}
}
