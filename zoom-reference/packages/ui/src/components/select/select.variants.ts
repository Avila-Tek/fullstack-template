import { cva, type VariantProps } from 'class-variance-authority';
import { mergeClasses } from '../../utils/merge-classes';

export const selectTriggerVariants = cva(
  mergeClasses(
    'flex w-full items-center gap-2 rounded-lg border border-primary bg-surface shadow-xs font-light',
    'cursor-pointer outline-none',
    'focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/30',
    'disabled:cursor-not-allowed disabled:bg-secondary disabled:txt-quaternary-500'
  ),
  {
    variants: {
      zSize: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-11 px-3.5 py-2.5 text-base',
        lg: 'h-11 px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      zSize: 'default',
    },
  }
);

export type ZardSelectSizeVariants = NonNullable<
  VariantProps<typeof selectTriggerVariants>['zSize']
>;
