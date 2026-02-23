import { User } from '../../../domain/User';

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export abstract class CreateUserPort {
  abstract execute(dto: CreateUserDto): Promise<User>;
}
