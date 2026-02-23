'use client';

import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { cn } from '@repo/ui/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';
import {
  evaluatePasswordStrength,
  passwordStrengthEnumObject,
  type TPasswordStrength,
} from '../../domain/auth.logic';

const STRENGTH_UI_MAP: Record<
  TPasswordStrength,
  { label: string; color: string }
> = {
  [passwordStrengthEnumObject.weak]: {
    label: 'Débil',
    color: 'bg-error-secondary',
  },
  [passwordStrengthEnumObject.fair]: {
    label: 'Regular',
    color: 'bg-warning-secondary',
  },
  [passwordStrengthEnumObject.good]: {
    label: 'Buena',
    color: 'bg-brand-secondary',
  },
  [passwordStrengthEnumObject.strong]: {
    label: 'Fuerte',
    color: 'bg-success-secondary',
  },
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
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  const toggleVisibility = () => setShowPassword((prev) => !prev);

  const strengthResult =
    showStrengthIndicator && typeof value === 'string' && value.length > 0
      ? evaluatePasswordStrength(value)
      : null;

  const strengthUI = strengthResult
    ? STRENGTH_UI_MAP[strengthResult.strength]
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
            {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          </span>
        </Button>
      </div>
      {strengthResult && strengthUI ? (
        <div className="space-y-1.5">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors duration-200 ease-out',
                  i <= strengthResult.score ? strengthUI.color : 'bg-tertiary'
                )}
              />
            ))}
          </div>
          <p className="text-xs txt-quaternary-500 transition-colors duration-200">
            {strengthUI.label}
          </p>
        </div>
      ) : null}
    </div>
  );
}
