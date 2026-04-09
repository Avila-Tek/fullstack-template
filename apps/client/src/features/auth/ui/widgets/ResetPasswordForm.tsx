'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useResetPassword } from '../../application/useCases/resetPassword.useCase';
import {
  authSearchParamEnumObject,
  getRandomTagline,
} from '../../domain/auth.constants';
import {
  buildResetPasswordSchema,
  createResetPasswordDefaultValues,
  type TResetPasswordForm,
} from '../../infrastructure/auth.form';
import { AuthCard } from '../components/AuthCard';
import { AuthHeader } from '../components/AuthHeader';
import { ResetPasswordFormContent } from '../components/ResetPasswordFormContent';

export function ResetPasswordForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get(authSearchParamEnumObject.email) ?? '';
  const [tagline] = React.useState(() =>
    getRandomTagline(t.raw('forgotPassword.taglines') as readonly string[])
  );
  const [disabled, setDisabled] = React.useState(false);

  const resetPassword = useResetPassword();

  const schema = React.useMemo(() => buildResetPasswordSchema(t), [t]);

  const methods = useForm<TResetPasswordForm>({
    defaultValues: createResetPasswordDefaultValues({ email }),
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: TResetPasswordForm) {
    if (disabled) {
      return;
    }
    setDisabled(true);
    const result = await resetPassword.mutateAsync(data);
    if (result.success) {
      router.push(`/login?${authSearchParamEnumObject.reset}=success`);
    }
    setDisabled(false);
  }

  const header = (
    <AuthHeader title={t('resetPassword.title')} subtitle={tagline} />
  );

  const footer = (
    <Link
      href="/login"
      className="flex items-center justify-center gap-2 text-sm txt-quaternary-500 hover:txt-brand-primary-600 transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      {t('resetPassword.backToLogin')}
    </Link>
  );

  if (!email) {
    return (
      <AuthCard header={header} footer={footer}>
        <div className="text-center py-4">
          <p className="text-sm txt-tertiary-600">
            {t('resetPassword.noEmailError')}
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard header={header} footer={footer}>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
          <ResetPasswordFormContent
            disabled={disabled}
            error={resetPassword.error}
            email={email}
          />
        </form>
      </FormProvider>
    </AuthCard>
  );
}
