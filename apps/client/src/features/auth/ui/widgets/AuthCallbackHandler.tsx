'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import {
  oauthCallbackStatusEnum,
  useOAuthCallback,
} from '../../application/useCases/oauthCallback.useCase';
import { AuthCard } from '../components/AuthCard';
import { AuthHeader } from '../components/AuthHeader';
import { StatusDisplay } from '../components/StatusDisplay';

export function AuthCallbackHandler() {
  const router = useRouter();
  const { processCallback, status, error } = useOAuthCallback();

  React.useEffect(() => {
    async function handleCallback() {
      const result = await processCallback();

      if (result.success) {
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }
    }

    handleCallback();
  }, [processCallback, router]);

  const header = (
    <AuthHeader
      title={
        status === oauthCallbackStatusEnum.success
          ? 'Autenticación exitosa'
          : status === oauthCallbackStatusEnum.error
            ? 'Error de autenticación'
            : 'Autenticando...'
      }
      subtitle={
        status === oauthCallbackStatusEnum.success
          ? 'Bienvenido a HabitFlow'
          : status === oauthCallbackStatusEnum.error
            ? 'Algo salió mal'
            : 'Por favor espera'
      }
    />
  );

  const statusMessages = {
    loading: 'Completando autenticación con Google...',
    success: 'Tu cuenta ha sido verificada. Redirigiendo al dashboard...',
    error:
      error?.message ?? 'No se pudo completar la autenticación con Google.',
  };

  const renderContent = () => (
    <StatusDisplay
      status={status}
      message={statusMessages[status]}
      action={
        status === oauthCallbackStatusEnum.error
          ? { label: 'Intentar de nuevo', onClick: () => router.push('/login') }
          : undefined
      }
    />
  );

  return <AuthCard header={header}>{renderContent()}</AuthCard>;
}
