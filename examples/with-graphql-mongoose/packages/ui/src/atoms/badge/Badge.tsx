import { VariantProps, cva } from 'class-variance-authority';
import React from 'react';
import { cn } from '../../utils/cn';
import { Icon } from './Icon';
import { Text } from './Text';

interface BadgeProps
  extends Omit<React.HTMLProps<HTMLDivElement>, 'size'>,
    VariantProps<typeof badgeVariants> {
  children?: React.ReactNode;
}

const badgeVariants = cva(
  // clase base para todas las variantes
  'w-fit h-fit text-center flex items-center cursor-default gap-[4px]',
  {
    variants: {
      variant: {
        default:
          'bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 rounded-full',
        'pill-outline':
          'border border-brand-600 dark:border-brand-400 text-brand-700 dark:text-brand-300 rounded-full ',
        'badge-color':
          'bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 rounded-[6px] ',
        'badge-modern':
          'bg-primary dark:bg-gray-950 border border-primary dark:border-gray-700 text-secondary dark:text-gray-300 rounded-[6px] ',
        'only-icon':
          'w-[22px] h-[22px] flex items-center justify-center bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 rounded-full',
      },
      size: {
        sm: 'px-[8px] py-[2px]',
        default: 'px-[10px] py-[2px]',
        lg: 'px-[10px] py-[4px]',
        'icon-sm': 'w-[22px] h-[22px]',
        'icon-default': 'w-[28px] h-[28px]',
        'icon-lg': 'w-[32px] h-[32px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export default function Badge({
  className,
  variant,
  size,
  children,
  ...props
}: BadgeProps) {
  return (
    <div
      {...props}
      className={cn(badgeVariants({ size, variant, className }))}
      data-testid="Badge"
    >
      {children}
    </div>
  );
}

Badge.Text = Text;
Badge.Icon = Icon;
