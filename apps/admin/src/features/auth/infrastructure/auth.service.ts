import { authClient } from '@repo/auth';
import type { Session } from '../domain/auth.model';
import type { SignInInput } from '../domain/auth.model';
import { toSessionDomain } from './auth.transform';

/**
 * AuthServiceClass wraps better-auth client calls for the admin app.
 * Error messages come pre-translated from the backend (Accept-Language i18n).
 * The session is maintained via HTTPOnly cookie — no tokens in JS.
 */
export class AuthServiceClass {
  async signIn(input: SignInInput): Promise<Session> {
    const result = await authClient.signIn.email({
      email:    input.email,
      password: input.password,
    });
    if (result.error || !result.data) {
      throw new Error(result.error?.message ?? 'Error al iniciar sesión.');
    }
    // BA sets session cookie on sign-in; fetch full session for domain mapping.
    const sessionResult = await authClient.getSession();
    if (!sessionResult.data?.session || !sessionResult.data?.user) {
      throw new Error('Session not found after sign in');
    }
    return toSessionDomain(sessionResult.data);
  }

  async signOut(): Promise<void> {
    const result = await authClient.signOut();
    if (result.error) {
      throw new Error(result.error.message ?? 'Error al cerrar sesión.');
    }
  }
}
