import type { TForgotPasswordInput } from '@repo/schemas';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '../../infrastructure';

export function useForgotPasswordMutation() {
  return useMutation<void, Error, TForgotPasswordInput>({
    mutationKey: ['auth', 'forgotPassword'],
    mutationFn: (input) => AuthService.forgotPassword(input),
  });
}
