import type { TResetPasswordInput } from '@repo/schemas';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '../../infrastructure';

export function useResetPasswordMutation() {
  return useMutation<void, Error, TResetPasswordInput>({
    mutationKey: ['auth', 'resetPassword'],
    mutationFn: (input) => AuthService.resetPassword(input),
  });
}
