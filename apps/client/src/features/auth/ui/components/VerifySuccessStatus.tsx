import { Button } from '@repo/ui/components/button';
import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface VerifySuccessStatusProps {
  message?: string;
  actionLabel?: string;
  onAction: () => void;
}

export function VerifySuccessStatus({
  message,
  actionLabel,
  onAction,
}: Readonly<VerifySuccessStatusProps>) {
  const t = useTranslations('auth');

  const resolvedMessage = message ?? t('verifyEmail.successMessage');
  const resolvedActionLabel = actionLabel ?? t('verifyEmail.successButton');

  return (
    <div className="flex flex-col items-center space-y-4 py-2 text-center">
      <div className="rounded-2xl bg-success-primary p-5">
        <CheckCircle2 className="h-8 w-8 txt-success-primary-600" />
      </div>
      <div className="space-y-2">
        <p className="text-sm txt-tertiary-600 leading-relaxed">
          {resolvedMessage}
        </p>
      </div>
      <Button className="w-full h-11 rounded-xl mt-2" onClick={onAction}>
        {resolvedActionLabel}
      </Button>
    </div>
  );
}
