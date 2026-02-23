import { Loader2 } from 'lucide-react';
import React from 'react';

export function PlansLoading(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Loading plans...</p>
    </div>
  );
}
