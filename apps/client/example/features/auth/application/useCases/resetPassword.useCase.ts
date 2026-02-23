import type { TResetPasswordInput } from '@repo/schemas';
import type { TResetPasswordForm } from '../../domain/auth.form';
import { toResetPasswordInput } from '../../infrastructure/auth.transform';
import { useResetPasswordMutation } from '../mutations/useResetPassword.mutation';

type ResetPasswordResult = {
  success: boolean;
};

type Dependencies = {
  resetPassword: (data: TResetPasswordInput) => Promise<void>;
};

export async function resetPasswordUseCase(
  input: TResetPasswordForm,
  deps: Dependencies
): Promise<ResetPasswordResult> {
  try {
    await deps.resetPassword(toResetPasswordInput(input));
    return { success: true };
  } catch {
    return { success: false };
  }
}

export function useResetPassword() {
  const resetPasswordMutation = useResetPasswordMutation();

  return {
    mutateAsync: (input: TResetPasswordForm) =>
      resetPasswordUseCase(input, {
        resetPassword: resetPasswordMutation.mutateAsync,
      }),
    isPending: resetPasswordMutation.isPending,
    error: resetPasswordMutation.error,
  };
}
