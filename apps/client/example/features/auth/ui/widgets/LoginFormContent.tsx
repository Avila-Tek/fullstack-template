'use client';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import Link from 'next/link';
import { useFormContext } from 'react-hook-form';
import { routeBuilders } from '@/src/shared/routes/routes';
import type { TLoginForm } from '../../domain/auth.form';
import { FormError } from '../components/FormError';
import { LoadingButton } from '../components/LoadingButton';
import { PasswordInput } from '../components/PasswordInput';

interface LoginFormContentProps {
  disabled: boolean;
  error?: Error | null;
}

export function LoginFormContent({ disabled, error }: LoginFormContentProps) {
  const { control } = useFormContext<TLoginForm>();

  return (
    <div className="space-y-4">
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

      <FormField
        control={control}
        name="password"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <div className="flex items-center justify-between">
              <FormLabel className="txt-secondary-700 text-sm font-medium">
                Contraseña
              </FormLabel>
              <Link
                href={routeBuilders.forgotPassword()}
                className="text-xs txt-quaternary-500 hover:txt-brand-primary-600 transition-colors"
              >
                ¿Olvidaste?
              </Link>
            </div>
            <FormControl>
              <PasswordInput
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
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
          loadingText="Iniciando sesión..."
          variant={'cta'}
        >
          Continuar
        </LoadingButton>
      </div>
    </div>
  );
}
