import { User } from '../../../domain/User';

export abstract class GetUserByEmailPort {
	abstract execute(email: string): Promise<User | null>;
}
