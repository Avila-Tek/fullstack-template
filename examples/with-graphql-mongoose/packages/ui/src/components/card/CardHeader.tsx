import React from 'react';
import { cn } from '../../utils/cn';

interface CardHeaderProps {
  children: React.ReactNode;
  className?: {
    container?: string;
    text?: string;
    divider?: string;
  };
}

export default function CardHeader({
  children,
  className = {},
}: CardHeaderProps) {
  return (
    <>
      <div className={cn(`px-6 py-2`, className)}>
        <span className="text-gray-300 flex justify-between uppercase">
          {children}
        </span>
      </div>
      <hr className={cn(`w-full h-[0.5px] bg-neutral-200`, className)} />
    </>
  );
}
