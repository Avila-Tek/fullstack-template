import { Command } from '@nestjs/cqrs';

export interface LoginCommand {
  email: string;
  password: string;
}

export interface LoginUserData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string | null | undefined;
  updatedAt: string | null | undefined;
}

export interface LoginResult {
  user: LoginUserData;
  accessToken: string;
  refreshToken: string;
}

export class SignInUseCasePort extends Command<LoginResult> {
  constructor(
    public readonly email: string,
    public readonly password: string
  ) {
    super();
  }
}
