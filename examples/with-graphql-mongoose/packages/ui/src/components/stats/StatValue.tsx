import React from 'react';
import { cn } from '../../utils/cn';

interface StatValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string;
  children: React.ReactNode;
  percent?: boolean;
}

export default function StatValue({
  className,
  children,
  percent = false,
  ...props
}: StatValueProps) {
  return (
    <span
      className={cn(
        'text-lg font-semibold whitespace-nowrap text-gray-500 flex',
        className
      )}
      {...props}
    >
      {children}
      {percent && <p className={cn('font-medium ml-0.5')}>%</p>}
    </span>
  );
}
