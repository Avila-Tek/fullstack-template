import React from 'react';
import { cn } from '../../utils/cn';

interface NavigationGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  direction?: 'row' | 'column';
}

export default function NavigationGroup({
  children,
  className = '',
  direction = 'column',
}: NavigationGroupProps) {
  return (
    <div
      className={cn(
        `flex ${
          direction === 'column'
            ? 'w-full flex-col p-4 pt-0 space-y-1'
            : 'w-auto flex-row items-center space-x-1'
        }`,
        className
      )}
    >
      {children}
    </div>
  );
}
