import { Command } from '@nestjs/cqrs';

export interface LoginCommand {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  userId: string;
  email: string;
}

export class SignInUseCasePort extends Command<LoginResult> {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {
    super();
  }
}
