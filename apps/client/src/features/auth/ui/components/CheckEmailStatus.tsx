import { Button } from '@repo/ui/components/button';
import { Mail } from 'lucide-react';

interface CheckEmailStatusProps {
  title?: string;
  message?: string;
  note?: string;
  actionLabel?: string;
  onAction: () => void;
}

export function CheckEmailStatus({
  title = 'Revisa tu bandeja de entrada',
  message = 'Te enviamos un enlace de verificación. Haz clic en él para confirmar tu correo y comenzar.',
  note = '¿No lo recibiste? Revisa spam o contacta soporte.',
  actionLabel = 'Volver a iniciar sesión',
  onAction,
}: CheckEmailStatusProps) {
  return (
    <div className="flex flex-col items-center space-y-4 py-2 text-center">
      <div className="rounded-2xl bg-brand-primary p-5">
        <Mail className="h-8 w-8 txt-brand-primary-600" />
      </div>
      <div className="space-y-2">
        <h3 className="txt-primary-900 text-lg font-semibold">{title}</h3>
        <p className="text-sm txt-tertiary-600 leading-relaxed">{message}</p>
      </div>
      <Button
        variant="outline"
        className="w-full h-11 rounded-xl mt-2"
        onClick={onAction}
      >
        {actionLabel}
      </Button>
      {note ? (
        <p className="text-xs txt-quaternary-400 leading-relaxed">{note}</p>
      ) : null}
    </div>
  );
}
