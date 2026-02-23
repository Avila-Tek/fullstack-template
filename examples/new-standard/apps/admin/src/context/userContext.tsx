'use client';

import type { User } from '@repo/auth';
import { isAdmin } from '@repo/auth';
import * as React from 'react';
import {
  removeAccessTokenCookie,
  setAccessTokenCookie,
} from '@/src/lib/cookies';
import { useCurrentUserQuery } from '@/src/shared/currentUser/application/queries/useCurrentUser.query';
import {
  authStatusEnumObject,
  localStorageKeysEnumObject,
  type TAuthStatusEnum,
} from '@/src/shared/currentUser/domain/currentUser.constants';
import type { UserSession } from '@/src/shared/currentUser/domain/currentUser.model';
import { CurrentUserService } from '@/src/shared/currentUser/infrastructure';
import {
  clearLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
} from '@/src/shared/utils/localStorage';

interface UserContextState {
  user: User | null;
  accessToken: string | null;
  status: TAuthStatusEnum;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
}

interface UserContextActions {
  setSession: (session: UserSession) => void;
  clearSession: () => void;
  refreshSession: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

export type UserContextValue = UserContextState & UserContextActions;

export const UserContext = React.createContext<UserContextValue | null>(null);

interface UserProviderProps {
  children: React.ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [accessToken, setAccessToken] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<TAuthStatusEnum>(
    authStatusEnumObject.loading
  );

  const {
    data: currentUser,
    isLoading: isUserLoading,
    error: userError,
    refetch: refetchUser,
  } = useCurrentUserQuery();

  // Initialize from localStorage on mount
  React.useEffect(() => {
    const storedToken = getLocalStorageItem<string>(
      localStorageKeysEnumObject.accessToken
    );
    if (storedToken) {
      setAccessToken(storedToken);
    } else {
      setStatus(authStatusEnumObject.unauthenticated);
    }
  }, []);

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

  const setSession = React.useCallback((session: UserSession) => {
    setLocalStorageItem(
      localStorageKeysEnumObject.accessToken,
      session.accessToken
    );
    setLocalStorageItem(localStorageKeysEnumObject.user, session.user);
    setAccessTokenCookie(session.accessToken);
    setAccessToken(session.accessToken);
    setStatus(authStatusEnumObject.authenticated);
  }, []);

  const clearSession = React.useCallback(() => {
    clearLocalStorage([
      localStorageKeysEnumObject.accessToken,
      localStorageKeysEnumObject.user,
      localStorageKeysEnumObject.refreshToken,
    ]);
    removeAccessTokenCookie();
    setAccessToken(null);
    setStatus(authStatusEnumObject.unauthenticated);
  }, []);

  const refreshSession = React.useCallback(async () => {
    try {
      setStatus(authStatusEnumObject.loading);
      const session = await CurrentUserService.getSession();
      setSession(session);
      await refetchUser();
    } catch {
      clearSession();
    }
  }, [setSession, clearSession, refetchUser]);

  const refetchUserWrapper = React.useCallback(async () => {
    await refetchUser();
  }, [refetchUser]);

  const isUserAdmin = React.useMemo(() => {
    return isAdmin(currentUser);
  }, [currentUser]);

  const value = React.useMemo<UserContextValue>(
    () => ({
      user: currentUser ?? null,
      accessToken,
      status,
      isAuthenticated: status === authStatusEnumObject.authenticated,
      isLoading: status === authStatusEnumObject.loading || isUserLoading,
      isAdmin: isUserAdmin,
      setSession,
      clearSession,
      refreshSession,
      refetchUser: refetchUserWrapper,
    }),
    [
      currentUser,
      accessToken,
      status,
      isUserLoading,
      isUserAdmin,
      setSession,
      clearSession,
      refreshSession,
      refetchUserWrapper,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
