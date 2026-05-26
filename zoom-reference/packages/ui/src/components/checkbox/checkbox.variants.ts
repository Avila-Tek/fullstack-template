import { cva, type VariantProps } from 'class-variance-authority';

export const checkboxVariants = cva(
  'cursor-[unset] peer appearance-none border border-primary bg-surface transition shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/30 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      zType: {
        default: 'checked:border-brand-600 checked:bg-brand-solid',
        destructive: 'checked:border-error-600 checked:bg-error-solid',
      },
      zSize: {
        default: 'size-4',
        lg: 'size-6',
      },
      zShape: {
        default: 'rounded-[4px]',
        circle: 'rounded-full',
        square: 'rounded-none',
      },
    },
    defaultVariants: {
      zType: 'default',
      zSize: 'default',
      zShape: 'default',
    },
  }
);

export const checkboxLabelVariants = cva(
  'cursor-[unset] text-current empty:hidden select-none',
  {
    variants: {
      zSize: {
        default: 'text-sm',
        lg: 'text-lg',
      },
    },
    defaultVariants: {
      zSize: 'default',
    },
  }
);

export type ZardCheckboxShapeVariants = NonNullable<
  VariantProps<typeof checkboxVariants>['zShape']
>;
export type ZardCheckboxSizeVariants = NonNullable<
  VariantProps<typeof checkboxVariants>['zSize']
>;
export type ZardCheckboxTypeVariants = NonNullable<
  VariantProps<typeof checkboxVariants>['zType']
>;
