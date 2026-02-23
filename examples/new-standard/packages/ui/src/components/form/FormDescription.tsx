'use client';

import { cn } from '@repo/ui/lib/utils';
import React from 'react';
import useFormField from './useFormField';

function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export default FormDescription;
