import { cn } from '@repo/ui/lib/utils';
import { getEnumObjectFromArray } from '@repo/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';

export const alertVariant = ['default', 'destructive'] as const;
export type TAlertVariantEnum = (typeof alertVariant)[number];
export const alertVariantEnumObject = getEnumObjectFromArray(alertVariant);

export const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        [alertVariantEnumObject.default]: 'bg-card text-card-foreground',
        [alertVariantEnumObject.destructive]:
          'text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90',
      },
    },
    defaultVariants: {
      variant: alertVariantEnumObject.default,
    },
  }
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export default Alert;
