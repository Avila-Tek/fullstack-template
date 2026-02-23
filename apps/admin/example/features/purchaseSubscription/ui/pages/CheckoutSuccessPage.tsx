'use client';

import * as React from 'react';
import { CheckoutSuccessWidget } from '../widgets/CheckoutSuccessWidget';

export function CheckoutSuccessPage(): React.ReactElement {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <CheckoutSuccessWidget />
      </div>
    </div>
  );
}
