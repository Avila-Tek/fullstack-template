import React from 'react';
import { cn } from '../../utils/cn';

interface TooltipProps {
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
  tooltip?: string;
  className?: string;
}

const setPosition = (position: string) => {
  switch (position) {
    case 'top':
      return 'bottom-full left-1/2 mb-2 -translate-x-1/2';
    case 'bottom':
      return 'top-full left-1/2 mt-2 -translate-x-1/2';
    case 'left':
      return 'right-full top-1/2 mr-2 -translate-y-1/2';
    case 'right':
      return 'left-full top-1/2 ml-2 -translate-x-1/2';
    default:
      return 'bottom-full left-1/2 -mt-2 -translate-x-1/2';
  }
};

export default function Tooltip({
  children,
  tooltip,
  position = 'top',
  className,
}: TooltipProps) {
  return (
    <div className="group relative inline-block cursor-pointer">
      {children}
      <span
        className={cn(
          'invisible absolute w-40 break-words rounded-lg bg-neutral-100/80 px-4 py-2 text-xs text-black/75 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100',
          setPosition(position),
          className
        )}
      >
        {tooltip}
      </span>
    </div>
  );
}
