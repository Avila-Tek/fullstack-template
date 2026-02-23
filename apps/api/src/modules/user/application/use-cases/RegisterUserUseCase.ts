import { ConflictException, Injectable } from '@nestjs/common';
import { User } from '../../domain/User';
import { Email } from '../../domain/value-objects/Email';
import { NewUser } from '../../domain/NewUser';
import { CreateUserDto, CreateUserPort } from '../ports/in/CreateUserPort';
import { UserRepository } from '../ports/out/UserRepository';

@Injectable()
export class CreateUserUseCase implements CreateUserPort {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: CreateUserDto): Promise<User> {
    const email = Email.create(dto.email);

    const existing = await this.userRepository.findByEmail(email.value);
    if (existing) throw new ConflictException('User already exists');

    const newUser = NewUser.create({
      email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      timezone: 'America/New_York',
      status: 'active',
      roleId: null,
    });
    return this.userRepository.create(newUser);
  }
}
