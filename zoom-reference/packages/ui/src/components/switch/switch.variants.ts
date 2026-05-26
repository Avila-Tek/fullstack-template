import { cva, VariantProps } from 'class-variance-authority';

export const switchVariants = cva(
  'peer inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=unchecked]:bg-tertiary',
  {
    variants: {
      zType: {
        default: 'data-[state=checked]:bg-brand-solid',
        destructive: 'data-[state=checked]:bg-error-solid',
      },
      zSize: {
        default: 'h-6 w-11',
        sm: 'h-5 w-9',
        lg: 'h-7 w-13',
      },
    },
    defaultVariants: {
      zType: 'default',
      zSize: 'default',
    },
  }
);

export type ZardSwitchSizeVariants = NonNullable<
  VariantProps<typeof switchVariants>['zSize']
>;
export type ZardSwitchTypeVariants = NonNullable<
  VariantProps<typeof switchVariants>['zType']
>;
