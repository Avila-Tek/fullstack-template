import { getEnumObjectFromArray } from '@repo/utils';
import * as React from 'react';
import type {
  TEmailCallbackForm,
  TVerifyOtpForm,
} from '../../domain/auth.form';
import { useSendOtpMutation } from '../mutations/useSendOtp.mutation';
import { useVerifyEmailCallbackMutation } from '../mutations/useVerifyEmail.mutation';
import { useVerifyOtpMutation } from '../mutations/useVerifyOtp.mutation';
import { verifyEmailCallbackUseCase } from './verifyEmail.useCase';
import { verifyOtpUseCase } from './verifyOtp.useCase';

// Status enum definitions
export const verifyEmailFlowStatus = [
  'pending',
  'verifying',
  'success',
  'error',
] as const;
export type TVerifyEmailFlowStatus = (typeof verifyEmailFlowStatus)[number];
export const verifyEmailFlowStatusEnum = getEnumObjectFromArray(
  verifyEmailFlowStatus
);

export function useVerifyEmailFlow() {
  const [status, setStatus] = React.useState<TVerifyEmailFlowStatus>(
    verifyEmailFlowStatusEnum.pending
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const hasVerified = React.useRef(false);

  const verifyEmailCallbackMutation = useVerifyEmailCallbackMutation();
  const verifyOtpMutation = useVerifyOtpMutation();
  const sendOtpMutation = useSendOtpMutation();

  const verifyWithToken = React.useCallback(
    async (input: TEmailCallbackForm): Promise<void> => {
      if (hasVerified.current) {
        return;
      }
      hasVerified.current = true;
      setStatus(verifyEmailFlowStatusEnum.verifying);

      const result = await verifyEmailCallbackUseCase(input, {
        verifyEmailCallback: verifyEmailCallbackMutation.mutateAsync,
      });

      if (result.success) {
        setStatus(verifyEmailFlowStatusEnum.success);
      } else {
        setErrorMessage(
          verifyEmailCallbackMutation.error?.message ??
            'Este enlace puede haber expirado.'
        );
        setStatus(verifyEmailFlowStatusEnum.error);
      }
    },
    [verifyEmailCallbackMutation]
  );

  const verifyWithOtp = React.useCallback(
    async (input: TVerifyOtpForm): Promise<void> => {
      setStatus(verifyEmailFlowStatusEnum.verifying);

      const result = await verifyOtpUseCase(input, {
        verifyOtp: verifyOtpMutation.mutateAsync,
      });

      if (result.success) {
        setStatus(verifyEmailFlowStatusEnum.success);
      } else {
        setErrorMessage(
          verifyOtpMutation.error?.message ??
            'Este código puede haber expirado. No te preocupes, intenta de nuevo.'
        );
        setStatus(verifyEmailFlowStatusEnum.error);
      }
    },
    [verifyOtpMutation]
  );

  const resendOtp = React.useCallback(
    async (email: string): Promise<void> => {
      await sendOtpMutation.mutateAsync({ email });
    },
    [sendOtpMutation]
  );

  const resetFlow = React.useCallback(() => {
    hasVerified.current = false;
    setErrorMessage(null);
    setStatus(verifyEmailFlowStatusEnum.pending);
  }, []);

  return {
    status,
    errorMessage,
    verifyWithToken,
    verifyWithOtp,
    resendOtp,
    resetFlow,
    isVerifyingToken: verifyEmailCallbackMutation.isPending,
    isVerifyingOtp: verifyOtpMutation.isPending,
    isResendingOtp: sendOtpMutation.isPending,
    otpError: verifyOtpMutation.error,
  };
}
