import React from 'react';

export interface ButtonGroupContextProps {
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
}

export const ButtonGroupContext = React.createContext<ButtonGroupContextProps>(
  {} as ButtonGroupContextProps
);

interface ButtonGroupProviderProps extends ButtonGroupContextProps {
  children: React.ReactNode;
}

export function ButtonGroupProvider({
  children,
  orientation,
  disabled,
}: ButtonGroupProviderProps) {
  const value: ButtonGroupContextProps = React.useMemo(
    () => ({
      orientation,
      disabled,
    }),
    [orientation, disabled]
  );

  return (
    <ButtonGroupContext.Provider value={value}>
      {children}
    </ButtonGroupContext.Provider>
  );
}
