import { useTranslations } from 'next-intl';
import { z } from 'zod';

export type TAuthTranslations = ReturnType<typeof useTranslations<'auth'>>;

export function buildLoginSchema(t: TAuthTranslations) {
  return z.object({
    email: z
      .string()
      .min(1, { message: t('validation.emailRequired') })
      .email({ message: t('validation.emailInvalid') }),
    password: z
      .string()
      .min(1, { message: t('validation.passwordRequired') })
      .min(8, { message: t('validation.passwordMin') }),
  });
}

export type TLoginForm = z.infer<ReturnType<typeof buildLoginSchema>>;

export function createLoginDefaultValues(
  partial?: Partial<TLoginForm>
): TLoginForm {
  return {
    email: partial?.email ?? '',
    password: partial?.password ?? '',
  };
}
