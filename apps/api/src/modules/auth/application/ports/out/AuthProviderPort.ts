import type { AuthResult } from '../../../domain/types/AuthResult';
import type { ProviderType } from '../../../domain/types/ProviderType';

export interface SignInData {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export abstract class AuthProviderPort {
  abstract getProviderType(): ProviderType;
  abstract signIn(data: SignInData): Promise<AuthResult>;
  abstract signUp(data: SignUpData): Promise<AuthResult>;
}
