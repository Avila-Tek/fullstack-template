'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useUser } from '@/src/shared/hooks/useUser';
import { useSignIn } from '../../application/useCases/login.useCase';
import { getRandomTagline } from '../../domain/auth.constants';
import {
  buildLoginSchema,
  createLoginDefaultValues,
  type TLoginForm,
} from '../../infrastructure/auth.form';
import { AuthCard } from '../components/AuthCard';
import { AuthDivider } from '../components/AuthDivider';
import { AuthHeader } from '../components/AuthHeader';
import { GoogleLoginButton } from '../components/GoogleLoginButton';
import { LoginFormContent } from '../components/LoginFormContent';

export function LoginForm() {
  const t = useTranslations('auth');
  const [tagline] = React.useState(() =>
    getRandomTagline(t.raw('login.taglines') as readonly string[])
  );

  const signIn = useSignIn();
  const { setSession, refetchUser } = useUser();

  const schema = React.useMemo(() => buildLoginSchema(t), [t]);

  const methods = useForm<TLoginForm>({
    defaultValues: createLoginDefaultValues(),
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: TLoginForm) {
    if (signIn.isPending) {
      return;
    }
    const result = await signIn.mutateAsync(data);
    if (result.success && result.session) {
      setSession(result.session);
      await refetchUser();
    }
  }

  const header = <AuthHeader title={t('login.title')} subtitle={tagline} />;

  const footer = (
    <React.Fragment>
      <p className="text-center text-sm txt-quaternary-500">
        {t('login.noAccount')}{' '}
        <Link
          href="/signup"
          className="font-medium txt-brand-primary-600 hover:underline underline-offset-4"
        >
          {t('login.createAccount')}
        </Link>
      </p>
    </React.Fragment>
  );

  return (
    <AuthCard header={header} footer={footer}>
      <div className="space-y-4">
        <GoogleLoginButton />
        <AuthDivider text="o" />
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
            <LoginFormContent
              disabled={signIn.isPending}
              error={signIn.error}
            />
          </form>
        </FormProvider>
      </div>
    </AuthCard>
  );
}
