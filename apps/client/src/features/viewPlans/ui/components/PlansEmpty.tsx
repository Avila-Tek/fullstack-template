import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import React from 'react';

export function PlansEmpty(): React.ReactElement {
  return (
    <Alert className="max-w-md mx-auto">
      <AlertTitle>No plans available</AlertTitle>
      <AlertDescription>
        Please check back later for available plans.
      </AlertDescription>
    </Alert>
  );
}
