import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException } from '@nestjs/common';
import { CreateUserCommand } from '../../../shared/user/CreateUser';
import { UserRepository } from '../../application/ports/out/UserRepository';
import { Email } from '../../domain/value-objects/Email';
import { UserStatus } from '../../domain/value-objects/UserStatus';
import { NewUser } from '../../domain/NewUser';
import { GetUserByEmailPort } from '../../application/ports/in/GetUserByEmailPort';

@CommandHandler(CreateUserCommand)
export class CreateUserService implements ICommandHandler<CreateUserCommand> {
  constructor(
    private readonly getUserByEmail: GetUserByEmailPort,
    private readonly userRepository: UserRepository
  ) {}

  async execute(command: CreateUserCommand) {
    const email = Email.create(command.email);

    const existing = await this.getUserByEmail.execute(email.value);
    if (existing) {
      throw new ConflictException('User already exists');
    }

    const newUser = NewUser.create({
      email,
      passwordHash: command.password,
      firstName: command.firstName || null,
      lastName: command.lastName || null,
      status: UserStatus.active(),
    });

    const createdUser = await this.userRepository.create(newUser);

    return {
      id: createdUser.id.value,
      email: createdUser.email.value,
      firstName: createdUser.firstName ?? undefined,
      lastName: createdUser.lastName ?? undefined,
      timezone: createdUser.timezone ?? undefined,
      status: createdUser.status.getValue(),
    };
  }
}
