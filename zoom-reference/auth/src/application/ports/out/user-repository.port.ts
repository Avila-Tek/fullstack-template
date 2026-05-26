import type { User } from '../../../domain/entities/user.entity';
import type { Email } from '../../../domain/value-objects/user.value-object';

export interface CreateProvisionedUserParams {
	email: string;
	normalizedEmail: string;
	fullName: string;
}

export abstract class UserRepositoryPort {
	abstract findById(id: string): Promise<User | null>;
	abstract findByEmail(email: Email): Promise<User | null>;
	abstract findByNormalizedEmail(normalizedEmail: string): Promise<User | null>;
	abstract save(user: User): Promise<void>;
	abstract updateSessionInvalidBefore(
		userId: string,
		timestamp: Date,
	): Promise<void>;
	abstract updateTwoFactorEnabled(
		userId: string,
		enabled: boolean,
	): Promise<void>;
	abstract createProvisioned(
		params: CreateProvisionedUserParams,
	): Promise<User>;
	abstract markEmailVerified(userId: string): Promise<void>;
}
