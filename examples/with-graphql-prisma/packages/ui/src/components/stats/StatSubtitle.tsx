import React from 'react';
import { cn } from '../../utils/cn';

interface StatSubtitleProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string;
  children: React.ReactNode;
}

export default function StatSubtitle({
  className,
  children,
  ...props
}: StatSubtitleProps) {
  return (
    <span
      className={cn(
        'text-sm font-base whitespace-nowrap text-gray-500',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
