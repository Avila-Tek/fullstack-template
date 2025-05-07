import React from 'react';
import { CancelIcon } from '../../icons';
import Avatar from './Avatar';

interface ChipProps {
  variant?: 'filled' | 'outlined';
  deleteIcon?: React.ReactNode;
  label: string;
  size?: 'small' | 'medium';
  color?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'error'
    | 'info'
    | 'success'
    | 'warning';
  onDelete?: () => void;
  children?: React.ReactNode;
}

function Chip({
  variant,
  deleteIcon,
  label,
  size = 'medium',
  color = 'default',
  onDelete,
  children,
}: ChipProps) {
  const colorClasses = {
    default:
      variant === 'filled'
        ? 'border border-gray-500 text-gray-500'
        : 'bg-gray-200 text-gray-800',
    primary:
      variant === 'filled'
        ? 'border border-blue-500 text-blue-500'
        : 'bg-blue-500 text-white',
    secondary:
      variant === 'filled'
        ? 'border border-green-500 text-green-500'
        : 'bg-green-500 text-white',
    error:
      variant === 'filled'
        ? 'border border-red-500 text-red-500'
        : 'bg-red-500 text-white',
    info:
      variant === 'filled'
        ? 'border border-teal-500 text-teal-500'
        : 'bg-teal-500 text-white',
    success:
      variant === 'filled'
        ? 'border border-green-500 text-green-500'
        : 'bg-green-500 text-white',
    warning:
      variant === 'filled'
        ? 'border border-amber-400 text-amber-400'
        : 'bg-amber-400 text-white',
  };

  const avatarSize =
    size === 'small' ? 'w-5 h-5 min-w-5 min-h-5' : 'w-6 h-6 min-w-6 min-h-6';

  const letterSize = size === 'small' ? 'text-xs' : 'text-sm';
  const labelFontSize = size === 'small' ? 'text-sm' : 'text-md';
  const deleteIconSize = size === 'small' ? 'w-4 h-4' : 'w-5 h-5';

  const deleteIconClasses = {
    default:
      variant === 'filled'
        ? `${
            deleteIcon
              ? 'text-gray-500'
              : 'bg-gray-500 hover:bg-gray-700 text-white'
          }`
        : 'bg-gray-200 opacity-50 hover:bg-gray-300 text-gray-500',
    primary:
      variant === 'filled'
        ? `${
            deleteIcon
              ? 'text-blue-500'
              : 'bg-blue-500 hover:bg-blue-700 text-white'
          }`
        : 'bg-gray-200 opacity-50 hover:bg-gray-300 text-blue-500',
    secondary:
      variant === 'filled'
        ? `${
            deleteIcon
              ? 'text-green-500'
              : 'bg-green-500 hover:bg-green-700 text-white'
          }`
        : 'bg-gray-200 opacity-50 hover:bg-gray-300 text-green-500',
    error:
      variant === 'filled'
        ? `${
            deleteIcon
              ? 'text-red-500'
              : 'bg-red-500 hover:bg-red-700 text-white'
          }`
        : 'bg-gray-200 opacity-50 hover:bg-gray-300 text-red-500',
    info:
      variant === 'filled'
        ? `${
            deleteIcon
              ? 'text-teal-500'
              : 'bg-teal-500 hover:bg-teal-700 text-white'
          }`
        : 'bg-gray-200 opacity-50 hover:bg-gray-300 text-teal-500',
    success:
      variant === 'filled'
        ? `${
            deleteIcon
              ? 'text-green-500'
              : 'bg-green-500 hover:bg-green-700 text-white'
          }`
        : 'bg-gray-200 opacity-50 hover:bg-gray-300 text-green-500',
    warning:
      variant === 'filled'
        ? `${
            deleteIcon
              ? 'text-black'
              : 'bg-amber-500 hover:bg-amber-700 text-white'
          }`
        : 'bg-gray-200 opacity-50 hover:bg-gray-300 text-amber-500',
  };

  return (
    <div
      className={`inline-flex items-center justify-center m-1 rounded-full ${
        size === 'small' ? 'py-0.5 px-1' : 'py-1 px-2'
      } ${colorClasses[color]} max-w-full`}
    >
      {children ? (
        <div
          className={`mr-1 flex-shrink-0 ${avatarSize} bg-gray-500 ${letterSize} text-white rounded-full flex items-center justify-center align-middle`}
        >
          {children}
        </div>
      ) : null}

      <span className={`mx-1 truncate ${labelFontSize} flex-grow`}>
        {label}
      </span>
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className={`mx-1 h-full rounded-full p-px ${deleteIconClasses[color]} flex items-center justify-center`}
        >
          {deleteIcon || <CancelIcon className={`${deleteIconSize}`} />}
        </button>
      ) : null}
    </div>
  );
}

Chip.Avatar = Avatar;
export default Chip;
