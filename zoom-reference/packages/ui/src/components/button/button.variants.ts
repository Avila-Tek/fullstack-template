import { cva, type VariantProps } from 'class-variance-authority';

import { mergeClasses } from '../../utils/merge-classes';

export const buttonVariants = cva(
  mergeClasses(
    'inline-flex items-center gap-2 justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none font-medium cursor-pointer'
  ),
  {
    variants: {
      zType: {
        default: 'bg-brand-solid txt-white hover:bg-brand-solid_hover',
        destructive:
          'bg-error-solid hover:bg-error-solid_hover focus-visible:ring-error-300 dark:focus-visible:ring-error-400 dark:bg-error-surface txt-white dark:txt-error-primary-600 focus-visible:border-error-400 dark:hover:bg-error-secondary',
        outline:
          'border border-primary bg-surface hover:bg-secondary_hover txt-primary-900 aria-expanded:bg-secondary_subtle aria-expanded:txt-primary-900',
        secondary:
          'bg-secondary hover:bg-secondary_hover txt-primary-900 aria-expanded:bg-secondary_hover aria-expanded:txt-primary-900',
        ghost:
          'hover:bg-secondary_hover txt-tertiary-600 aria-expanded:bg-secondary_hover aria-expanded:txt-tertiary-600',
        link: 'txt-utility-brand-600 underline-offset-4 hover:underline',
        transparent:
          'h-11 rounded-sm text-base txt-quaternary-500 hover:bg-secondary',
      },
      zSize: {
        default: 'h-9 gap-1 px-3 py-2 text-sm',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-sm in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        icon: 'size-8',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-9',
      },
      zShape: {
        default: 'rounded-md',
        circle: 'rounded-full',
        square: 'rounded-none',
      },
      zFull: {
        true: 'w-full',
      },
      zLoading: {
        true: 'pointer-events-none opacity-50',
      },
      zDisabled: {
        true: 'pointer-events-none !bg-disabled border !border-disabled_subtle !txt-quaternary-400',
      },
    },
    defaultVariants: {
      zType: 'default',
      zSize: 'default',
      zShape: 'default',
    },
  }
);
export type ZardButtonShapeVariants = NonNullable<
  VariantProps<typeof buttonVariants>['zShape']
>;
export type ZardButtonSizeVariants = NonNullable<
  VariantProps<typeof buttonVariants>['zSize']
>;
export type ZardButtonTypeVariants = NonNullable<
  VariantProps<typeof buttonVariants>['zType']
>;
