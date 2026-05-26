'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import {
  useVerifyEmailFlow,
  verifyEmailFlowStatusEnum,
} from '../../application/useCases/verifyEmailFlow.useCase';
import {
  authPageTypeEnumObject,
  authSearchParamEnumObject,
  getRandomTagline,
} from '../../domain/auth.constants';
import { AuthCard } from '../components/AuthCard';
import { AuthHeader } from '../components/AuthHeader';
import { CheckEmailStatus } from '../components/CheckEmailStatus';
import { VerifyErrorStatus } from '../components/VerifyErrorStatus';
import { VerifyingStatus } from '../components/VerifyingStatus';
import { VerifySuccessStatus } from '../components/VerifySuccessStatus';

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // BA uses a single `token` query param for email verification
  const token = searchParams.get(authSearchParamEnumObject.token);
  const email = searchParams.get(authSearchParamEnumObject.email);
  const [tagline] = React.useState(() =>
    getRandomTagline(authPageTypeEnumObject.verifyEmail)
  );

  const {
    status,
    errorMessage,
    verifyWithToken,
    resendVerificationEmail,
    resetFlow,
    isVerifying,
    isResending,
  } = useVerifyEmailFlow();

  // Auto-verify when token is present in URL
  React.useEffect(() => {
    if (token) {
      void verifyWithToken(token);
    }
  }, [token, verifyWithToken]);

  const header = (
    <AuthHeader
      title={
        status === verifyEmailFlowStatusEnum.success
          ? 'Correo verificado'
          : 'Verifica tu correo'
      }
      subtitle={
        status === verifyEmailFlowStatusEnum.success
          ? 'Bienvenido'
          : tagline
      }
    />
  );

  const renderContent = () => {
    if (status === verifyEmailFlowStatusEnum.verifying || isVerifying) {
      return <VerifyingStatus />;
    }

    if (status === verifyEmailFlowStatusEnum.success) {
      return <VerifySuccessStatus onAction={() => router.push('/dashboard')} />;
    }

    if (status === verifyEmailFlowStatusEnum.error) {
      return (
        <VerifyErrorStatus
          message={
            errorMessage ??
            'Este enlace puede haber expirado. No te preocupes, intenta de nuevo.'
          }
          onRetry={resetFlow}
          onBack={() => router.push('/login')}
        />
      );
    }

    // No token in URL — show "check your email" state with optional resend
    return (
      <CheckEmailStatus
        actionLabel={email ? (isResending ? 'Enviando...' : 'Reenviar enlace') : 'Volver al inicio'}
        onAction={
          email
            ? () => void resendVerificationEmail(email)
            : () => router.push('/login')
        }
      />
    );
  };

  return <AuthCard header={header}>{renderContent()}</AuthCard>;
}
