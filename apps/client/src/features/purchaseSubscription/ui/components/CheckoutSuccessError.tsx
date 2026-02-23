'use client';

import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { AlertCircle } from 'lucide-react';
import React from 'react';

interface CheckoutSuccessErrorProps {
  error: Error;
  onRetry: () => void;
}

export function CheckoutSuccessError({
  error,
  onRetry,
}: CheckoutSuccessErrorProps): React.ReactElement {
  return (
    <Card className="border border-error bg-surface">
      <CardHeader className="pb-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="rounded-full bg-error-primary/10 p-3">
            <AlertCircle className="h-10 w-10 txt-error-primary-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-center">
            Activation failed
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <CardDescription className="text-center text-base txt-tertiary-600">
          {error.message ??
            'Failed to activate your subscription. Please try again.'}
        </CardDescription>
        <Button onClick={onRetry} variant="outline" className="w-full">
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}
