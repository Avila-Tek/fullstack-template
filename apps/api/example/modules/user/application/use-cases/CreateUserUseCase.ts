import { ConflictException, Injectable } from '@nestjs/common';
import type { User } from '../../domain/User';
import { Email } from '../../domain/value-objects/Email';
import { UserStatus } from '../../domain/value-objects/UserStatus';
import { NewUser } from '../../domain/NewUser';
import type { CreateUserDto, CreateUserPort } from '../ports/in/CreateUserPort';
import type { UserRepository } from '../ports/out/UserRepository';

@Injectable()
export class CreateUserUseCase implements CreateUserPort {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: CreateUserDto): Promise<User> {
    const email = Email.create(dto.email);

    const existing = await this.userRepository.findByEmail(email.value);
    if (existing) throw new ConflictException('User already exists');

    const newUser = NewUser.create({
      email,
      passwordHash: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      status: UserStatus.active(),
    });
    return this.userRepository.create(newUser);
  }
}
