'use client';

import { Switch as HeadlessSwitch } from '@headlessui/react';
import React from 'react';
import { twMerge } from 'tailwind-merge';

interface SwitchProps {
  size?: 'sm' | 'md' | 'lg';
  activeColor?: string;
  spanClasses?: string;
  enabled?: boolean;
  setEnabled?: (enabled: boolean) => void;
}

const spanDefaultClasses =
  ' pointer-events-none inline-block  transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out';

export default function Switch({
  size = 'md',
  activeColor = 'bg-sky-500',
  spanClasses = '',
  enabled = false,
  setEnabled = () => {},
}: SwitchProps) {
  const sizeClasses = {
    sm: 'h-6 w-11',
    md: 'h-7 w-[52px]',
    lg: 'h-10 w-[76px]',
  }[size];

  const spanSizesClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-[25px]',
    lg: 'h-9 w-9',
  }[size];

  const translateXClasses = {
    sm: 'translate-x-5',
    md: 'translate-x-6',
    lg: 'translate-x-9',
  }[size];

  return (
    <HeadlessSwitch
      checked={enabled}
      onChange={setEnabled}
      className={`${enabled ? activeColor : 'bg-gray-300'}
          relative inline-flex  shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white/75
            ${sizeClasses}
          }`}
    >
      <span
        aria-hidden="true"
        className={`${
          enabled ? translateXClasses : 'translate-x-0'
        } ${spanSizesClasses}
            ${
              spanClasses
                ? twMerge(spanDefaultClasses, spanClasses)
                : spanDefaultClasses
            }`}
      />
    </HeadlessSwitch>
  );
}
