import type { TResetPasswordForm } from '../../domain/auth.form';
import type { ResetPasswordInput } from '../../domain/auth.model';
import { useResetPasswordMutation } from '../mutations/useResetPassword.mutation';

type ResetPasswordResult =
  | { success: true }
  | { success: false; message: string };

type Dependencies = {
  resetPassword: (data: ResetPasswordInput) => Promise<void>;
};

export async function resetPasswordUseCase(
  input: TResetPasswordForm & { token: string },
  deps: Dependencies
): Promise<ResetPasswordResult> {
  try {
    await deps.resetPassword({ newPassword: input.newPassword, token: input.token });
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Password reset failed';
    return { success: false, message };
  }
}

export function useResetPassword() {
  const mutation = useResetPasswordMutation();

  return {
    mutateAsync: (input: TResetPasswordForm & { token: string }) =>
      resetPasswordUseCase(input, {
        resetPassword: mutation.mutateAsync,
      }),
    isPending: mutation.isPending,
    error:     mutation.error,
  };
}
