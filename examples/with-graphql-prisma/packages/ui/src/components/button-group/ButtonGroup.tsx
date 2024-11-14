import React from 'react';
import Button from './Button';
import { ButtonGroupProvider } from './ButtonGroupContext';
import { cn } from '../../utils/cn';

interface ButtonGroupProps {
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export default function ButtonGroup({
  orientation = 'horizontal',
  disabled = false,
  className,
  children,
}: ButtonGroupProps) {
  return (
    <ButtonGroupProvider orientation={orientation} disabled={disabled}>
      <div
        className={cn(
          'flex items-center rounded-lg bg-transparent border border-gray-300 divide-gray-300 shadow-sm w-fit overflow-hidden',
          orientation === 'horizontal'
            ? 'flex-row divide-x h-10'
            : 'flex-col divide-y h-fit',
          className
        )}
      >
        {children}
      </div>
    </ButtonGroupProvider>
  );
}

ButtonGroup.Button = Button;
