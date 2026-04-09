'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useUser } from '@/src/shared/hooks/useUser';
import { useSignIn } from '../../application/useCases/login.useCase';
import { useSignUp } from '../../application/useCases/signUp.useCase';
import {
  authSearchParamEnumObject,
  getRandomTagline,
} from '../../domain/auth.constants';
import {
  buildSignUpSchema,
  createSignUpDefaultValues,
  type TSignUpForm,
} from '../../infrastructure/auth.form';
import { AuthCard } from '../components/AuthCard';
import { AuthDivider } from '../components/AuthDivider';
import { AuthHeader } from '../components/AuthHeader';
import { GoogleLoginButton } from '../components/GoogleLoginButton';
import { SignUpFormContent } from '../components/SignUpFormContent';

export function SignUpForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [tagline] = React.useState(() =>
    getRandomTagline(t.raw('signUp.taglines') as readonly string[])
  );

  const signUp = useSignUp();
  const signIn = useSignIn();
  const { refetchUser } = useUser();

  const schema = React.useMemo(() => buildSignUpSchema(t), [t]);

  const methods = useForm<TSignUpForm>({
    defaultValues: createSignUpDefaultValues(),
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: TSignUpForm) {
    if (signUp.isPending || signIn.isPending) {
      return;
    }

    const result = await signUp.mutateAsync(data);

    if (result.success) {
      if (result.result?.requiresEmailConfirmation) {
        const emailParam = encodeURIComponent(data.email);
        router.push(
          `/verify-email?${authSearchParamEnumObject.email}=${emailParam}`
        );
      } else if (result.result?.user) {
        const signInResult = await signIn.mutateAsync({
          email: data.email,
          password: data.password,
        });

        if (signInResult.success && signInResult.session) {
          await refetchUser();
          router.push('/dashboard');
        }
      }
    }
  }

  const header = <AuthHeader title={t('signUp.title')} subtitle={tagline} />;

  const footer = (
    <React.Fragment>
      <p className="text-center text-sm txt-quaternary-500">
        {t('signUp.hasAccount')}{' '}
        <Link
          href="/login"
          className="font-medium txt-brand-primary-600 hover:underline underline-offset-4"
        >
          {t('signUp.signIn')}
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
            <SignUpFormContent
              disabled={signUp.isPending}
              error={signUp.error}
            />
          </form>
        </FormProvider>
      </div>
    </AuthCard>
  );
}
