import { cva, type VariantProps } from 'class-variance-authority';

export const statusPillVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs',
  {
    variants: {
      zType: {
        success:
          'border-success-200 dark:border-success-700 bg-success-surface txt-success-primary-600',
        neutral: 'border-secondary bg-secondary txt-secondary-700',
      },
    },
    defaultVariants: { zType: 'neutral' },
  }
);

export const statusPillDotVariants = cva('size-1.5 rounded-full', {
  variants: {
    zType: {
      success: 'bg-success-500 dark:bg-success-400',
      neutral: 'bg-quaternary-500',
    },
  },
  defaultVariants: { zType: 'neutral' },
});

export type ZardStatusPillTypeVariants = NonNullable<
  VariantProps<typeof statusPillVariants>['zType']
>;
