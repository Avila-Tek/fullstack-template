'use client';

import * as Sentry from '@sentry/nextjs';
import React from 'react';

type Primitive = string | number | boolean | null | undefined;

export type SentryAttrs = {
  user?: { id?: string; email?: string; username?: string };
  tags?: Record<string, Primitive>;
  context?: Record<string, unknown>;
  extras?: Record<string, unknown>;
  fingerprint?: string[];
};

type SentryWrapperProps = React.PropsWithChildren<
  SentryAttrs & {
    stripEmpty?: boolean;
    clearOnUnmount?: boolean;
  }
>;

export default function SentryWrapper({
  user,
  tags,
  context,
  extras,
  fingerprint,
  stripEmpty = true,
  clearOnUnmount = false,
  children,
}: SentryWrapperProps) {
  React.useEffect(() => {
    if (tags) {
      for (const [key, val] of Object.entries(tags)) {
        if (stripEmpty && (val === null || val === undefined || val === ''))
          continue;
        Sentry.setTag(key, String(val));
      }
    }

    if (context && Object.keys(context).length > 0) {
      Sentry.setContext('app', context);
    }

    if (extras) {
      for (const [key, val] of Object.entries(extras)) {
        if (stripEmpty && (val === null || val === undefined)) continue;
        Sentry.setExtra(key, val);
      }
    }

    return () => {
      if (clearOnUnmount) {
        Sentry.setUser(null);
        if (tags) Object.keys(tags).forEach((k) => Sentry.setTag(k, ''));
        if (context) Sentry.setContext('app', undefined as any);
      }
    };
  }, [
    JSON.stringify(user ?? {}),
    JSON.stringify(tags ?? {}),
    JSON.stringify(context ?? {}),
    JSON.stringify(extras ?? {}),
    fingerprint?.join('|') ?? '',
    stripEmpty,
    clearOnUnmount,
  ]);

  return <>{children}</>;
}

