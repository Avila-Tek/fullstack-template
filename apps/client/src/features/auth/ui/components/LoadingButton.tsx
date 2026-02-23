'use client';

import { Button } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean;
  loadingText?: string;
}

export function LoadingButton({
  children,
  loading = false,
  loadingText,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={loading || disabled}
      className={cn(
        'w-full h-11 text-[0.9375rem] font-medium rounded-xl',
        'transition-all duration-150 ease-out',
        'shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.1)]',
        'active:scale-[0.98]',
        className
      )}
      {...props}
    >
      {loading ? (
        <React.Fragment>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span>{loadingText || 'Please wait...'}</span>
        </React.Fragment>
      ) : (
        children
      )}
    </Button>
  );
}
