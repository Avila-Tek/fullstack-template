import { cva, type VariantProps } from 'class-variance-authority';

export type zInputIcon = 'email' | 'password' | 'text';

export const inputVariants = cva('w-full', {
  variants: {
    zType: {
      default:
        'flex rounded-lg border border-primary bg-surface px-3.5 font-light txt-primary-900 shadow-xs file:border-0 file:txt-primary-900 file:bg-transparent placeholder:txt-placeholder outline-none focus-visible:border-brand-600 focus-visible:ring-1 focus-visible:ring-brand-600/30 disabled:cursor-not-allowed disabled:bg-secondary disabled:txt-quaternary-500',
      textarea:
        'flex resize-none min-h-32 h-auto rounded-lg border border-primary bg-surface px-3.5 py-3 text-base font-light txt-primary-900 shadow-xs placeholder:txt-placeholder outline-none focus-visible:border-brand-600 focus-visible:ring-1 focus-visible:ring-brand-600/30 disabled:cursor-not-allowed disabled:opacity-50',
    },
    zSize: {
      default: 'text-base',
      sm: 'text-xs',
      lg: 'text-base',
    },
    zStatus: {
      error: 'border-destructive focus-visible:ring-destructive',
      warning: 'border-yellow-500 focus-visible:ring-yellow-500',
      success: 'border-green-500 focus-visible:ring-green-500',
    },
    zBorderless: {
      true: 'flex-1 bg-transparent border-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0',
    },
  },
  defaultVariants: {
    zType: 'default',
    zSize: 'default',
  },
  compoundVariants: [
    {
      zType: 'default',
      zSize: 'default',
      class: 'h-11 py-2.5 file:max-md:py-0',
    },
    {
      zType: 'default',
      zSize: 'sm',
      class: 'h-8 file:md:py-2 file:max-md:py-1.5',
    },
    {
      zType: 'default',
      zSize: 'lg',
      class: 'h-11 py-2.5 file:md:py-3 file:max-md:py-2.5',
    },
  ],
});

export type ZardInputTypeVariants = NonNullable<
  VariantProps<typeof inputVariants>['zType']
>;
export type ZardInputSizeVariants = NonNullable<
  VariantProps<typeof inputVariants>['zSize']
>;
export type ZardInputStatusVariants = NonNullable<
  VariantProps<typeof inputVariants>['zStatus']
>;
