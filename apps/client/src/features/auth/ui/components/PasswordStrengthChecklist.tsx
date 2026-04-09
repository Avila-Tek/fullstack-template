'use client';

import { PASSWORD_RULES, type PasswordRuleKey } from '@repo/schemas';
import { CheckCircle, Circle } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Maps schema rule keys to the auth i18n translation keys.
// Must be updated whenever PASSWORD_RULES gains a new entry.
const RULE_I18N_KEYS = {
  IDENTITY_PASSWORD_MIN_LENGTH: 'validation.passwordMinLength',
  IDENTITY_PASSWORD_MISSING_UPPERCASE: 'validation.passwordUppercase',
  IDENTITY_PASSWORD_MISSING_LOWERCASE: 'validation.passwordLowercase',
  IDENTITY_PASSWORD_MISSING_DIGIT: 'validation.passwordDigit',
  IDENTITY_PASSWORD_MISSING_SPECIAL: 'validation.passwordSpecial',
} as const satisfies Record<PasswordRuleKey, string>;

interface PasswordStrengthChecklistProps {
  value: string;
}

export function PasswordStrengthChecklist({
  value,
}: Readonly<PasswordStrengthChecklistProps>) {
  const t = useTranslations('auth');

  if (!value) return null;

  return (
    <ul className="mt-2 space-y-1.5">
      {PASSWORD_RULES.map(({ key, test }) => {
        const passes = test(value);
        return (
          <li
            key={key}
            className={`flex items-center gap-2 text-xs transition-colors duration-150 ${
              passes ? 'txt-success-600' : 'txt-quaternary-500'
            }`}
          >
            {passes ? (
              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0" />
            )}
            {t(RULE_I18N_KEYS[key])}
          </li>
        );
      })}
    </ul>
  );
}
