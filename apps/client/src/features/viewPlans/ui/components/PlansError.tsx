import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import { Button } from '@repo/ui/components/button';
import React from 'react';

interface PlansErrorProps {
  error: Error;
  onRetry: () => void;
}

export function PlansError({
  error,
  onRetry,
}: PlansErrorProps): React.ReactElement {
  return (
    <Alert variant="destructive" className="max-w-md mx-auto">
      <AlertTitle>Error loading plans</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>{error.message}</p>
        <Button onClick={onRetry} variant="outline" size="sm">
          Try Again
        </Button>
      </AlertDescription>
    </Alert>
  );
}
