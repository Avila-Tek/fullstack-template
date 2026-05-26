'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
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
import { ResetPasswordFormContent } from '../components/ResetPasswordFormContent';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // BA sends the reset token as a query param in the email link
  const token = searchParams.get(authSearchParamEnumObject.token) ?? '';
  const [tagline] = React.useState(() =>
    getRandomTagline(authPageTypeEnumObject.forgotPassword)
  );
  const [disabled, setDisabled] = React.useState(false);

  const resetPassword = useResetPassword();

  const methods = useForm<TResetPasswordForm>({
    defaultValues: createResetPasswordDefaultValues(),
    resolver: zodResolver(resetPasswordFormDefinition),
  });

  async function onSubmit(data: TResetPasswordForm) {
    if (disabled) return;
    setDisabled(true);
    const result = await resetPassword.mutateAsync({ ...data, token });
    if (result.success) {
      router.push(`/login?${authSearchParamEnumObject.reset}=success`);
    }
    setDisabled(false);
  }

  const header = <AuthHeader title="Nueva contraseña" subtitle={tagline} />;

  const footer = (
    <Link
      href="/login"
      className="flex items-center justify-center gap-2 text-sm txt-quaternary-500 hover:txt-brand-primary-600 transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Volver a iniciar sesión
    </Link>
  );

  if (!token) {
    return (
      <AuthCard header={header} footer={footer}>
        <div className="text-center py-4">
          <p className="text-sm txt-tertiary-600">
            Enlace de restablecimiento inválido. Por favor, solicita uno nuevo.
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
          />
        </form>
      </FormProvider>
    </AuthCard>
  );
}
