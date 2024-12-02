'use client';

import React from 'react';

import useCheckboxContext from './useCheckboxContext';

interface CheckboxProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

function Checkbox({ value, children, className }: CheckboxProps) {
  const { selectedItems, toggleItem } = useCheckboxContext();
  const checked = selectedItems.includes(value);

  return (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => toggleItem(value)}
        className={className}
      />
      {children}
    </label>
  );
}

export default Checkbox;
