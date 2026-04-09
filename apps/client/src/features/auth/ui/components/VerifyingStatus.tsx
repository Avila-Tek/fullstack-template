import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface VerifyingStatusProps {
  message?: string;
}

export function VerifyingStatus({ message }: Readonly<VerifyingStatusProps>) {
  const t = useTranslations('auth');
  const resolvedMessage = message ?? t('verifyEmail.verifyingMessage');

  return (
    <div className="flex flex-col items-center space-y-4 py-6 text-center">
      <Loader2 className="h-10 w-10 animate-spin txt-brand-primary-600" />
      <p className="txt-tertiary-600 text-sm">{resolvedMessage}</p>
    </div>
  );
}
