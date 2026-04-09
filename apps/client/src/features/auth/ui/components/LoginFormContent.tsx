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
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import type { TLoginForm } from '../../infrastructure/auth.form';
import { FormError } from './FormError';
import { LoadingButton } from './LoadingButton';
import { PasswordInput } from './PasswordInput';

interface LoginFormContentProps {
  disabled: boolean;
  error?: Error | null;
}

export function LoginFormContent({
  disabled,
  error,
}: Readonly<LoginFormContentProps>) {
  const t = useTranslations('auth');
  const { control } = useFormContext<TLoginForm>();

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="email"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="txt-secondary-700 text-sm font-medium">
              {t('login.emailLabel')}
            </FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder={t('login.emailPlaceholder')}
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
                {t('login.passwordLabel')}
              </FormLabel>
              <Link
                href="/forgot-password"
                className="text-xs txt-quaternary-500 hover:txt-brand-primary-600 transition-colors"
              >
                {t('login.forgotPassword')}
              </Link>
            </div>
            <FormControl>
              <PasswordInput
                placeholder={t('login.passwordPlaceholder')}
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
          loadingText={t('login.submitLoading')}
        >
          {t('login.submitButton')}
        </LoadingButton>
      </div>
    </div>
  );
}
