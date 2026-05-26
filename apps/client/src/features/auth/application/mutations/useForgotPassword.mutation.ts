import { useMutation } from '@tanstack/react-query';
import { AuthService } from '../../infrastructure';
import type { ForgetPasswordInput } from '../../domain/auth.model';

export function useForgotPasswordMutation() {
  return useMutation<void, Error, ForgetPasswordInput>({
    mutationKey: ['auth', 'forgotPassword'],
    mutationFn: (input) => AuthService.forgotPassword(input),
  });
}
