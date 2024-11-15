import React from 'react';
import { cn } from '../../utils/cn';

interface StatBodyProps {
  children: React.ReactNode;
  className?: string;
}

export default function StatBody({ children, className = '' }: StatBodyProps) {
  return (
    <div
      className={cn(
        `w-full flex justify-between items-center space-x-1`,
        className
      )}
    >
      {children}
    </div>
  );
}
