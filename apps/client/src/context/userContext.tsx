'use client';

import { authClient } from '@repo/auth';
import type { User } from '@repo/auth';
import * as React from 'react';
import { useCurrentUserQuery } from '@/src/shared/currentUser/application/queries/useCurrentUser.query';
import {
  authStatusEnumObject,
  type TAuthStatusEnum,
} from '@/src/shared/currentUser/domain/currentUser.constants';

interface UserContextState {
  user: User | null;
  status: TAuthStatusEnum;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface UserContextActions {
  clearSession: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

export type UserContextValue = UserContextState & UserContextActions;

export const UserContext = React.createContext<UserContextValue | null>(null);

interface UserProviderProps {
  children: React.ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [status, setStatus] = React.useState<TAuthStatusEnum>(
    authStatusEnumObject.loading
  );

  const {
    data: currentUser,
    isLoading: isUserLoading,
    error: userError,
    refetch: refetchUser,
  } = useCurrentUserQuery();

  // Update status when current user data changes
  React.useEffect(() => {
    if (isUserLoading) {
      setStatus(authStatusEnumObject.loading);
    } else if (currentUser) {
      setStatus(authStatusEnumObject.authenticated);
    } else if (userError) {
      setStatus(authStatusEnumObject.unauthenticated);
    }
  }, [currentUser, isUserLoading, userError]);

  const clearSession = React.useCallback(async () => {
    await authClient.signOut();
    setStatus(authStatusEnumObject.unauthenticated);
  }, []);

  const refetchUserWrapper = React.useCallback(async () => {
    await refetchUser();
  }, [refetchUser]);

  const value = React.useMemo<UserContextValue>(
    () => ({
      user:            currentUser ?? null,
      status,
      isAuthenticated: status === authStatusEnumObject.authenticated,
      isLoading:       status === authStatusEnumObject.loading || isUserLoading,
      clearSession,
      refetchUser:     refetchUserWrapper,
    }),
    [
      currentUser,
      status,
      isUserLoading,
      clearSession,
      refetchUserWrapper,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
