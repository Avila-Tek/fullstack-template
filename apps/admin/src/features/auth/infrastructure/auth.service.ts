import type { Session } from '@repo/auth';
import type { TSignInInput } from '@repo/schemas';
import type { AuthApi } from './auth.interfaces';
import { toSessionDomain } from './auth.transform';

export class AuthServiceClass {
  constructor(private api: AuthApi) {}

  async signIn(input: TSignInInput): Promise<Session> {
    const result = await this.api.signIn(input);
    if (!result.success) {
      throw new Error(result.error);
    }
    return toSessionDomain(result.data);
  }

  async signOut(): Promise<void> {
    const result = await this.api.signOut();
    if (!result.success) {
      throw new Error(result.error);
    }
  }
}
