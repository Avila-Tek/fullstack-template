import type { Session } from '../../domain/auth.model';
import type { SignInInput } from '../../domain/auth.model';
import { useSignInMutation } from '../mutations/useLogin.mutation';

type SignInResult =
  | { success: true; session: Session }
  | { success: false; message: string };

type Dependencies = {
  signIn: (input: SignInInput) => Promise<Session>;
};

export async function signInUseCase(
  input: SignInInput,
  deps: Dependencies
): Promise<SignInResult> {
  try {
    const session = await deps.signIn(input);
    return { success: true, session };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sign in failed';
    return { success: false, message };
  }
}

export function useSignIn() {
  const mutation = useSignInMutation();

  return {
    mutateAsync: (input: SignInInput) =>
      signInUseCase(input, { signIn: mutation.mutateAsync }),
    isPending: mutation.isPending,
    error:     mutation.error,
  };
}
