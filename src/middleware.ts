import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'dpr_auth_token';
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'dpr-tuition-jwt-secret-key-2026-secure-edge';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

// Public route prefixes that do not require authentication
const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/documents/',
  '/api/settings',
];

const PUBLIC_PAGE_PREFIXES = [
  '/login',
  '/fees/',
  '/receipts/',
  '/invoices/',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow Next.js internal assets, static files, and icons
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Check if route is a public API route
  const isPublicApi = PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isPublicApi) {
    return NextResponse.next();
  }

  // 3. Check if route is a public Page route (e.g. /login, /fees/[id])
  const isPublicPage = PUBLIC_PAGE_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(prefix)
  );

  // 4. Extract token from cookie or Authorization header
  let token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  // 5. Verify token if present
  let authPayload: any = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET, {
        algorithms: ['HS256'],
      });
      authPayload = payload;
    } catch {
      // Invalid or expired token
      authPayload = null;
    }
  }

  // 6. Handling for Public Pages (e.g. /login, /fees/[id])
  if (isPublicPage) {
    // Only redirect to main dashboard if already authenticated and specifically visiting /login
    if (authPayload && pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 7. Unauthenticated Handling for Protected Routes
  if (!authPayload) {
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
      if (token) {
        response.cookies.delete(COOKIE_NAME);
      }
      return response;
    }

    // Page requests redirect to /login with redirect query param
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    const response = NextResponse.redirect(loginUrl);
    if (token) {
      response.cookies.delete(COOKIE_NAME);
    }
    return response;
  }

  // 8. Authenticated request: Pass user claims downstream in request headers
  const requestHeaders = new Headers(request.headers);
  const userId = authPayload.userId || authPayload.sub || '';
  requestHeaders.set('x-user-id', String(userId));
  requestHeaders.set('x-user-email', String(authPayload.email || ''));
  requestHeaders.set('x-user-role', String(authPayload.role || 'ADMIN'));
  if (authPayload.name) {
    requestHeaders.set('x-user-name', String(authPayload.name));
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files, _next, favicon
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
