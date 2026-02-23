import type { TSignUpInput } from '@repo/schemas';
import { useMutation } from '@tanstack/react-query';
import type { SignUpResult } from '../../domain/auth.model';
import { AuthService } from '../../infrastructure';

export function useSignUpMutation() {
  return useMutation<SignUpResult, Error, TSignUpInput>({
    mutationKey: ['auth', 'signUp'],
    mutationFn: (input) => AuthService.signUp(input),
  });
}
