'use client';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import { useFormContext } from 'react-hook-form';
import type { TForgotPasswordForm } from '../../domain/auth.form';
import { FormError } from '../components/FormError';
import { LoadingButton } from '../components/LoadingButton';

interface ForgotPasswordFormContentProps {
  disabled: boolean;
  error?: Error | null;
}

export function ForgotPasswordFormContent({
  disabled,
  error,
}: ForgotPasswordFormContentProps) {
  const { control } = useFormContext<TForgotPasswordForm>();

  return (
    <div className="space-y-4">
      <p className="text-sm txt-tertiary-600 leading-relaxed">
        ¡No te preocupes! Ingresa tu correo y te enviaremos un enlace para
        restablecer tu contraseña.
      </p>

      <FormField
        control={control}
        name="email"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="txt-secondary-700 text-sm font-medium">
              Correo electrónico
            </FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder="tu@ejemplo.com"
                autoComplete="email"
                className="h-11 rounded-xl"
                disabled={disabled}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormError message={error?.message} />

      <div className="pt-2">
        <LoadingButton
          type="submit"
          loading={disabled}
          loadingText="Enviando..."
        >
          Enviar enlace
        </LoadingButton>
      </div>
    </div>
  );
}
