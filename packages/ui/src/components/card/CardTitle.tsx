import { cn } from '@repo/ui/lib/utils';
import * as React from 'react';

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  );
}

export default CardTitle;
