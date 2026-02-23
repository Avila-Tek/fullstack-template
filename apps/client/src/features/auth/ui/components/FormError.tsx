import { Alert, AlertDescription } from '@repo/ui/components/alert';
import { AlertCircle } from 'lucide-react';
import * as React from 'react';

interface FormErrorProps {
  message?: string;
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return (
    <Alert className="bg-error-primary border-error txt-error-primary-600 animate-in fade-in-0 slide-in-from-top-1">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="txt-error-primary-600">
        {message}
      </AlertDescription>
    </Alert>
  );
}
