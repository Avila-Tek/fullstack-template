import type { TSignUpInput } from '@repo/schemas';
import { useMutation } from '@tanstack/react-query';
import type { SignUpResult } from '../../domain/auth.model';
import { AuthService } from '../../infrastructure';
import type { TSignUpForm } from '../../infrastructure/auth.form';

export function useSignUpMutation() {
  return useMutation<SignUpResult, Error, TSignUpForm>({
    mutationKey: ['auth', 'signUp'],
    // captcha + termsAccepted mapping is pending captcha integration
    mutationFn: (input) => AuthService.signUp(input as unknown as TSignUpInput),
  });
}
