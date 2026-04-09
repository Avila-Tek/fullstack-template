'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import {
  oauthCallbackStatusEnum,
  useOAuthCallback,
} from '../../application/useCases/oauthCallback.useCase';
import { AuthCard } from '../components/AuthCard';
import { AuthHeader } from '../components/AuthHeader';
import { StatusDisplay } from '../components/StatusDisplay';

export function AuthCallbackHandler() {
  const t = useTranslations('auth');
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

  let headerTitle = t('callback.loadingTitle');
  let headerSubtitle = t('callback.loadingSubtitle');
  if (status === oauthCallbackStatusEnum.success) {
    headerTitle = t('callback.successTitle');
    headerSubtitle = t('callback.successSubtitle');
  } else if (status === oauthCallbackStatusEnum.error) {
    headerTitle = t('callback.errorTitle');
    headerSubtitle = t('callback.errorSubtitle');
  }

  const header = <AuthHeader title={headerTitle} subtitle={headerSubtitle} />;

  const statusMessages = {
    loading: t('callback.loadingStatus'),
    success: t('callback.successStatus'),
    error: error?.message ?? t('callback.errorStatus'),
  };

  const renderContent = () => (
    <StatusDisplay
      status={status}
      message={statusMessages[status]}
      action={
        status === oauthCallbackStatusEnum.error
          ? {
              label: t('callback.retryButton'),
              onClick: () => router.push('/login'),
            }
          : undefined
      }
    />
  );

  return <AuthCard header={header}>{renderContent()}</AuthCard>;
}
