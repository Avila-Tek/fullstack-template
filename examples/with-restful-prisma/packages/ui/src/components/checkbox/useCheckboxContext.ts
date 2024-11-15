import React from 'react';
import CheckboxContext, { CheckboxContextValue } from './CheckboxContext';

export default function useCheckboxContext(): CheckboxContextValue {
  const context = React.useContext(CheckboxContext);
  if (!context) {
    throw new Error('Checkbox must be used within a CheckboxGroup');
  }
  return context;
}
