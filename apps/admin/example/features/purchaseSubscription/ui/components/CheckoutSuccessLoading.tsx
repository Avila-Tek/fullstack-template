import { Loader2 } from 'lucide-react';
import React from 'react';

export function CheckoutSuccessLoading(): React.ReactElement {
  return (
    <div className="flex flex-col items-center space-y-4 py-12 text-center">
      <Loader2 className="h-12 w-12 animate-spin txt-brand-primary-600" />
      <p className="txt-tertiary-600 text-base">Activating subscription...</p>
    </div>
  );
}
