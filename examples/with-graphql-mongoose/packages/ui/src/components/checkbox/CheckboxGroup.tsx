import React from 'react';
import CheckboxContext from './CheckboxContext';
import Checkbox from './Checkbox';

interface CheckboxGroupProps {
  children: React.ReactNode;
  defaultSelected?: string[];
  onSelectionChange: (selectedItems: string[]) => void;
}

function CheckboxGroup({
  children,
  defaultSelected = [],
  onSelectionChange,
}: CheckboxGroupProps) {
  const [selectedItems, setSelectedItems] =
    React.useState<string[]>(defaultSelected);

  const toggleItem = React.useCallback(
    (item: string) => {
      const newSelectedItems = selectedItems.includes(item)
        ? selectedItems.filter((i) => i !== item)
        : [...selectedItems, item];
      setSelectedItems(newSelectedItems);
      onSelectionChange(newSelectedItems);
    },
    [onSelectionChange, selectedItems]
  );

  const contextValue = React.useMemo(
    () => ({
      selectedItems,
      toggleItem,
    }),
    [selectedItems, toggleItem]
  );

  return (
    <CheckboxContext.Provider value={contextValue}>
      {children}
    </CheckboxContext.Provider>
  );
}

CheckboxGroup.Checkbox = Checkbox;

export default CheckboxGroup;
