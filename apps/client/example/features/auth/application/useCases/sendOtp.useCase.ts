import type { TSendOtpInput } from '@repo/schemas';
import type { TSendOtpForm } from '../../domain/auth.form';
import { useSendOtpMutation } from '../mutations/useSendOtp.mutation';

type SendOtpResult = {
  success: boolean;
};

type Dependencies = {
  sendOtp: (data: TSendOtpInput) => Promise<void>;
};

export async function sendOtpUseCase(
  input: TSendOtpForm,
  deps: Dependencies
): Promise<SendOtpResult> {
  try {
    await deps.sendOtp(input);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export function useSendOtp() {
  const sendOtpMutation = useSendOtpMutation();

  return {
    mutateAsync: (input: TSendOtpForm) =>
      sendOtpUseCase(input, {
        sendOtp: sendOtpMutation.mutateAsync,
      }),
    isPending: sendOtpMutation.isPending,
    error: sendOtpMutation.error,
  };
}
