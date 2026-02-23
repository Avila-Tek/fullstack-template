import Link from 'next/link';
import * as React from 'react';
import { routeBuilders } from '@/src/shared/routes/routes';

export function LegalLinks(): React.ReactElement {
  return (
    <p className="text-xs text-center txt-quaternary-500">
      By continuing, you agree to our{' '}
      <Link
        href={routeBuilders.terms()}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:txt-brand-600"
      >
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link
        href={routeBuilders.privacy()}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:txt-brand-600"
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
}
