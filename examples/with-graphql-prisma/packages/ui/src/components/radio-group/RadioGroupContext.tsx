import React from 'react';

export interface RadioGroupContextProps {
  selectedOption?: string;
  selectOption?: React.Dispatch<React.SetStateAction<string>>;
}

export const RadioGroupContext = React.createContext<RadioGroupContextProps>(
  {} as RadioGroupContextProps
);

interface RadioGroupProviderProps extends RadioGroupContextProps {
  children: React.ReactNode;
}

export function RadioGroupProvider({
  children,
  selectedOption,
  selectOption,
}: RadioGroupProviderProps) {
  const value: RadioGroupContextProps = React.useMemo(
    () => ({
      selectedOption,
      selectOption,
    }),
    [selectOption, selectedOption]
  );

  return (
    <RadioGroupContext.Provider value={value}>
      {children}
    </RadioGroupContext.Provider>
  );
}
