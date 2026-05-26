'use client';

import { authClient } from '@repo/auth';
import { getEnumObjectFromArray } from '@repo/utils';
import * as React from 'react';

const oauthCallbackStatus = ['loading', 'success', 'error'] as const;
type TOAuthCallbackStatus = (typeof oauthCallbackStatus)[number];
const oauthCallbackStatusEnum = getEnumObjectFromArray(oauthCallbackStatus);

export { oauthCallbackStatusEnum, type TOAuthCallbackStatus };

type OAuthCallbackResult =
  | { success: true }
  | { success: false; message: string };

export function useOAuthCallback() {
  const [status, setStatus] = React.useState<TOAuthCallbackStatus>(
    oauthCallbackStatusEnum.loading
  );
  const [error, setError] = React.useState<Error | null>(null);
  const hasProcessed = React.useRef(false);

  const processCallback = React.useCallback(
    async (): Promise<OAuthCallbackResult> => {
      if (hasProcessed.current) return { success: false, message: 'Already processed' };
      hasProcessed.current = true;

      try {
        // BA sets the session cookie after OAuth redirect. Verify the session exists.
        const session = await authClient.getSession();
        if (!session.data?.session) {
          throw new Error('No session found after OAuth callback');
        }
        setStatus(oauthCallbackStatusEnum.success);
        return { success: true };
      } catch (e) {
        const err = e instanceof Error ? e : new Error('OAuth callback failed');
        setError(err);
        setStatus(oauthCallbackStatusEnum.error);
        return { success: false, message: err.message };
      }
    },
    []
  );

  return { processCallback, status, error };
}
