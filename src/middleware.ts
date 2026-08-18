import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'edu_saas_token';
const LEGACY_COOKIE_NAME = 'dpr_auth_token';
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'edu-saas-jwt-secret-key-2026-production-edge';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

// Public route prefixes that do not require authentication
const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/2fa/verify',
  '/api/documents/',
  '/api/fees/submit-utr',
  '/api/verify',
];

const PUBLIC_PAGE_PREFIXES = [
  '/login',
  '/super-admin/login',
  '/register',
  '/fees/',
  '/receipts/',
  '/invoices/',
  '/verify',
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
    return addSecurityHeaders(NextResponse.next());
  }

  // 3. Check if route is a public Page route (e.g. /login, /register, /super-admin/login, /fees/[id])
  const isPublicPage = PUBLIC_PAGE_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(prefix)
  );

  // 4. Extract token from primary cookie, legacy cookie, or Authorization header
  let token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    token = request.cookies.get(LEGACY_COOKIE_NAME)?.value;
  }
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

  // 6. Handling for Public Pages (e.g. /login, /register, /super-admin/login)
  if (isPublicPage) {
    // If already authenticated and visiting login or register, redirect
    if (authPayload && (pathname === '/login' || pathname === '/register' || pathname === '/super-admin/login')) {
      if (authPayload.isSuperAdmin) {
        return NextResponse.redirect(new URL('/super-admin', request.url));
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // 7. Super Admin Route Protection
  if (pathname.startsWith('/super-admin') || pathname.startsWith('/api/super-admin')) {
    if (pathname === '/super-admin/login') {
      return addSecurityHeaders(NextResponse.next());
    }

    if (!authPayload || !authPayload.isSuperAdmin) {
      if (pathname.startsWith('/api/')) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: 'Forbidden. Super Admin access required.', code: 'SUPER_ADMIN_REQUIRED' },
            { status: 403 }
          )
        );
      }
      return NextResponse.redirect(new URL('/super-admin/login', request.url));
    }
  }

  // 8. Unauthenticated Handling for Protected Routes
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
        response.cookies.delete(LEGACY_COOKIE_NAME);
      }
      return addSecurityHeaders(response);
    }

    // Page requests redirect to /login with redirect query param
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    const response = NextResponse.redirect(loginUrl);
    if (token) {
      response.cookies.delete(COOKIE_NAME);
      response.cookies.delete(LEGACY_COOKIE_NAME);
    }
    return addSecurityHeaders(response);
  }

  // 9. Authenticated request: Pass user & organization claims downstream in request headers
  const requestHeaders = new Headers(request.headers);
  const userId = authPayload.userId || authPayload.sub || '';
  requestHeaders.set('x-user-id', String(userId));
  requestHeaders.set('x-user-email', String(authPayload.email || ''));
  requestHeaders.set('x-user-role', String(authPayload.role || 'ORGANIZATION_ADMIN'));
  requestHeaders.set('x-organization-id', String(authPayload.organizationId || ''));
  if (authPayload.name) {
    requestHeaders.set('x-user-name', String(authPayload.name));
  }
  if (authPayload.isSuperAdmin) {
    requestHeaders.set('x-is-super-admin', 'true');
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('x-user-id', String(userId));
  response.headers.set('x-user-email', String(authPayload.email || ''));
  response.headers.set('x-user-role', String(authPayload.role || 'ORGANIZATION_ADMIN'));
  response.headers.set('x-organization-id', String(authPayload.organizationId || ''));
  if (authPayload.name) {
    response.headers.set('x-user-name', String(authPayload.name));
  }
  if (authPayload.isSuperAdmin) {
    response.headers.set('x-is-super-admin', 'true');
  }

  return addSecurityHeaders(response);
}

/**
 * Attaches production security headers to all responses.
 */
function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files, _next, favicon
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
