//  import/no-extraneous-dependencies

import { VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../utils/cn';

const buttonVariants = cva(
  // clase base para todas las variantes
  'shadow-sm inline-flex items-center justify-center rounded-md font-medium transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-brand-500 disabled:pointer-events-none disabled:bg-disabled disabled:text-fg-disabled disabled:border-disabled_subtle ring-offset-background border',
  {
    variants: {
      variant: {
        default: 'bg-brand-600 text-base-white hover:bg-brand-700',
        'secondary-gray':
          'bg-base-white dark:bg-gray-dark-mode-900 hover:bg-gray-light-mode-50 hover:dark:bg-gray-dark-mode-800 border-gray-light-mode-300 dark:border-gray-dark-mode-500 text-gray-light-mode-700 hover:text-gray-light-mode-800 dark:hover:text-gray-dark-mode-100 dark:text-gray-dark-mode-300',
        'secondary-color':
          'bg-base-white dark:bg-gray-dark-mode-900 hover:bg-brand-50 hover:dark:bg-gray-dark-mode-800 border-brand-300 dark:border-gray-dark-mode-300 text-brand-700 hover:text-brand-800 dark:hover:text-gray-dark-mode-100 dark:text-gray-dark-mode-300',
        'tertiary-color':
          'border-0 shadow-none hover:bg-brand-50 hover:dark:bg-gray-dark-mode-800 text-brand-700 dark:hover:text-gray-dark-mode-100 hover:text-brand-800 dark:text-gray-dark-mode-300',
        'tertiary-gray':
          'border-0 shadow-none hover:bg-gray-light-mode-50 hover:dark:bg-gray-dark-mode-800 text-gray-light-mode-600 dark:hover:text-gray-dark-mode-200 hover:text-gray-light-mode-700 dark:text-gray-dark-mode-400',
        'link-gray':
          'border-0 shadow-none text-gray-light-mode-600 dark:hover:text-gray-dark-mode-200 hover:text-gray-light-mode-700 dark:text-gray-dark-mode-400 ',
        'link-color':
          'border-0 shadow-none text-brand-700 dark:hover:text-gray-dark-mode-100 hover:text-brand-800 dark:text-gray-dark-mode-300',
        destructive:
          'bg-error-600 text-base-white hover:bg-error-700 focus:ring-error-400',
        'destructive-secondary':
          'bg-base-white dark:bg-error-950 hover:bg-error-50 hover:dark:bg-error-900 border-error-300 dark:border-error-800 dark:hover:border-error-700 text-error-700 hover:text-error-800 dark:hover:text-error-100 dark:text-error-200 focus:ring-error-400',
      },
      size: {
        default: 'h-10 py-[10px] px-[14px]',
        sm: 'h-9 py-2 px-3 leading-tight',
        lg: 'h-11 py-[10px] px-4 text-base',
        xl: 'h-12 py-3 px-[18px] text-base font-semibold',
        '2xl': 'h-[60px] py-4 px-[22px] text-lg font-semibold leading-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, disabled = true, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ size, variant, className }))}
      ref={ref}
      type="button"
      {...props}
    />
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };
