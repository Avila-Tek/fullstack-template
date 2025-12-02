'use client';

import * as Sentry from '@sentry/nextjs';
import React from 'react';

type Primitive = string | number | boolean | null | undefined;

/**
 * SentryWrapper
 * A client-side wrapper that applies Sentry metadata (tags, context, extras, user, fingerprint)
 * to all events triggered within its React subtree.
 *
 * USAGE:
 * <SentryWrapper
 *   tags={{ route: '/checkout' }}
 *   context={{ ui_state: { step: 'review' } }}
 *   fingerprint={['ValidationError', 'checkout']}
 * >
 *   {children}
 * </SentryWrapper>
 *
 * PROPS:
 * - user:      Optional Sentry user object.
 * - tags:      Key–value tags applied via Sentry.setTag.
 * - context:   Structured data stored under Sentry "app" context.
 * - extras:    Additional debugging metadata.
 * - fingerprint: Custom grouping fingerprint.
 * - stripEmpty (default: true): Skip null/undefined/empty values.
 * - clearOnUnmount (default: false): Clears tags/user/context on unmount.
 *
 * NOTES:
 * - Effect updates whenever metadata changes.
 * - Use for consistent observability across pages/layouts.
 */

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
