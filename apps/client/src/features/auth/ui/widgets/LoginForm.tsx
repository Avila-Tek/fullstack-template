'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useUser } from '@/src/shared/hooks/useUser';
import { useSignIn } from '../../application/useCases/login.useCase';
import {
  authPageTypeEnumObject,
  getRandomTagline,
} from '../../domain/auth.constants';
import {
  createLoginDefaultValues,
  loginFormDefinition,
  type TLoginForm,
} from '../../domain/auth.form';
import { AuthCard } from '../components/AuthCard';
import { AuthDivider } from '../components/AuthDivider';
import { AuthHeader } from '../components/AuthHeader';
import { GoogleLoginButton } from '../components/GoogleLoginButton';
import { LoginFormContent } from '../components/LoginFormContent';

export function LoginForm() {
  const [tagline] = React.useState(() =>
    getRandomTagline(authPageTypeEnumObject.login)
  );

  const signIn = useSignIn();
  const { refetchUser } = useUser();

  const methods = useForm<TLoginForm>({
    defaultValues: createLoginDefaultValues(),
    resolver: zodResolver(loginFormDefinition),
  });

  async function onSubmit(data: TLoginForm) {
    if (signIn.isPending) return;
    const result = await signIn.mutateAsync(data);
    if (result.success) {
      // BA sets the session cookie server-side; invalidate client cache then redirect.
      await refetchUser();
    }
  }

  const header = <AuthHeader title="Bienvenido de vuelta" subtitle={tagline} />;

  const footer = (
    <React.Fragment>
      <p className="text-center text-sm txt-quaternary-500">
        ¿Eres nuevo?{' '}
        <Link
          href="/signup"
          className="font-medium txt-brand-primary-600 hover:underline underline-offset-4"
        >
          Crea una cuenta
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
