import { useMutation } from '@tanstack/react-query';
import { AuthService } from '../../infrastructure';
import type { SignUpInput } from '../../domain/auth.model';

export type SignUpResult = { requiresEmailVerification: true };

export function useSignUpMutation() {
  return useMutation<SignUpResult, Error, SignUpInput>({
    mutationKey: ['auth', 'signUp'],
    mutationFn: (input) => AuthService.signUp(input),
  });
}
