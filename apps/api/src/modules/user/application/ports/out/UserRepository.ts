import { NewUser } from '../../../domain/NewUser';
import { User } from '../../../domain/User';

export abstract class UserRepository {
  abstract create(user: NewUser): Promise<User>;
  abstract save(user: User): Promise<User>;
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findByEmailWithCredentials(email: string): Promise<User | null>;
}
