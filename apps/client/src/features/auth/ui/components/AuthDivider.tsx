import { Separator } from '@repo/ui/components/separator';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface AuthDividerProps {
  text?: string;
}

export function AuthDivider({ text }: Readonly<AuthDividerProps>) {
  const t = useTranslations('auth');
  const resolvedText = text ?? t('divider');

  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <Separator className="w-full border-secondary" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-surface_alt px-4 txt-quaternary-400 lowercase tracking-wide">
          {resolvedText}
        </span>
      </div>
    </div>
  );
}
