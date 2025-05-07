import React from 'react';
import { cn } from '../../utils/cn';

interface StatProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  > {
  children: React.ReactNode;
}

export default function Stat({
  children,
  className = '',
  ...props
}: StatProps) {
  return (
    <div
      className={cn(
        `w-full bg-white shadow-md rounded-md p-4 flex space-x-4 justify-between items-center min-w-48 hover:bg-gray-50 transition-transform duration-300 ease-in-out`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
