'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@repo/ui/components/button';
import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useForgotPassword } from '../../application/useCases/forgotPassword.useCase';
import {
  authPageTypeEnumObject,
  authSearchParamEnumObject,
  getRandomTagline,
} from '../../domain/auth.constants';
import {
  createForgotPasswordDefaultValues,
  forgotPasswordFormDefinition,
  type TForgotPasswordForm,
} from '../../infrastructure/auth.form';
import { AuthCard } from '../components/AuthCard';
import { AuthHeader } from '../components/AuthHeader';
import { ForgotPasswordFormContent } from '../components/ForgotPasswordFormContent';

export function ForgotPasswordForm() {
  const router = useRouter();
  const [tagline] = React.useState(() =>
    getRandomTagline(authPageTypeEnumObject.forgotPassword)
  );
  const [disabled, setDisabled] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);

  const forgotPassword = useForgotPassword();

  const methods = useForm<TForgotPasswordForm>({
    defaultValues: createForgotPasswordDefaultValues(),
    resolver: zodResolver(forgotPasswordFormDefinition),
  });

  async function onSubmit(data: TForgotPasswordForm) {
    if (disabled) {
      return;
    }
    setDisabled(true);
    const result = await forgotPassword.mutateAsync(data);
    if (result.success) {
      setEmailSent(true);
    }
    setDisabled(false);
  }

  function handleGoToResetPassword() {
    const email = methods.getValues('email');
    const emailParam = encodeURIComponent(email);
    router.push(
      `/reset-password?${authSearchParamEnumObject.email}=${emailParam}`
    );
  }

  const header = (
    <AuthHeader title="Restablecer contraseña" subtitle={tagline} />
  );

  const footer = (
    <Link
      href="/login"
      className="flex items-center justify-center gap-2 text-sm txt-quaternary-500 hover:txt-brand-primary-600 transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Volver a iniciar sesión
    </Link>
  );

  if (emailSent) {
    return (
      <AuthCard header={header} footer={footer}>
        <div className="flex flex-col items-center space-y-5 py-2 text-center">
          <div className="rounded-2xl bg-brand-primary p-5">
            <Mail className="h-8 w-8 txt-brand-primary-600" />
          </div>
          <div className="space-y-2">
            <h3 className="txt-primary-900 text-lg font-semibold">
              Revisa tu bandeja de entrada
            </h3>
            <p className="text-sm txt-tertiary-600 leading-relaxed">
              Enviamos un código de verificación a{' '}
              <span className="font-medium txt-primary-900">
                {methods.getValues('email')}
              </span>
            </p>
          </div>
          <Button
            className="w-full h-11 rounded-xl mt-2"
            onClick={handleGoToResetPassword}
          >
            Ingresar código
          </Button>
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl"
            onClick={() => {
              setEmailSent(false);
            }}
          >
            Intentar con otro correo
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard header={header} footer={footer}>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
          <ForgotPasswordFormContent
            disabled={disabled}
            error={forgotPassword.error}
          />
        </form>
      </FormProvider>
    </AuthCard>
  );
}
