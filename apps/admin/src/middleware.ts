import { type NextRequest, NextResponse } from 'next/server';

/**
 * Better Auth sets an HTTPOnly session cookie named `better-auth.session_token`.
 * The middleware checks its presence to decide if the request is authenticated.
 * Role validation (admin-only) happens in AdminLayout after the user is fetched.
 */
const BA_SESSION_COOKIE = 'better-auth.session_token';

function isAuthenticated(request: NextRequest): boolean {
  return !!request.cookies.get(BA_SESSION_COOKIE)?.value;
}

const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root to /login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const authenticated = isAuthenticated(request);

  // Redirect authenticated users away from /login
  if (PUBLIC_PATHS.includes(pathname) && authenticated) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // Redirect unauthenticated users to /login
  if (!PUBLIC_PATHS.includes(pathname) && !authenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
