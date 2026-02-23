'use client';

import { cn } from '@repo/ui/lib/utils';
import React from 'react';
import { FormItemContext } from './formContext';

function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn('grid gap-2', className)}
        {...props}
      />
    </FormItemContext.Provider>
  );
}

export default FormItem;
