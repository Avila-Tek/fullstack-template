import { Sparkles } from 'lucide-react';
import React from 'react';

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
}

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className="text-center space-y-4">
      {/* Logo icon */}
      <div className="flex justify-center">
        <div className="w-10 h-10 rounded-lg bg-surface-solid flex items-center justify-center">
          <Sparkles className="h-5 w-5 txt-white" />
        </div>
      </div>

      <div className="space-y-1.5">
        <h1 className="txt-primary-900 text-xl font-semibold tracking-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="txt-tertiary-600 text-sm leading-relaxed mx-auto">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
