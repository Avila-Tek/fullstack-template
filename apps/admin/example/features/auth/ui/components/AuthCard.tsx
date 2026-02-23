import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@repo/ui/components/card';
import { cn } from '@repo/ui/lib/utils';
import * as React from 'react';

interface AuthCardProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthCard({
  children,
  header,
  footer,
  className,
}: AuthCardProps) {
  return (
    <Card
      className={cn(
        'w-full bg-surface_alt border-0 shadow-sm shadow-black/5 rounded-2xl',
        'lg:shadow-md lg:shadow-black/8 lg:border lg:border-secondary',
        'gap-y-0',
        className
      )}
    >
      {header ? (
        <CardHeader className="px-3 pt-4 pb-1 sm:px-4 sm:pt-6">
          {header}
        </CardHeader>
      ) : null}
      <CardContent className="px-5 py-5 sm:px-6 space-y-4">
        {children}
      </CardContent>
      {footer ? (
        <CardFooter className="flex-col px-5 pb-6 pt-1 sm:px-6 sm:pb-8 space-y-4">
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}
