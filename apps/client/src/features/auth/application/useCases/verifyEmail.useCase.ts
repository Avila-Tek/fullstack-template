import type { TEmailCallbackQuery } from '@repo/schemas';
import type { Session } from '../../domain/auth.model';
import type { TEmailCallbackForm } from '../../infrastructure/auth.form';
import { toEmailCallbackQuery } from '../../infrastructure/auth.transform';
import { useVerifyEmailCallbackMutation } from '../mutations/useVerifyEmail.mutation';

type VerifyEmailCallbackResult = {
  success: boolean;
  session?: Session;
};

type Dependencies = {
  verifyEmailCallback: (data: TEmailCallbackQuery) => Promise<Session>;
};

export async function verifyEmailCallbackUseCase(
  input: TEmailCallbackForm,
  deps: Dependencies
): Promise<VerifyEmailCallbackResult> {
  try {
    const session = await deps.verifyEmailCallback(toEmailCallbackQuery(input));
    return { success: true, session };
  } catch {
    return { success: false };
  }
}

export function useVerifyEmailCallback() {
  const verifyEmailCallbackMutation = useVerifyEmailCallbackMutation();

  return {
    mutateAsync: (input: TEmailCallbackForm) =>
      verifyEmailCallbackUseCase(input, {
        verifyEmailCallback: verifyEmailCallbackMutation.mutateAsync,
      }),
    isPending: verifyEmailCallbackMutation.isPending,
    error: verifyEmailCallbackMutation.error,
  };
}
