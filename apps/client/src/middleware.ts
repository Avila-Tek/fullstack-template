import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/src/i18n/routing';
import { isAuthRoute, isPublicRoute } from '@/src/shared/utils/routes.utils';
import { isAuthenticated } from './lib/authMiddleware';

const handleI18n = createIntlMiddleware(routing);

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const authenticated = isAuthenticated(request);

  if (isAuthRoute(pathname) && authenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!isPublicRoute(pathname) && !authenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return handleI18n(request);
}

export const config = {
  matcher: [String.raw`/((?!api|_next/static|_next/image|favicon.ico|.*\..*).*)` ],
};
