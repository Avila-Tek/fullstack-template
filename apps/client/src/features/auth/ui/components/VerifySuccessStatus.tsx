import { Button } from '@repo/ui/components/button';
import { CheckCircle2 } from 'lucide-react';

interface VerifySuccessStatusProps {
  message?: string;
  actionLabel?: string;
  onAction: () => void;
}

export function VerifySuccessStatus({
  message = 'Tu correo ha sido verificado. ¡Estás listo para empezar a construir grandes hábitos!',
  actionLabel = '¡Vamos!',
  onAction,
}: VerifySuccessStatusProps) {
  return (
    <div className="flex flex-col items-center space-y-4 py-2 text-center">
      <div className="rounded-2xl bg-success-primary p-5">
        <CheckCircle2 className="h-8 w-8 txt-success-primary-600" />
      </div>
      <div className="space-y-2">
        <p className="text-sm txt-tertiary-600 leading-relaxed">{message}</p>
      </div>
      <Button className="w-full h-11 rounded-xl mt-2" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
