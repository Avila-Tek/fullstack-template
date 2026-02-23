import { cn } from '@repo/ui/lib/utils';
import * as React from 'react';

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-6', className)}
      {...props}
    />
  );
}

export default CardContent;
