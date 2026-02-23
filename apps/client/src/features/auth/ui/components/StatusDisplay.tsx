import { Button } from '@repo/ui/components/button';
import { getEnumObjectFromArray } from '@repo/utils';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import * as React from 'react';

export const statusType = ['loading', 'success', 'error'] as const;
export type TStatusTypeEnum = (typeof statusType)[number];
export const statusTypeEnumObject = getEnumObjectFromArray(statusType);

interface StatusAction {
  label: string;
  onClick: () => void;
}

interface StatusDisplayProps {
  status: TStatusTypeEnum;
  message: string;
  action?: StatusAction;
}

const statusConfig = {
  loading: {
    icon: Loader2,
    containerClass: '',
    iconClass: 'h-10 w-10 animate-spin txt-brand-primary-600',
  },
  success: {
    icon: CheckCircle2,
    containerClass: 'rounded-2xl bg-success-primary p-5',
    iconClass: 'h-8 w-8 txt-success-primary-600',
  },
  error: {
    icon: XCircle,
    containerClass: 'rounded-2xl bg-error-primary p-5',
    iconClass: 'h-8 w-8 txt-error-primary-600',
  },
} as const;

export function StatusDisplay({ status, message, action }: StatusDisplayProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center space-y-4 py-2 text-center">
      <div className={config.containerClass}>
        <Icon className={config.iconClass} />
      </div>
      <div className="space-y-2">
        <p className="text-sm txt-tertiary-600 leading-relaxed">{message}</p>
      </div>
      {action ? (
        <div className="flex w-full flex-col gap-3 mt-2">
          <Button className="w-full h-11 rounded-xl" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
