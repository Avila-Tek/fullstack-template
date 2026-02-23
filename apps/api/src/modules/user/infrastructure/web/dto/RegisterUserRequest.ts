import { createUserInput, type TCreateUserInput } from '@repo/schemas';
import { createZodDto } from '../../../../../shared/utils/createZodDto';
import { CreateUserDto } from '../../../application/ports/in/CreateUserPort';

export class RegisterUserRequest extends createZodDto(createUserInput) {
  static toDto(req: TCreateUserInput): CreateUserDto {
    return {
      email: req.email,
      password: req.password,
      firstName: req.firstName ?? '',
      lastName: req.lastName ?? '',
    };
  }
}
