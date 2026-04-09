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
import type { ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';

function renderTermsLink(chunks: ReactNode) {
  return (
    <Link
      href="/terms"
      className="underline underline-offset-2 hover:txt-tertiary-600"
    >
      {chunks}
    </Link>
  );
}

function renderPrivacyLink(chunks: ReactNode) {
  return (
    <Link
      href="/privacy"
      className="underline underline-offset-2 hover:txt-tertiary-600"
    >
      {chunks}
    </Link>
  );
}

import type { TSignUpForm } from '../../infrastructure/auth.form';
import { FormError } from './FormError';
import { LoadingButton } from './LoadingButton';
import { PasswordInput } from './PasswordInput';

interface SignUpFormContentProps {
  disabled: boolean;
  error?: Error | null;
}

export function SignUpFormContent({
  disabled,
  error,
}: Readonly<SignUpFormContentProps>) {
  const t = useTranslations('auth');
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
                {t('signUp.firstNameLabel')}
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder={t('signUp.firstNamePlaceholder')}
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
                {t('signUp.lastNameLabel')}
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder={t('signUp.lastNamePlaceholder')}
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
              {t('signUp.emailLabel')}
            </FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder={t('signUp.emailPlaceholder')}
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
              {t('signUp.passwordLabel')}
            </FormLabel>
            <FormControl>
              <PasswordInput
                placeholder={t('signUp.passwordPlaceholder')}
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
              {t('signUp.confirmPasswordLabel')}
            </FormLabel>
            <FormControl>
              <PasswordInput
                placeholder={t('signUp.confirmPasswordPlaceholder')}
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
          loadingText={t('signUp.submitLoading')}
          variant="cta"
        >
          {t('signUp.submitButton')}
        </LoadingButton>

        <p className="text-center text-xs txt-quaternary-400 leading-relaxed">
          {t.rich('signUp.termsText', {
            terms: renderTermsLink,
            privacy: renderPrivacyLink,
          })}
        </p>
      </div>
    </div>
  );
}
