import type { TSignUpInput } from '@repo/schemas';
import type { TSignUpForm } from '../../domain/auth.form';
import type { SignUpResult } from '../../domain/auth.model';
import { useSignUpMutation } from '../mutations/useSignUp.mutation';

type SignUpUseCaseResult = {
  success: boolean;
  result?: SignUpResult;
};

type Dependencies = {
  signUp: (data: TSignUpInput) => Promise<SignUpResult>;
};

export async function signUpUseCase(
  input: TSignUpForm,
  deps: Dependencies
): Promise<SignUpUseCaseResult> {
  try {
    const result = await deps.signUp(input);
    return { success: true, result };
  } catch {
    return { success: false };
  }
}

export function useSignUp() {
  const signUpMutation = useSignUpMutation();

  return {
    mutateAsync: (input: TSignUpForm) =>
      signUpUseCase(input, {
        signUp: signUpMutation.mutateAsync,
      }),
    isPending: signUpMutation.isPending,
    error: signUpMutation.error,
  };
}
