'use client';

import {
  clearLocalStorage,
  getLocalStorageItem,
  localStorageKeysEnumObject,
  setLocalStorageItem,
} from '@repo/services';
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { useCurrentUserQuery } from '@/src/shared/currentUser/application/queries/useCurrentUser.query';
import {
  authStatusEnumObject,
  currentUserQueryKey,
  type TAuthStatusEnum,
} from '@/src/shared/currentUser/domain/currentUser.constants';
import {
  getUserSubscriptionStatus,
  hasActiveSubscription,
} from '@/src/shared/currentUser/domain/currentUser.logic';
import type {
  CurrentUser,
  SubscriptionPlan,
  UserSubscriptionStatus,
} from '@/src/shared/currentUser/domain/currentUser.model';
import { type UserSession } from '@/src/shared/currentUser/domain/currentUser.model';
import { CurrentUserService } from '@/src/shared/currentUser/infrastructure';

interface UserContextState {
  user: CurrentUser | null;
  accessToken: string | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  isAuthenticated: boolean;
  isLoading: boolean;
  // Subscription helpers
  hasActiveSubscription: boolean;
  subscriptionStatus: UserSubscriptionStatus;
  activePlan: SubscriptionPlan | null;
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

  // Fetch current user with subscription data from shared/currentUser
  const {
    data: currentUser,
    isLoading: isUserLoading,
    error: userError,
    refetch: refetchUser,
  } = useCurrentUserQuery();

  const queryClient = useQueryClient();

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
    // Note: Cookie handling is done separately in server components
    setAccessToken(session.accessToken);
    setStatus(authStatusEnumObject.authenticated);
  }, []);

  const clearSession = React.useCallback(() => {
    clearLocalStorage([
      localStorageKeysEnumObject.accessToken,
      localStorageKeysEnumObject.user,
      localStorageKeysEnumObject.refreshToken,
    ]);
    // Note: Cookie clearing is done separately in server components
    setAccessToken(null);
    setStatus(authStatusEnumObject.unauthenticated);
  }, []);

  const refreshSession = React.useCallback(async () => {
    try {
      setStatus(authStatusEnumObject.loading);
      const session = await CurrentUserService.getSession();
      setSession(session);
      // Also refresh current user data with subscription
      await refetchUser();
    } catch {
      clearSession();
    }
  }, [setSession, clearSession, refetchUser]);

  const refetchUserWrapper = React.useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: currentUserQueryKey,
    });
    await refetchUser();
  }, [refetchUser]);

  // Derive subscription state from current user
  const subscriptionStatus = React.useMemo(() => {
    return getUserSubscriptionStatus(currentUser);
  }, [currentUser]);

  const hasActiveSub = React.useMemo(() => {
    return hasActiveSubscription(currentUser);
  }, [currentUser]);

  const activePlan = React.useMemo(() => {
    return currentUser?.subscription?.plan ?? null;
  }, [currentUser]);

  const value = React.useMemo<UserContextValue>(
    () => ({
      user: currentUser ?? null,
      accessToken,
      status,
      isAuthenticated: status === authStatusEnumObject.authenticated,
      isLoading: status === authStatusEnumObject.loading || isUserLoading,
      hasActiveSubscription: hasActiveSub,
      subscriptionStatus,
      activePlan,
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
      hasActiveSub,
      subscriptionStatus,
      activePlan,
      setSession,
      clearSession,
      refreshSession,
      refetchUserWrapper,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
