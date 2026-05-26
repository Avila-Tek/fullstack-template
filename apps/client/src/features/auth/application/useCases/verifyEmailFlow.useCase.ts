'use client';

import { getEnumObjectFromArray } from '@repo/utils';
import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '../../infrastructure';

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
  const [status, setStatus] =
    React.useState<TVerifyEmailFlowStatus>(verifyEmailFlowStatusEnum.pending);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const hasVerified = React.useRef(false);

  const verifyMutation = useMutation({
    mutationKey: ['auth', 'verifyEmail'],
    mutationFn: (token: string) => AuthService.verifyEmail({ token }),
  });

  const resendMutation = useMutation({
    mutationKey: ['auth', 'sendVerificationEmail'],
    mutationFn: (email: string) => AuthService.sendVerificationEmail(email),
  });

  const verifyWithToken = React.useCallback(
    async (token: string): Promise<void> => {
      if (hasVerified.current) return;
      hasVerified.current = true;
      setStatus(verifyEmailFlowStatusEnum.verifying);

      try {
        await verifyMutation.mutateAsync(token);
        setStatus(verifyEmailFlowStatusEnum.success);
      } catch (e) {
        setErrorMessage(
          e instanceof Error ? e.message : 'Este enlace puede haber expirado.'
        );
        setStatus(verifyEmailFlowStatusEnum.error);
      }
    },
    [verifyMutation]
  );

  const resendVerificationEmail = React.useCallback(
    async (email: string): Promise<void> => {
      await resendMutation.mutateAsync(email);
    },
    [resendMutation]
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
    resendVerificationEmail,
    resetFlow,
    isVerifying: verifyMutation.isPending,
    isResending: resendMutation.isPending,
  };
}
