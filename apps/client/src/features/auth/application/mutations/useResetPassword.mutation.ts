import { useMutation } from '@tanstack/react-query';
import { AuthService } from '../../infrastructure';
import type { ResetPasswordInput } from '../../domain/auth.model';

export function useResetPasswordMutation() {
  return useMutation<void, Error, ResetPasswordInput>({
    mutationKey: ['auth', 'resetPassword'],
    mutationFn: (input) => AuthService.resetPassword(input),
  });
}
