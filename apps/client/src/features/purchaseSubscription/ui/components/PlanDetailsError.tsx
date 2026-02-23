import { Alert, AlertDescription } from '@repo/ui/components/alert';
import { AlertCircle } from 'lucide-react';
import React from 'react';

interface PlanDetailsErrorProps {
  error: Error;
}

export function PlanDetailsError({
  error,
}: PlanDetailsErrorProps): React.ReactElement {
  return (
    <Alert className="bg-error-primary border-error txt-error-primary-600 animate-in fade-in-0 slide-in-from-top-1">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="txt-error-primary-600">
        {error.message || 'Failed to load plan details'}
      </AlertDescription>
    </Alert>
  );
}
