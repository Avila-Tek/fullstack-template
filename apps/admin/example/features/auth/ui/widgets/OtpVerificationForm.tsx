'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@repo/ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { Loader2, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  createOtpDefaultValues,
  otpFormDefinition,
  type TOtpForm,
} from '../../domain/auth.form';
import { FormError } from '../components/FormError';
import { OtpInput } from '../components/OtpInput';

interface OtpVerificationFormProps {
  email: string;
  onSubmit: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  isVerifying: boolean;
  isResending: boolean;
  error: Error | null;
}

export function OtpVerificationForm({
  email,
  onSubmit,
  onResend,
  isVerifying,
  isResending,
  error,
}: OtpVerificationFormProps) {
  const form = useForm<TOtpForm>({
    resolver: zodResolver(otpFormDefinition),
    defaultValues: createOtpDefaultValues(),
  });

  async function handleSubmit(data: TOtpForm) {
    await onSubmit(data.otp);
  }

  async function handleResend() {
    await onResend();
  }

  return (
    <div className="flex flex-col items-center space-y-4 py-2 text-center">
      <div className="rounded-2xl bg-brand-primary p-5">
        <Mail className="h-8 w-8 txt-brand-primary-600" />
      </div>
      <div className="space-y-2">
        <h3 className="txt-primary-900 text-lg font-semibold">
          Ingresa el código de verificación
        </h3>
        <p className="text-sm txt-tertiary-600 leading-relaxed">
          Te enviamos un código de 6 dígitos a{' '}
          <span className="font-medium">{email}</span>
        </p>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="w-full space-y-4"
        >
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem className="flex flex-col items-center">
                <FormLabel className="sr-only">Código OTP</FormLabel>
                <FormControl>
                  <OtpInput field={field} disabled={isVerifying} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {error ? <FormError message={error.message} /> : null}
          <Button
            type="submit"
            className="w-full h-11 rounded-xl"
            disabled={isVerifying}
          >
            {isVerifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Verificar'
            )}
          </Button>
        </form>
      </Form>
      <Button
        type="button"
        variant="link"
        onClick={handleResend}
        disabled={isResending}
      >
        {isResending ? 'Reenviando...' : '¿No lo recibiste? Reenviar código'}
      </Button>
    </div>
  );
}
