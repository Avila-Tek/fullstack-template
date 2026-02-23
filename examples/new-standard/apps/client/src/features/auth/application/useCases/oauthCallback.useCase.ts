import { localStorageKeysEnumObject } from '@repo/services';
import { getEnumObjectFromArray } from '@repo/utils';
import * as React from 'react';
import { useGetSessionQuery } from '@/src/shared/currentUser/application/queries/useGetSession.query';
import type { UserSession } from '@/src/shared/currentUser/domain/currentUser.model';

// Status enum definitions
const oauthCallbackStatus = ['loading', 'success', 'error'] as const;
type TOAuthCallbackStatus = (typeof oauthCallbackStatus)[number];
const oauthCallbackStatusEnum = getEnumObjectFromArray(oauthCallbackStatus);

export { oauthCallbackStatusEnum, type TOAuthCallbackStatus };

type OAuthCallbackResult = {
  success: boolean;
  session?: UserSession;
};

type Dependencies = {
  getSession: () => Promise<UserSession>;
};

export async function oauthCallbackUseCase(
  deps: Dependencies
): Promise<OAuthCallbackResult> {
  try {
    const session = await deps.getSession();
    return { success: true, session };
  } catch {
    return { success: false };
  }
}

export function useOAuthCallback() {
  const getSessionQuery = useGetSessionQuery();
  const [status, setStatus] = React.useState<TOAuthCallbackStatus>(
    oauthCallbackStatusEnum.loading
  );
  const hasProcessed = React.useRef(false);

  const processCallback =
    React.useCallback(async (): Promise<OAuthCallbackResult> => {
      if (hasProcessed.current) {
        return { success: false };
      }
      hasProcessed.current = true;

      const result = await oauthCallbackUseCase({
        getSession: async () => {
          const { data } = await getSessionQuery.refetch();
          if (!data) {
            throw new Error('Failed to get session');
          }
          return data;
        },
      });

      if (result.success && result.session) {
        localStorage.setItem(
          localStorageKeysEnumObject.accessToken,
          result.session.accessToken
        );
        localStorage.setItem(
          localStorageKeysEnumObject.user,
          JSON.stringify(result.session.user)
        );
        setStatus(oauthCallbackStatusEnum.success);
      } else {
        setStatus(oauthCallbackStatusEnum.error);
      }

      return result;
    }, [getSessionQuery]);

  return {
    processCallback,
    status,
    isLoading: getSessionQuery.isLoading || getSessionQuery.isFetching,
    isError: getSessionQuery.isError,
    error: getSessionQuery.error,
  };
}
