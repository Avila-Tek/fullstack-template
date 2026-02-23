'use client';

import * as React from 'react';
import {
  UserContext,
  type UserContextValue,
} from '@/src/shared/currentUser/ui/context/userContext';

export function useUser(): UserContextValue {
  const context = React.useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
