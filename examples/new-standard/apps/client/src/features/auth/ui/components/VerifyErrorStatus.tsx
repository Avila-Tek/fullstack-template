import { Button } from '@repo/ui/components/button';
import { XCircle } from 'lucide-react';

interface VerifyErrorStatusProps {
  title?: string;
  message: string;
  onRetry: () => void;
  onBack: () => void;
  retryLabel?: string;
  backLabel?: string;
}

export function VerifyErrorStatus({
  title = 'Algo salió mal',
  message,
  onRetry,
  onBack,
  retryLabel = 'Intentar de nuevo',
  backLabel = 'Volver a iniciar sesión',
}: VerifyErrorStatusProps) {
  return (
    <div className="flex flex-col items-center space-y-4 py-2 text-center">
      <div className="rounded-2xl bg-error-primary p-5">
        <XCircle className="h-8 w-8 txt-error-primary-600" />
      </div>
      <div className="space-y-2">
        <h3 className="txt-primary-900 text-lg font-semibold">{title}</h3>
        <p className="text-sm txt-tertiary-600 leading-relaxed">{message}</p>
      </div>
      <div className="flex w-full flex-col gap-3 mt-2">
        <Button
          variant="outline"
          className="w-full h-11 rounded-xl"
          onClick={onRetry}
        >
          {retryLabel}
        </Button>
        <Button
          variant="ghost"
          className="w-full h-11 rounded-xl txt-quaternary-500"
          onClick={onBack}
        >
          {backLabel}
        </Button>
      </div>
    </div>
  );
}
