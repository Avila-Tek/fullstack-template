'use client';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import type { TResetPasswordForm } from '../../infrastructure/auth.form';
import { FormError } from './FormError';
import { LoadingButton } from './LoadingButton';
import { OtpInput } from './OtpInput';
import { PasswordInput } from './PasswordInput';

interface ResetPasswordFormContentProps {
  disabled: boolean;
  error?: Error | null;
  email: string;
}

export function ResetPasswordFormContent({
  disabled,
  error,
  email,
}: Readonly<ResetPasswordFormContentProps>) {
  const t = useTranslations('auth');
  const { control } = useFormContext<TResetPasswordForm>();

  return (
    <div className="space-y-4">
      <p className="text-sm txt-tertiary-600 leading-relaxed">
        {t('resetPassword.description', { email })}
      </p>

      <FormField
        control={control}
        name="otp"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="txt-secondary-700 text-sm font-medium">
              {t('resetPassword.otpLabel')}
            </FormLabel>
            <FormControl>
              <OtpInput
                field={field}
                disabled={disabled}
                className="w-full justify-center"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="newPassword"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel className="txt-secondary-700 text-sm font-medium">
              {t('resetPassword.newPasswordLabel')}
            </FormLabel>
            <FormControl>
              <PasswordInput
                placeholder={t('resetPassword.newPasswordPlaceholder')}
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
              {t('resetPassword.confirmPasswordLabel')}
            </FormLabel>
            <FormControl>
              <PasswordInput
                placeholder={t('resetPassword.confirmPasswordPlaceholder')}
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
          loadingText={t('resetPassword.submitLoading')}
        >
          {t('resetPassword.submitButton')}
        </LoadingButton>
      </div>
    </div>
  );
}
