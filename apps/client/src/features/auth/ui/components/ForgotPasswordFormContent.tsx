'use client';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import type { TForgotPasswordForm } from '../../infrastructure/auth.form';
import { FormError } from './FormError';
import { LoadingButton } from './LoadingButton';

interface ForgotPasswordFormContentProps {
  disabled: boolean;
  error?: Error | null;
}

export function ForgotPasswordFormContent({
  disabled,
  error,
}: Readonly<ForgotPasswordFormContentProps>) {
  const t = useTranslations('auth');
  const { control } = useFormContext<TForgotPasswordForm>();

  return (
    <div className="space-y-4">
      <p className="text-sm txt-tertiary-600 leading-relaxed">
        {t('forgotPassword.description')}
      </p>

      <FormField
        control={control}
        name="email"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="txt-secondary-700 text-sm font-medium">
              {t('forgotPassword.emailLabel')}
            </FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder={t('forgotPassword.emailPlaceholder')}
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
          loadingText={t('forgotPassword.submitLoading')}
        >
          {t('forgotPassword.submitButton')}
        </LoadingButton>
      </div>
    </div>
  );
}
