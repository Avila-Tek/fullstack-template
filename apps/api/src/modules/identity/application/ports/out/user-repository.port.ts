import type { User } from '../../../domain/entities/user.entity';
import type { Email } from '../../../domain/value-objects/user.value-object';

export abstract class UserRepositoryPort {
	abstract findById(id: string): Promise<User | null>;
	abstract findByEmail(email: Email): Promise<User | null>;
	abstract save(user: User): Promise<void>;
}
