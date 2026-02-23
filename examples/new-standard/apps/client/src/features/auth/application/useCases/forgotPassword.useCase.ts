import type { TForgotPasswordInput } from '@repo/schemas';
import type { TForgotPasswordForm } from '../../infrastructure/auth.form';
import { useForgotPasswordMutation } from '../mutations/useForgotPassword.mutation';

type ForgotPasswordResult = {
  success: boolean;
};

type Dependencies = {
  forgotPassword: (data: TForgotPasswordInput) => Promise<void>;
};

export async function forgotPasswordUseCase(
  input: TForgotPasswordForm,
  deps: Dependencies
): Promise<ForgotPasswordResult> {
  try {
    await deps.forgotPassword(input);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export function useForgotPassword() {
  const forgotPasswordMutation = useForgotPasswordMutation();

  return {
    mutateAsync: (input: TForgotPasswordForm) =>
      forgotPasswordUseCase(input, {
        forgotPassword: forgotPasswordMutation.mutateAsync,
      }),
    isPending: forgotPasswordMutation.isPending,
    error: forgotPasswordMutation.error,
  };
}
