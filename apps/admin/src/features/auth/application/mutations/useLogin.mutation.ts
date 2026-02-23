import type { Session } from '@repo/auth';
import type { TSignInInput } from '@repo/schemas';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '../../infrastructure';

export function useSignInMutation() {
  return useMutation<Session, Error, TSignInInput>({
    mutationKey: ['auth', 'signIn'],
    mutationFn: (input) => AuthService.signIn(input),
  });
}
