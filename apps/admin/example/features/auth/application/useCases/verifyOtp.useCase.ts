import type { TVerifyOtpInput } from '@repo/schemas';
import type { TVerifyOtpForm } from '../../domain/auth.form';
import type { Session } from '../../domain/auth.model';
import { useVerifyOtpMutation } from '../mutations/useVerifyOtp.mutation';

type VerifyOtpResult = {
  success: boolean;
  session?: Session;
};

type Dependencies = {
  verifyOtp: (data: TVerifyOtpInput) => Promise<Session>;
};

export async function verifyOtpUseCase(
  input: TVerifyOtpForm,
  deps: Dependencies
): Promise<VerifyOtpResult> {
  try {
    const session = await deps.verifyOtp(input);
    return { success: true, session };
  } catch {
    return { success: false };
  }
}

export function useVerifyOtp() {
  const verifyOtpMutation = useVerifyOtpMutation();

  return {
    mutateAsync: (input: TVerifyOtpForm) =>
      verifyOtpUseCase(input, {
        verifyOtp: verifyOtpMutation.mutateAsync,
      }),
    isPending: verifyOtpMutation.isPending,
    error: verifyOtpMutation.error,
  };
}
