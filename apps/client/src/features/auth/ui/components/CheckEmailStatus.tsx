import { Button } from '@repo/ui/components/button';
import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CheckEmailStatusProps {
  title?: string;
  message?: string;
  note?: string;
  actionLabel?: string;
  onAction: () => void;
}

export function CheckEmailStatus({
  title,
  message,
  note,
  actionLabel,
  onAction,
}: Readonly<CheckEmailStatusProps>) {
  const t = useTranslations('auth');

  const resolvedTitle = title ?? t('verifyEmail.title');
  const resolvedMessage = message ?? t('verifyEmail.defaultMessage');
  const resolvedNote = note ?? t('verifyEmail.defaultNote');
  const resolvedActionLabel =
    actionLabel ?? t('verifyEmail.defaultActionLabel');

  return (
    <div className="flex flex-col items-center space-y-4 py-2 text-center">
      <div className="rounded-2xl bg-brand-primary p-5">
        <Mail className="h-8 w-8 txt-brand-primary-600" />
      </div>
      <div className="space-y-2">
        <h3 className="txt-primary-900 text-lg font-semibold">
          {resolvedTitle}
        </h3>
        <p className="text-sm txt-tertiary-600 leading-relaxed">
          {resolvedMessage}
        </p>
      </div>
      <Button
        variant="outline"
        className="w-full h-11 rounded-xl mt-2"
        onClick={onAction}
      >
        {resolvedActionLabel}
      </Button>
      {resolvedNote ? (
        <p className="text-xs txt-quaternary-400 leading-relaxed">
          {resolvedNote}
        </p>
      ) : null}
    </div>
  );
}
