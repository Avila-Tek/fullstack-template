'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import {
  useVerifyEmailFlow,
  verifyEmailFlowStatusEnum,
} from '../../application/useCases/verifyEmailFlow.useCase';
import {
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
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get(authSearchParamEnumObject.token_hash);
  const type =
    searchParams.get(authSearchParamEnumObject.type) ??
    supabaseOtpTypeEnumObject.email;
  const email = searchParams.get(authSearchParamEnumObject.email);
  const [tagline] = React.useState(() =>
    getRandomTagline(t.raw('verifyEmail.taglines') as readonly string[])
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
          ? t('verifyEmail.titleSuccess')
          : t('verifyEmail.title')
      }
      subtitle={
        status === verifyEmailFlowStatusEnum.success
          ? t('verifyEmail.subtitleSuccess')
          : tagline
      }
    />
  );

  const renderContent = () => {
    if (status === verifyEmailFlowStatusEnum.verifying) {
      return <VerifyingStatus />;
    }

    if (status === verifyEmailFlowStatusEnum.success) {
      return <VerifySuccessStatus onAction={() => router.push('/dashboard')} />;
    }

    if (status === verifyEmailFlowStatusEnum.error) {
      return (
        <VerifyErrorStatus
          message={errorMessage ?? t('verifyEmail.expiredError')}
          onRetry={resetFlow}
          onBack={() => router.push('/login')}
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

    return <CheckEmailStatus onAction={() => router.push('/login')} />;
  };

  return <AuthCard header={header}>{renderContent()}</AuthCard>;
}
