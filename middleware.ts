import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('merraine-auth');
  const isAuthenticated = authCookie?.value === 'authenticated';
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isAuthApi = request.nextUrl.pathname.startsWith('/api/auth');

  // Allow auth API routes
  if (isAuthApi) {
    return NextResponse.next();
  }

  // Return JSON 401 for API routes instead of redirecting (prevents non-JSON responses)
  if (request.nextUrl.pathname.startsWith('/api/') && !isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized - Please log in' },
      { status: 401 }
    );
  }

  // Redirect authenticated users away from login page
  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Redirect unauthenticated users to login
  if (!isLoginPage && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};
