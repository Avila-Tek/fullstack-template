import React from 'react';
import { cn } from '../../utils/cn';
import { CloseIcon, CheckCircleIcon, InfoCircleIcon, ExclamationTriangleIcon, ExclamationCircleIcon } from '../../icons';

type Severity = 'success' | 'info' | 'warning' | 'error';
type Variant = 'standard' | 'outlined' | 'filled';

interface AlertProps {
  severity: Severity;
  variant?: Variant;
  className?: string;
  iconClassName?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconMapping?: { [key in Severity]?: React.ReactNode };
  action?: React.ReactNode;
  onClose?: () => void;
}

const colors = {
  standard: {
    success: {
      background: 'bg-green-100',
      icon: 'text-green-600',
      text: 'text-green-800',
      border: 'border-none',
    },
    info: {
      background: 'bg-blue-100',
      icon: 'text-[#0288d1]',
      text: 'text-[#014361]',
      border: 'border-none',
    },
    warning: {
      background: 'bg-yellow-300',
      icon: 'text-amber-500',
      text: 'text-amber-700',
      border: 'border-none',
    },
    error: {
      background: 'bg-red-100',
      icon: 'text-red-500',
      text: 'text-red-700',
      border: 'border-none',
    },
  },
  outlined: {
    success: {
      background: 'bg-transparent',
      icon: 'text-green-600',
      text: 'text-green-800',
      border: 'border border-green-600',
    },
    info: {
      background: 'bg-transparent',
      icon: 'text-blue-400',
      text: 'text-blue-700',
      border: 'border border-blue-400',
    },
    warning: {
      background: 'bg-transparent',
      icon: 'text-amber-500',
      text: 'text-amber-700',
      border: 'border border-amber-500',
    },
    error: {
      background: 'bg-transparent',
      icon: 'text-red-500',
      text: 'text-red-700',
      border: 'border border-red-500',
    },
  },
  filled: {
    success: {
      background: 'bg-green-800',
      icon: 'text-white',
      text: 'text-white',
      border: 'border-none',
    },
    info: {
      background: 'bg-blue-600',
      icon: 'text-white',
      text: 'text-white',
      border: 'border-none',
    },
    warning: {
      background: 'bg-amber-400',
      icon: 'text-white',
      text: 'text-white',
      border: 'border-none',
    },
    error: {
      background: 'bg-red-600',
      icon: 'text-white',
      text: 'text-white',
      border: 'border-none',
    },
  },
};

const icons = {
  success: CheckCircleIcon,
  info: InfoCircleIcon,
  warning: ExclamationTriangleIcon,
  error: ExclamationCircleIcon,
};

function Alert({
  severity,
  variant = 'standard',
  className,
  iconClassName,
  children,
  icon,
  iconMapping,
  action,
  onClose,
}: AlertProps) {
  const color = colors[variant][severity];
  const DefaultIcon = icons[severity];
  const Icon =
    icon === false ? null : iconMapping?.[severity] || icon || DefaultIcon;

  let iconElement = null;
  if (React.isValidElement(Icon)) {
    iconElement = React.cloneElement(Icon);
  } else if (typeof Icon === 'function') {
    iconElement = <Icon />;
  }

  let actionElement = null;
  if (action) {
    actionElement = action;
  } else if (onClose) {
    actionElement = (
      <CloseIcon
        className="max-w-[24px] max-h-[24px] min-w-[24px] min-h-[24px] cursor-pointer"
        onClick={onClose}
      />
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center justify-between space-x-2 rounded px-4 py-1.5 w-full max-w-md',
        color.background,
        color.text,
        color.border,
        className
      )}
    >
      <div className="flex items-center space-x-2">
        {iconElement && (
          <div
            className={cn(
              'min-w-[24px] min-h-[24px]',
              color.icon,
              iconClassName
            )}
          >
            {iconElement}
          </div>
        )}
        <div className="font-normal text-sm leading-6 tracking-wider">
          {children}
        </div>
      </div>
      {actionElement}
    </div>
  );
}

export default Alert;
