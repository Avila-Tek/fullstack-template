import React from 'react';
import { cn } from '../../utils/cn';
import { InformationIcon } from '../../icons';
import Tooltip from '../tooltip/Tooltip';

interface LabelProps {
  label: string;
  description?: string;
  tooltip?: boolean;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  alignment?: 'left' | 'right' | 'center';
  className?: {
    label?: string;
    icon?: string;
    description?: string;
    tooltip?: string;
  };
}

const setAlignment = (alignment: string) => {
  switch (alignment) {
    case 'center':
      return 'items-center';
    case 'left':
      return 'items-start';
    case 'right':
      return 'items-end';
    default:
      return 'items-center';
  }
};

export default function Label({
  label,
  description,
  tooltip = false,
  tooltipPosition = 'top',
  alignment = 'center',
  className,
}: LabelProps) {
  return (
    <div
      className={`flex justify-center gap-2 flex-col ${setAlignment(
        alignment
      )} `}
    >
      <span
        className={cn(
          'text-xl font-light items-center flex gap-2 text-black',
          className?.label
        )}
      >
        {label}
        {description && tooltip && (
          <Tooltip
            tooltip={description}
            position={tooltipPosition}
            className={className?.tooltip}
          >
            <InformationIcon className={cn('h-6 w-6', className?.icon)} />
          </Tooltip>
        )}
      </span>
      {description && !tooltip && (
        <p className={cn('text-sm text-neutral-400', className?.description)}>
          {description}
        </p>
      )}
    </div>
  );
}
