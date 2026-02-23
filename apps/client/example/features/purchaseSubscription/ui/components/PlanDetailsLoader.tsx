import { Loader2 } from 'lucide-react';
import React from 'react';

export function PlanDetailsLoader(): React.ReactElement {
  return (
    <div className="flex flex-col items-center space-y-4 py-6 text-center">
      <Loader2 className="h-10 w-10 animate-spin txt-brand-primary-600" />
      <p className="txt-tertiary-600 text-sm">Loading plan details...</p>
    </div>
  );
}
