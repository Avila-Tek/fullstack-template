import type { TForgotPasswordForm } from '../../domain/auth.form';
import type { ForgetPasswordInput } from '../../domain/auth.model';
import { useForgotPasswordMutation } from '../mutations/useForgotPassword.mutation';

type ForgotPasswordResult =
  | { success: true }
  | { success: false; message: string };

type Dependencies = {
  forgotPassword: (data: ForgetPasswordInput) => Promise<void>;
};

export async function forgotPasswordUseCase(
  input: TForgotPasswordForm,
  deps: Dependencies
): Promise<ForgotPasswordResult> {
  try {
    await deps.forgotPassword({ email: input.email });
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to send reset email';
    return { success: false, message };
  }
}

export function useForgotPassword() {
  const mutation = useForgotPasswordMutation();

  return {
    mutateAsync: (input: TForgotPasswordForm) =>
      forgotPasswordUseCase(input, {
        forgotPassword: mutation.mutateAsync,
      }),
    isPending: mutation.isPending,
    error:     mutation.error,
  };
}
