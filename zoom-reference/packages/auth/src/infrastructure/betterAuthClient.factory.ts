import { createAuthClient } from 'better-auth/client';
import { jwtClient } from 'better-auth/client/plugins';

export function createBetterAuthClient(baseURL: string) {
  return createAuthClient({ baseURL, plugins: [jwtClient()] });
}
