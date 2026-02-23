import { Slot } from '@radix-ui/react-slot';
import { cn } from '@repo/ui/lib/utils';
import { getEnumObjectFromArray } from '@repo/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

export const buttonVariant = [
  'default',
  'destructive',
  'outline',
  'secondary',
  'ghost',
  'link',
  'cta',
  'cta_outline',
] as const;
export type TButtonVariantEnum = (typeof buttonVariant)[number];
export const buttonVariantEnumObject = getEnumObjectFromArray(buttonVariant);

export const buttonSize = ['default', 'sm', 'lg', 'icon'] as const;
export type TButtonSizeEnum = (typeof buttonSize)[number];
export const buttonSizeEnumObject = getEnumObjectFromArray(buttonSize);

const buttonVariants = cva(
  "rounded-full inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:cursor-pointer",
  {
    variants: {
      variant: {
        [buttonVariantEnumObject.default]:
          'bg-surface text-primary-foreground shadow-xs hover:bg-surface/90',
        [buttonVariantEnumObject.destructive]:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        [buttonVariantEnumObject.outline]:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        [buttonVariantEnumObject.secondary]:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        [buttonVariantEnumObject.ghost]:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        [buttonVariantEnumObject.link]:
          'text-primary underline-offset-4 hover:underline',
        [buttonVariantEnumObject.cta]:
          'bg-brand-solid txt-primary_on-brand shadow-sm hover:bg-brand-solid_hover active:translate-y-px',
        [buttonVariantEnumObject.cta_outline]:
          'bg-surface txt-primary shadow-sm hover:bg-brand-solid_hover hover:txt-primary_on-brand active:translate-y-px border-1 border-brand',
      },
      size: {
        [buttonSizeEnumObject.default]: 'h-9 px-4 py-2 has-[>svg]:px-3',
        [buttonSizeEnumObject.sm]: 'h-8 gap-1.5 px-3 has-[>svg]:px-2.5',
        [buttonSizeEnumObject.lg]: 'h-10 px-6 has-[>svg]:px-4',
        [buttonSizeEnumObject.icon]: 'size-9',
      },
    },
    defaultVariants: {
      variant: buttonVariantEnumObject.default,
      size: buttonSizeEnumObject.default,
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };

export default Button;
