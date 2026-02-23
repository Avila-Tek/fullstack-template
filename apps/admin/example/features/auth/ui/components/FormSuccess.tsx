import { Alert, AlertDescription } from '@repo/ui/components/alert';
import { CheckCircle2 } from 'lucide-react';
import * as React from 'react';

interface FormSuccessProps {
  message?: string;
}

export function FormSuccess({ message }: FormSuccessProps) {
  if (!message) return null;

  return (
    <Alert className="bg-success-primary border-success txt-success-primary-600 animate-in fade-in-0 slide-in-from-top-1">
      <CheckCircle2 className="h-4 w-4" />
      <AlertDescription className="txt-success-primary-600">
        {message}
      </AlertDescription>
    </Alert>
  );
}
