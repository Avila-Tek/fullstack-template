import { Command } from '@nestjs/cqrs';

export class CreateUserCommand extends Command<CreateUserResultDTO> {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly firstName?: string,
    public readonly lastName?: string
  ) {
    super();
  }
}

export interface CreateUserResultDTO {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  timezone?: string;
  status: string;
}
