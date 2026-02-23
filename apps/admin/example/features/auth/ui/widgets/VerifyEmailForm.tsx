'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { routeBuilders } from '@/src/shared/routes/routes';
import {
  useVerifyEmailFlow,
  verifyEmailFlowStatusEnum,
} from '../../application/useCases/verifyEmailFlow.useCase';
import {
  authPageTypeEnumObject,
  authSearchParamEnumObject,
  getRandomTagline,
  supabaseOtpTypeEnumObject,
} from '../../domain/auth.constants';
import { AuthCard } from '../components/AuthCard';
import { AuthHeader } from '../components/AuthHeader';
import { CheckEmailStatus } from '../components/CheckEmailStatus';
import { VerifyErrorStatus } from '../components/VerifyErrorStatus';
import { VerifyingStatus } from '../components/VerifyingStatus';
import { VerifySuccessStatus } from '../components/VerifySuccessStatus';
import { OtpVerificationForm } from './OtpVerificationForm';

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get(authSearchParamEnumObject.token_hash);
  const type =
    searchParams.get(authSearchParamEnumObject.type) ??
    supabaseOtpTypeEnumObject.email;
  const email = searchParams.get(authSearchParamEnumObject.email);
  const [tagline] = React.useState(() =>
    getRandomTagline(authPageTypeEnumObject.verifyEmail)
  );

  const {
    status,
    errorMessage,
    verifyWithToken,
    verifyWithOtp,
    resendOtp,
    resetFlow,
    isVerifyingOtp,
    isResendingOtp,
    otpError,
  } = useVerifyEmailFlow();

  // Flujo Supabase: verificar automáticamente con token_hash
  React.useEffect(() => {
    if (tokenHash) {
      verifyWithToken({ tokenHash, type });
    }
  }, [tokenHash, type, verifyWithToken]);

  const isOtpFlow = !tokenHash && email;

  const header = (
    <AuthHeader
      title={
        status === verifyEmailFlowStatusEnum.success
          ? 'Correo verificado'
          : 'Verifica tu correo'
      }
      subtitle={
        status === verifyEmailFlowStatusEnum.success
          ? 'Bienvenido a HabitFlow'
          : tagline
      }
    />
  );

  const renderContent = () => {
    if (status === verifyEmailFlowStatusEnum.verifying) {
      return <VerifyingStatus />;
    }

    if (status === verifyEmailFlowStatusEnum.success) {
      return (
        <VerifySuccessStatus
          onAction={() => router.push(routeBuilders.dashboard())}
        />
      );
    }

    if (status === verifyEmailFlowStatusEnum.error) {
      return (
        <VerifyErrorStatus
          message={
            errorMessage ??
            'Este enlace o código puede haber expirado. No te preocupes, intenta de nuevo.'
          }
          onRetry={resetFlow}
          onBack={() => router.push(routeBuilders.login())}
        />
      );
    }

    if (isOtpFlow) {
      return (
        <OtpVerificationForm
          email={email}
          onSubmit={(otp) => verifyWithOtp({ email, otp })}
          onResend={() => resendOtp(email)}
          isVerifying={isVerifyingOtp}
          isResending={isResendingOtp}
          error={otpError}
        />
      );
    }

    return (
      <CheckEmailStatus onAction={() => router.push(routeBuilders.login())} />
    );
  };

  return <AuthCard header={header}>{renderContent()}</AuthCard>;
}
