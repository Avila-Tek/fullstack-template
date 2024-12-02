import React from 'react';
import { cn } from '../../utils/cn';

interface NavigationFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export default function NavigationFooter({
  children,
  className = '',
}: NavigationFooterProps) {
  return (
    <div
      className={cn(
        `h-16 w-full flex items-end justify-end border-t border-light-utility-gray-200 dark:border-dark-utility-gray-200`,
        className
      )}
    >
      {children}
    </div>
  );
}
