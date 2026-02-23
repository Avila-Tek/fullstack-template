import { type NextRequest, NextResponse } from 'next/server';
import { isAuthRoute, isPublicRoute } from '@/src/shared/utils/routes.utils';
import { isAuthenticated } from './lib/authMiddleware';

export function middleware(request: NextRequest) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\..*).*)'],
};
