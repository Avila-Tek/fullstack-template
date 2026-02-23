'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useUser } from '@/src/shared/currentUser/ui/hooks/useUser';
import { routeBuilders } from '@/src/shared/routes/routes';
import { useSignIn } from '../../application/useCases/login.useCase';
import { useSignUp } from '../../application/useCases/signUp.useCase';
import {
  authPageTypeEnumObject,
  authSearchParamEnumObject,
  getRandomTagline,
} from '../../domain/auth.constants';
import {
  createSignUpDefaultValues,
  signUpFormDefinition,
  type TSignUpForm,
} from '../../domain/auth.form';
import { AuthCard } from '../components/AuthCard';
import { AuthDivider } from '../components/AuthDivider';
import { AuthHeader } from '../components/AuthHeader';
import { GoogleLoginButton } from '../components/GoogleLoginButton';
import { SignUpFormContent } from './SignUpFormContent';

export function SignUpForm() {
  const router = useRouter();
  const [tagline] = React.useState(() =>
    getRandomTagline(authPageTypeEnumObject.signUp)
  );

  const signUp = useSignUp();
  const signIn = useSignIn();
  const { refetchUser, hasActiveSubscription } = useUser();

  const methods = useForm<TSignUpForm>({
    defaultValues: createSignUpDefaultValues(),
    resolver: zodResolver(signUpFormDefinition),
  });

  async function onSubmit(data: TSignUpForm) {
    if (signUp.isPending || signIn.isPending) {
      return;
    }

    const result = await signUp.mutateAsync(data);

    if (result.success) {
      if (result.result?.requiresEmailConfirmation) {
        router.push(routeBuilders.verifyEmail({ email: data.email }));
      } else if (result.result?.user) {
        // Auto sign-in after successful signup
        const signInResult = await signIn.mutateAsync({
          email: data.email,
          password: data.password,
        });

        if (signInResult.success && signInResult.session) {
          // Refetch user data from UserContext (which includes subscription)
          await refetchUser();
          // Redirect based on subscription status
          const redirectUrl = hasActiveSubscription
            ? routeBuilders.dashboard()
            : routeBuilders.plans();
          router.push(redirectUrl);
        }
      }
    }
  }

  const header = <AuthHeader title="Crea una cuenta" subtitle={tagline} />;

  const footer = (
    <React.Fragment>
      <p className="text-center text-sm txt-quaternary-500">
        ¿Ya tienes una cuenta?{' '}
        <Link
          href={routeBuilders.login()}
          className="font-medium txt-brand-primary-600 hover:underline underline-offset-4"
        >
          Inicia sesión
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
