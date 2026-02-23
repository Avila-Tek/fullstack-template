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
import type { TSignUpForm } from '../../infrastructure/auth.form';
import { FormError } from './FormError';
import { LoadingButton } from './LoadingButton';
import { PasswordInput } from './PasswordInput';

interface SignUpFormContentProps {
  disabled: boolean;
  error?: Error | null;
}

export function SignUpFormContent({ disabled, error }: SignUpFormContentProps) {
  const { control } = useFormContext<TSignUpForm>();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="firstName"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="txt-secondary-700 text-sm font-medium">
                Nombre{' '}
                <span className="txt-quaternary-400 font-normal">
                  (opcional)
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="Tu nombre"
                  autoComplete="given-name"
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
          name="lastName"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="txt-secondary-700 text-sm font-medium">
                Apellido{' '}
                <span className="txt-quaternary-400 font-normal">
                  (opcional)
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="Tu apellido"
                  autoComplete="family-name"
                  className="h-11 rounded-xl"
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

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
            <FormLabel className="txt-secondary-700 text-sm font-medium">
              Contraseña
            </FormLabel>
            <FormControl>
              <PasswordInput
                placeholder="Crea una contraseña"
                autoComplete="new-password"
                showStrengthIndicator
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
        name="rePassword"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="txt-secondary-700 text-sm font-medium">
              Confirmar contraseña
            </FormLabel>
            <FormControl>
              <PasswordInput
                placeholder="Confirma tu contraseña"
                autoComplete="new-password"
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

      <div className="pt-2 space-y-4">
        <LoadingButton
          type="submit"
          loading={disabled}
          loadingText="Creando cuenta..."
          variant="cta"
        >
          Comenzar
        </LoadingButton>

        <p className="text-center text-xs txt-quaternary-400 leading-relaxed">
          Al continuar, aceptas nuestros{' '}
          <Link
            href="/terms"
            className="underline underline-offset-2 hover:txt-tertiary-600"
          >
            Términos
          </Link>{' '}
          y{' '}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:txt-tertiary-600"
          >
            Política de Privacidad
          </Link>
        </p>
      </div>
    </div>
  );
}
