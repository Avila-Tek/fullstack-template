'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import React from 'react';

export function PostHogPageView(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const postHog = usePostHog();
  React.useEffect(() => {
    // Track pageviews
    if (pathname && postHog) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      postHog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams, postHog]);

  return null;
}
