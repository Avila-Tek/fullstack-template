import { Command } from '@nestjs/cqrs';
import { AuthUser } from '../../../domain/entities/AuthUser';

export interface GetUserByEmailCommand {
  email: string;
  password: string;
}

export class GetUserByEmailPort extends Command<AuthUser | null> {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {
    super();
  }
}
