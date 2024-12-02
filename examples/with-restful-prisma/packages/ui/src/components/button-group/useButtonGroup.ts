import React from 'react';
import { ButtonGroupContext } from './ButtonGroupContext';

export default function useButtonGroup() {
  const context = React.useContext(ButtonGroupContext);
  if (context === undefined) {
    throw new Error('useButtonGroup must be used within ButtonGroupProvider');
  }
  return context;
}
