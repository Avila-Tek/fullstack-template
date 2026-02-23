import Link from 'next/link';
import * as React from 'react';
import { routeBuilders } from '@/src/shared/routes/routes';

export function LandingFooter(): React.ReactElement {
  return (
    <footer
      className="border-t border-gray-200 bg-surface px-4 py-8"
      role="contentinfo"
    >
      <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs txt-quaternary-500">
        <p>© {new Date().getFullYear()} HabitFlow</p>
        <nav className="flex items-center gap-6" aria-label="Enlaces legales">
          <Link
            href={routeBuilders.terms()}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:txt-brand-600"
          >
            Términos
          </Link>
          <Link
            href={routeBuilders.privacy()}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:txt-brand-600"
          >
            Privacidad
          </Link>
        </nav>
      </div>
    </footer>
  );
}
