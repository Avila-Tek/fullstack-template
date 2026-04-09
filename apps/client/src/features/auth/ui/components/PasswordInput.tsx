'use client';

import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { cn } from '@repo/ui/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import {
  evaluatePasswordStrength,
  type TPasswordStrength,
} from '../../domain/auth.logic';

const STRENGTH_COLOR_MAP: Record<TPasswordStrength, string> = {
  weak: 'bg-error-secondary',
  fair: 'bg-warning-secondary',
  good: 'bg-brand-secondary',
  strong: 'bg-success-secondary',
};

interface PasswordInputProps
  extends Omit<React.ComponentProps<'input'>, 'type'> {
  showStrengthIndicator?: boolean;
}

export function PasswordInput({
  className,
  showStrengthIndicator = false,
  value,
  ...props
}: Readonly<PasswordInputProps>) {
  const t = useTranslations('auth');
  const [showPassword, setShowPassword] = React.useState(false);

  const toggleVisibility = () => setShowPassword((prev) => !prev);

  const strengthResult =
    showStrengthIndicator && typeof value === 'string' && value.length > 0
      ? evaluatePasswordStrength(value)
      : null;

  const strengthColor = strengthResult
    ? STRENGTH_COLOR_MAP[strengthResult.strength]
    : null;

  const strengthLabel = strengthResult
    ? t(`password.${strengthResult.strength}`)
    : null;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          className={cn('pr-10', className)}
          value={value}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 txt-quaternary-500 hover:txt-secondary-700 hover:bg-transparent transition-colors duration-150"
          onClick={toggleVisibility}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          <span className="sr-only">
            {showPassword ? t('password.hide') : t('password.show')}
          </span>
        </Button>
      </div>
      {strengthResult && strengthColor && strengthLabel ? (
        <div className="space-y-1.5">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors duration-200 ease-out',
                  i <= strengthResult.score ? strengthColor : 'bg-tertiary'
                )}
              />
            ))}
          </div>
          <p className="text-xs txt-quaternary-500 transition-colors duration-200">
            {strengthLabel}
          </p>
        </div>
      ) : null}
    </div>
  );
}
