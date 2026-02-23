import type { TEmailCallbackQuery } from '@repo/schemas';
import { useMutation } from '@tanstack/react-query';
import type { Session } from '../../domain/auth.model';
import { AuthService } from '../../infrastructure';

export function useVerifyEmailCallbackMutation() {
  return useMutation<Session, Error, TEmailCallbackQuery>({
    mutationKey: ['auth', 'verifyEmailCallback'],
    mutationFn: (input) => AuthService.verifyEmailCallback(input),
  });
}
