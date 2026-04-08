import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/src/i18n/routing';

const handleI18n = createIntlMiddleware(routing);

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return handleI18n(request);
}

export const config = {
  matcher: [String.raw`/((?!api|_next/static|_next/image|favicon.ico|.*\..*).*)` ],
};
