import { type NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/src/shared/routes/authMiddleware';
import { routeBuilders } from '@/src/shared/routes/routes';
import {
  isAuthRoute,
  isProtectedRoute,
} from '@/src/shared/routes/routes.utils';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = isAuthenticated(request);

  if (isAuthRoute(pathname) && authenticated) {
    return NextResponse.redirect(
      new URL(routeBuilders.dashboard(), request.url)
    );
  }

  if (isProtectedRoute(pathname) && !authenticated) {
    const loginUrl = new URL(
      routeBuilders.login({ callbackUrl: pathname }),
      request.url
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\..*).*)'],
};
