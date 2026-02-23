'use client';

import type * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@repo/ui/lib/utils';
import React from 'react';
import { Label } from '../label';
import useFormField from './useFormField';

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn('data-[error=true]:text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

export default FormLabel;
