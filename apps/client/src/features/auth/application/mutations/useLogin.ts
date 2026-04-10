import type { TSignInInput } from '@repo/schemas';
import { useMutation } from '@tanstack/react-query';
import type { Session } from '../../domain/auth';
import { AuthService } from '../../infrastructure';

export function useSignInMutation() {
  return useMutation<Session, Error, TSignInInput>({
    mutationKey: ['auth', 'signIn'],
    mutationFn: (input) => AuthService.signIn(input),
  });
}
