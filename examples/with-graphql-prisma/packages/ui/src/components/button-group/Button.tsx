import React from 'react';
import { cn } from '../../utils/cn';
import useButtonGroup from './useButtonGroup';

export default function Button({
  children,
  className,
  disabled: _disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { orientation, disabled } = useButtonGroup();

  return (
    <button
      type="button"
      disabled={disabled ? true : _disabled}
      className={cn(
        `px-4 py-2 bg-white text-sm font-medium transition duration-300
        ease-in-out focus:outline-none`,
        orientation === 'horizontal' ? ' h-full' : ' w-full h-10',
        disabled || _disabled
          ? 'cursor-not-allowed bg-gray-100 text-gray-400'
          : 'hover:bg-gray-50 text-gray-700 hover:text-gray-800',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
