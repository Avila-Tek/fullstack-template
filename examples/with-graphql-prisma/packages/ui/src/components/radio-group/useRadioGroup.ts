import React from 'react';
import { RadioGroupContext } from './RadioGroupContext';

export default function useRadioGroup() {
  const context = React.useContext(RadioGroupContext);
  if (context === undefined) {
    throw new Error('useRadioGroup must be used within RadioGroupProvider');
  }
  return context;
}
