import React from 'react';
import { cn } from '../../utils/cn';

interface StatTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string;
  children: React.ReactNode;
}

export default function StatTitle({
  className,
  children,
  ...props
}: StatTitleProps) {
  return (
    <h5
      className={cn(
        'text-lg font-semibold whitespace-nowrap text-gray-500',
        className
      )}
      {...props}
    >
      {children}
    </h5>
  );
}
