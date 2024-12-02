import { Tab } from '@headlessui/react';
import React from 'react';
import { cn } from '../../utils/cn';

// Context
interface StepperContextProps {
  selectedIndex: number;
}

// setting initial values to context
export const StepperContext = React.createContext<StepperContextProps>({
  selectedIndex: 0,
});

interface StepperProps {
  selectedIndex: number;
  onChange?: (index: number) => void;
  children: React.ReactNode;
  className?: string;
}

export function Stepper({
  onChange,
  children,
  className,
  selectedIndex = 0,
}: StepperProps) {
  const value = React.useMemo(
    () => ({
      selectedIndex,
    }),
    [selectedIndex]
  );

  return (
    <StepperContext.Provider value={value}>
      <Tab.Group
        manual
        key={selectedIndex}
        selectedIndex={selectedIndex}
        onChange={(index) => {
          if (onChange) onChange(index);
        }}
      >
        <div className={cn('w-full h-full p-2', className ?? '')}>
          {children}
        </div>
      </Tab.Group>
    </StepperContext.Provider>
  );
}
