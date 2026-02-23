'use client';

import * as React from 'react';
import { CheckoutCancelWidget } from '../widgets/CheckoutCancelWidget';

export function CheckoutCancelPage(): React.ReactElement {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <CheckoutCancelWidget />
      </div>
    </div>
  );
}
