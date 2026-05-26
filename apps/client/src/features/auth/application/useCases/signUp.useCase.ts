import type { TSignUpForm } from '../../domain/auth.form';
import type { SignUpInput } from '../../domain/auth.model';
import { useSignUpMutation, type SignUpResult } from '../mutations/useSignUp.mutation';

type SignUpUseCaseResult =
  | { success: true; result: SignUpResult }
  | { success: false; message: string };

type Dependencies = {
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
};

export async function signUpUseCase(
  input: SignUpInput,
  deps: Dependencies
): Promise<SignUpUseCaseResult> {
  try {
    const result = await deps.signUp(input);
    return { success: true, result };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sign up failed';
    return { success: false, message };
  }
}

export function useSignUp() {
  const mutation = useSignUpMutation();

  return {
    /** Accepts the form shape and maps firstName + lastName → name for BA. */
    mutateAsync: (input: TSignUpForm) => {
      const signUpInput: SignUpInput = {
        email:    input.email,
        password: input.password,
        name:     [input.firstName, input.lastName].filter(Boolean).join(' ') || input.email,
      };
      return signUpUseCase(signUpInput, { signUp: mutation.mutateAsync });
    },
    isPending: mutation.isPending,
    error:     mutation.error,
  };
}
