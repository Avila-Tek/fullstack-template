'use client';

import { createContext } from 'react';

export interface CheckboxContextValue {
  selectedItems: string[];
  toggleItem: (item: string) => void;
}

const CheckboxContext = createContext<CheckboxContextValue | undefined>(
  undefined
);

export default CheckboxContext;
