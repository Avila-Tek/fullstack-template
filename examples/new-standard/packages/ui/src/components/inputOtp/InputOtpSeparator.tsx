'use client';

import { MinusIcon } from 'lucide-react';
import * as React from 'react';

function InputOtpSeparator({ ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <MinusIcon />
    </div>
  );
}

export default InputOtpSeparator;
