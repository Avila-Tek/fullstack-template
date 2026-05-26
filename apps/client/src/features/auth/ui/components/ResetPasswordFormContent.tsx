'use client';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { useFormContext } from 'react-hook-form';
import type { TResetPasswordForm } from '../../domain/auth.form';
import { FormError } from './FormError';
import { LoadingButton } from './LoadingButton';
import { PasswordInput } from './PasswordInput';

interface ResetPasswordFormContentProps {
  disabled: boolean;
  error?: Error | null;
}

export function ResetPasswordFormContent({
  disabled,
  error,
}: ResetPasswordFormContentProps) {
  const { control } = useFormContext<TResetPasswordForm>();

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="newPassword"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="txt-secondary-700 text-sm font-medium">
              Nueva contraseña
            </FormLabel>
            <FormControl>
              <PasswordInput
                placeholder="Mínimo 8 caracteres"
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

      <FormField
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="txt-secondary-700 text-sm font-medium">
              Confirmar contraseña
            </FormLabel>
            <FormControl>
              <PasswordInput
                placeholder="Repite tu nueva contraseña"
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

      <div className="pt-2">
        <LoadingButton
          type="submit"
          loading={disabled}
          loadingText="Restableciendo..."
        >
          Restablecer contraseña
        </LoadingButton>
      </div>
    </div>
  );
}
