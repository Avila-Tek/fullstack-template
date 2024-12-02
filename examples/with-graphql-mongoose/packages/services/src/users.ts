import { TCreateUserInput, TUser, userSchema } from '@repo/schemas';
import { Safe, safe, safeFetch } from '@repo/utils';
import { TRequestConfig } from './types';

async function createUser(
  input: TCreateUserInput,
  config: TRequestConfig
): Promise<Safe<TUser>> {
  const response = await safeFetch(new URL(`${config.baseUrl}/${config.url}`), {
    body: JSON.stringify(input),
    ...(config ?? {}),
  });
  if (response.success) {
    const parseResponse = safe(() => userSchema.parse(response.data));
    return parseResponse;
  }
  return response;
}

export const userService = Object.freeze({ createUser });
