import { ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from '../../../application/ports/in/CreateUserPort';

export class RegisterUserRequest {
  @ApiProperty({
    description: 'Email address for the new account',
    example: 'user@example.com',
    format: 'email',
  })
  email: string;

  @ApiProperty({
    description: 'First name of the user',
    example: 'John',
    minLength: 1,
    maxLength: 100,
  })
  firstName: string;

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Doe',
    minLength: 1,
    maxLength: 100,
  })
  lastName: string;

  @ApiProperty({
    description: 'Password for the account',
    example: 'password123',
    minLength: 8,
    format: 'password',
  })
  password: string;

  static toDto(request: RegisterUserRequest): CreateUserDto {
    return {
      email: request.email,
      firstName: request.firstName,
      lastName: request.lastName,
      password: request.password,
    };
  }
}
