'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { routeBuilders } from '@/src/shared/routes/routes';
import { useResetPassword } from '../../application/useCases/resetPassword.useCase';
import {
  authPageTypeEnumObject,
  authSearchParamEnumObject,
  getRandomTagline,
} from '../../domain/auth.constants';
import {
  createResetPasswordDefaultValues,
  resetPasswordFormDefinition,
  type TResetPasswordForm,
} from '../../domain/auth.form';
import { AuthCard } from '../components/AuthCard';
import { AuthHeader } from '../components/AuthHeader';
import { ResetPasswordFormContent } from './ResetPasswordFormContent';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get(authSearchParamEnumObject.email) ?? '';
  const [tagline] = React.useState(() =>
    getRandomTagline(authPageTypeEnumObject.forgotPassword)
  );
  const [disabled, setDisabled] = React.useState(false);

  const resetPassword = useResetPassword();

  const methods = useForm<TResetPasswordForm>({
    defaultValues: createResetPasswordDefaultValues({ email }),
    resolver: zodResolver(resetPasswordFormDefinition),
  });

  async function onSubmit(data: TResetPasswordForm) {
    if (disabled) {
      return;
    }
    setDisabled(true);
    const result = await resetPassword.mutateAsync(data);
    if (result.success) {
      router.push(routeBuilders.login({ reset: 'success' }));
    }
    setDisabled(false);
  }

  const header = <AuthHeader title="Nueva contraseña" subtitle={tagline} />;

  const footer = (
    <Link
      href={routeBuilders.login()}
      className="flex items-center justify-center gap-2 text-sm txt-quaternary-500 hover:txt-brand-primary-600 transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Volver a iniciar sesión
    </Link>
  );

  if (!email) {
    return (
      <AuthCard header={header} footer={footer}>
        <div className="text-center py-4">
          <p className="text-sm txt-tertiary-600">
            No se proporcionó un correo electrónico. Por favor, inicia el
            proceso de recuperación nuevamente.
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
