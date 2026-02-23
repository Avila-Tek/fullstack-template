import type { TSignInInput } from '@repo/schemas';
import type { TLoginForm } from '../../domain/auth.form';
import type { Session } from '../../domain/auth.model';
import { useSignInMutation } from '../mutations/useLogin.mutation';

type SignInResult = {
  success: boolean;
  session?: Session;
};

type Dependencies = {
  signIn: (data: TSignInInput) => Promise<Session>;
};

export async function signInUseCase(
  input: TLoginForm,
  deps: Dependencies
): Promise<SignInResult> {
  try {
    const session = await deps.signIn(input);
    return { success: true, session };
  } catch {
    return { success: false };
  }
}

export function useSignIn() {
  const signInMutation = useSignInMutation();

  return {
    mutateAsync: (input: TLoginForm) =>
      signInUseCase(input, {
        signIn: signInMutation.mutateAsync,
      }),
    isPending: signInMutation.isPending,
    error: signInMutation.error,
  };
}
