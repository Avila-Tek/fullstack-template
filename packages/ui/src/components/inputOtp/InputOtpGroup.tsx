'use client';

import { cn } from '@repo/ui/lib/utils';
import * as React from 'react';

function InputOtpGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn('flex items-center', className)}
      {...props}
    />
  );
}

export default InputOtpGroup;
