/**
 * Tier 5 Adversarial Stress & Empirical Correctness Suite:
 * Authentication, JWT Cryptography, Password Hashing & Edge Middleware Route Protection
 * Author: Challenger 1 (Milestone 5)
 */

import { assertEqual, assertTrue, assertFalse, assertThrows, assertRejects } from '../assertions';
import {
  signToken,
  verifyToken,
  verifyTokenSafe,
  hashPassword,
  comparePassword,
  hashPasswordSync,
  comparePasswordSync,
  createSession,
  COOKIE_NAME,
  COOKIE_OPTIONS,
  JWT_SECRET_STRING,
} from '../../src/lib/auth';
import { middleware } from '../../src/middleware';
import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

export async function runAuthMiddlewareEmpiricalStressSuite() {
  console.log('\n================================================================================');
  console.log('  CHALLENGER 1 (M5): AUTHENTICATION & EDGE MIDDLEWARE ROUTE PROTECTION STRESS SUITE');
  console.log('================================================================================\n');

  let total = 0;
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    total++;
    try {
      await fn();
      console.log(`  ✔ PASS [${total}]: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✖ FAIL [${total}]: ${name}`);
      console.error(`     Error: ${err.message || err}`);
      failed++;
    }
  }

  const SECRET_BYTES = new TextEncoder().encode(JWT_SECRET_STRING);

  // ============================================================================
  // SECTION 1: JWT TOKEN GENERATION, VALIDATION, TAMPERING & EXPIRY
  // ============================================================================

  await test('AUTH-STRESS-01: Valid signed JWT verifies correctly with complete claims', async () => {
    const payload = {
      userId: 'usr_admin_001',
      email: 'admin@dprtuition.com',
      role: 'ADMIN',
      name: 'DPR Admin',
    };
    const token = await signToken(payload, '2h');
    assertTrue(typeof token === 'string' && token.split('.').length === 3, 'Token must be standard 3-part JWT');

    const decoded = await verifyToken(token);
    assertEqual(decoded.userId, 'usr_admin_001');
    assertEqual(decoded.email, 'admin@dprtuition.com');
    assertEqual(decoded.role, 'ADMIN');
    assertEqual(decoded.name, 'DPR Admin');
    assertTrue(decoded.exp !== undefined && decoded.exp > Math.floor(Date.now() / 1000));
  });

  await test('AUTH-STRESS-02: Expired JWT token (-1s / -1h) is rejected with expiration error', async () => {
    const expiredToken = await new SignJWT({
      userId: 'usr_admin_expired',
      email: 'expired@dprtuition.com',
      role: 'ADMIN',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('usr_admin_expired')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(SECRET_BYTES);

    await assertRejects(
      async () => {
        await verifyToken(expiredToken);
      },
      'exp'
    );

    const safeResult = await verifyTokenSafe(expiredToken);
    assertEqual(safeResult, null, 'verifyTokenSafe must return null for expired tokens');
  });

  await test('AUTH-STRESS-03: Tampered payload claims (role elevation to SUPERADMIN) invalidates HMAC signature', async () => {
    const legitimateToken = await signToken({
      userId: 'usr_regular_002',
      email: 'teacher@dprtuition.com',
      role: 'TEACHER',
      name: 'Teacher',
    });

    const [headerB64, payloadB64, sigB64] = legitimateToken.split('.');
    const decodedPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    
    // Attacker modifies role claim to ADMIN/SUPERADMIN
    decodedPayload.role = 'SUPERADMIN';
    decodedPayload.userId = 'usr_admin_001';
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(decodedPayload)).toString('base64url');
    const tamperedToken = `${headerB64}.${tamperedPayloadB64}.${sigB64}`;

    await assertRejects(
      async () => {
        await verifyToken(tamperedToken);
      },
      'signature'
    );

    const safeResult = await verifyTokenSafe(tamperedToken);
    assertEqual(safeResult, null, 'verifyTokenSafe must return null for tampered signature');
  });

  await test('AUTH-STRESS-04: Token signed with unauthorized / foreign secret key is rejected', async () => {
    const foreignSecret = new TextEncoder().encode('an-attacker-crafted-secret-key-that-does-not-match-institute');
    const forgedToken = await new SignJWT({
      userId: 'usr_admin_forged',
      email: 'hacker@evil.com',
      role: 'ADMIN',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('usr_admin_forged')
      .setIssuedAt()
      .setExpirationTime('1d')
      .sign(foreignSecret);

    await assertRejects(
      async () => {
        await verifyToken(forgedToken);
      },
      'signature'
    );

    const safeResult = await verifyTokenSafe(forgedToken);
    assertEqual(safeResult, null);
  });

  await test('AUTH-STRESS-05: Algorithm confusion attack ("none" algorithm or missing alg) is blocked', async () => {
    const maliciousHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ userId: 'admin', email: 'admin@dpr.com', role: 'ADMIN' })).toString('base64url');
    const algNoneToken = `${maliciousHeader}.${payload}.`;

    await assertRejects(
      async () => {
        await verifyToken(algNoneToken);
      },
      ''
    );

    const safeResult = await verifyTokenSafe(algNoneToken);
    assertEqual(safeResult, null);
  });

  await test('AUTH-STRESS-06: Malformed, truncated, garbage and empty token strings fail safely', async () => {
    const malformedTokens = [
      '',
      '   ',
      'not-a-jwt',
      'header.payload', // 2 parts
      'header.payload.signature.extra', // 4 parts
      'header.payload.',
      '.payload.signature',
      '%%%invalidbase64%%%.@@@invalid@@@.!!!sig!!!',
      'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0', // prefix included in raw token string
    ];

    for (const badToken of malformedTokens) {
      const safe = await verifyTokenSafe(badToken);
      assertEqual(safe, null, `Malformed token "${badToken.substring(0, 20)}" must evaluate to null`);
      await assertRejects(
        async () => {
          await verifyToken(badToken);
        },
        ''
      );
    }
  });

  // ============================================================================
  // SECTION 2: PASSWORD HASHING, COMPARISON & ATTACK RESILIENCE
  // ============================================================================

  await test('AUTH-STRESS-07: bcrypt password hashing generates salt and validates correctly', async () => {
    const plaintext = 'DPR@SecurePass2026!';
    const hash = await hashPassword(plaintext);
    assertTrue(hash.startsWith('$2'), 'Hash must be valid bcrypt string');

    const isValid = await comparePassword(plaintext, hash);
    assertTrue(isValid, 'Valid password must compare to true');

    const isWrongValid = await comparePassword('WrongPassword123', hash);
    assertFalse(isWrongValid, 'Wrong password must compare to false');
  });

  await test('AUTH-STRESS-08: Synchronous bcrypt functions match asynchronous behavior', () => {
    const plaintext = 'DPR@SyncPassword2026!';
    const hash = hashPasswordSync(plaintext);
    assertTrue(comparePasswordSync(plaintext, hash));
    assertFalse(comparePasswordSync('WrongPassword', hash));
    assertFalse(comparePasswordSync('', hash));
  });

  await test('AUTH-STRESS-09: Password verification is strictly case-sensitive', async () => {
    const hash = await hashPassword('AdminPass2026');
    assertFalse(await comparePassword('adminpass2026', hash), 'Lowercase must fail');
    assertFalse(await comparePassword('ADMINPASS2026', hash), 'Uppercase must fail');
    assertTrue(await comparePassword('AdminPass2026', hash), 'Exact case must succeed');
  });

  await test('AUTH-STRESS-10: Empty, null, and undefined password inputs reject gracefully', async () => {
    const hash = await hashPassword('ValidPass123');
    assertFalse(await comparePassword('', hash));
    assertFalse(await comparePassword(null as any, hash));
    assertFalse(await comparePassword(undefined as any, hash));
    assertFalse(await comparePassword('ValidPass123', ''));
    assertFalse(await comparePassword('ValidPass123', null as any));
  });

  // ============================================================================
  // SECTION 3: EDGE MIDDLEWARE ROUTE PROTECTION — UNAUTHENTICATED ACCESS
  // ============================================================================

  await test('AUTH-STRESS-11: Unauthenticated request to protected API routes returns 401 JSON', async () => {
    const protectedApiEndpoints = [
      '/api/classes',
      '/api/classes/cls_123',
      '/api/students',
      '/api/students/stu_456',
      '/api/fees',
      '/api/fees/generate',
      '/api/fees/refresh-statuses',
      '/api/payments',
      '/api/reports/daily',
      '/api/reports/monthly',
      '/api/reports/outstanding',
      '/api/reports/export',
      '/api/audit-logs',
      '/api/dashboard/stats',
      '/api/settings',
      '/api/auth/me',
    ];

    for (const endpoint of protectedApiEndpoints) {
      const req = new NextRequest(`http://localhost:3000${endpoint}`);
      const res = await middleware(req);

      assertEqual(
        res.status,
        401,
        `Expected HTTP 401 for unauthenticated request to ${endpoint}, got ${res.status}`
      );

      const contentType = res.headers.get('content-type') || '';
      assertTrue(
        contentType.includes('application/json'),
        `Expected application/json response for ${endpoint}, got ${contentType}`
      );

      const body = await res.json();
      assertEqual(body.error, 'Unauthorized');
      assertEqual(body.code, 'AUTH_REQUIRED');
    }
  });

  await test('AUTH-STRESS-12: Unauthenticated request to protected Dashboard pages returns 307 Redirect to /login', async () => {
    const protectedPages = [
      { path: '/', expectedRedirect: '/login' },
      { path: '/students', expectedRedirect: '/login?redirect=%2Fstudents' },
      { path: '/students/stu_001', expectedRedirect: '/login?redirect=%2Fstudents%2Fstu_001' },
      { path: '/classes', expectedRedirect: '/login?redirect=%2Fclasses' },
      { path: '/fees', expectedRedirect: '/login?redirect=%2Ffees' },
      { path: '/payments', expectedRedirect: '/login?redirect=%2Fpayments' },
      { path: '/reports', expectedRedirect: '/login?redirect=%2Freports' },
      { path: '/settings', expectedRedirect: '/login?redirect=%2Fsettings' },
    ];

    for (const item of protectedPages) {
      const req = new NextRequest(`http://localhost:3000${item.path}`);
      const res = await middleware(req);

      assertEqual(
        res.status,
        307,
        `Expected HTTP 307 redirect for unauthenticated page ${item.path}, got ${res.status}`
      );

      const location = res.headers.get('location') || '';
      assertTrue(
        location.includes(item.expectedRedirect),
        `Expected redirect location to match "${item.expectedRedirect}", got "${location}"`
      );
    }
  });

  // ============================================================================
  // SECTION 4: EDGE MIDDLEWARE ROUTE PROTECTION — PUBLIC ROUTE EXCEPTIONS
  // ============================================================================

  await test('AUTH-STRESS-13: Public API route /api/auth/login is accessible without authentication', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
    });
    const res = await middleware(req);

    // Middleware allows request through (NextResponse.next() status 200)
    assertEqual(res.status, 200);
    assertFalse(res.headers.has('location'), 'Public route must not redirect');
  });

  await test('AUTH-STRESS-14: Public API route /api/documents/[token] is accessible without authentication', async () => {
    const documentTokens = [
      '/api/documents/550e8400-e29b-41d4-a716-446655440000',
      '/api/documents/doc_receipt_9999',
      '/api/documents/download/550e8400-e29b-41d4-a716-446655440000',
      '/api/documents/reminders',
    ];

    for (const docPath of documentTokens) {
      const req = new NextRequest(`http://localhost:3000${docPath}`);
      const res = await middleware(req);

      assertEqual(res.status, 200, `Public document path ${docPath} should allow access`);
      assertFalse(res.headers.has('location'));
    }
  });

  await test('AUTH-STRESS-15: Public Page /login renders for unauthenticated users, redirects authenticated users', async () => {
    // 1. Unauthenticated visiting /login -> allowed
    const unauthReq = new NextRequest('http://localhost:3000/login');
    const unauthRes = await middleware(unauthReq);
    assertEqual(unauthRes.status, 200);
    assertFalse(unauthRes.headers.has('location'));

    // 2. Authenticated user visiting /login -> redirected to /
    const validToken = await signToken({
      userId: 'usr_admin_1',
      email: 'admin@dpr.com',
      role: 'ADMIN',
    });

    const authReq = new NextRequest('http://localhost:3000/login', {
      headers: {
        cookie: `${COOKIE_NAME}=${validToken}`,
      },
    });
    const authRes = await middleware(authReq);
    assertEqual(authRes.status, 307);
    const location = authRes.headers.get('location') || '';
    assertTrue(location.endsWith('/'), `Expected redirect to root '/', got '${location}'`);
  });

  // ============================================================================
  // SECTION 5: EDGE MIDDLEWARE — AUTHENTICATED ACCESS & DOWNSTREAM HEADERS
  // ============================================================================

  await test('AUTH-STRESS-16: Authenticated request via cookie injects user identity headers downstream', async () => {
    const validToken = await signToken({
      userId: 'usr_admin_777',
      email: 'director@dprtuition.com',
      role: 'ADMIN',
      name: 'Director DPR',
    });

    const req = new NextRequest('http://localhost:3000/api/classes', {
      headers: {
        cookie: `${COOKIE_NAME}=${validToken}`,
      },
    });

    const res = await middleware(req);
    assertEqual(res.status, 200);

    // Verify injected downstream headers
    const userIdHeader = res.headers.get('x-user-id');
    const userEmailHeader = res.headers.get('x-user-email');
    const userRoleHeader = res.headers.get('x-user-role');
    const userNameHeader = res.headers.get('x-user-name');

    assertEqual(userIdHeader, 'usr_admin_777');
    assertEqual(userEmailHeader, 'director@dprtuition.com');
    assertEqual(userRoleHeader, 'ADMIN');
    assertEqual(userNameHeader, 'Director DPR');
  });

  await test('AUTH-STRESS-17: Authenticated request via Authorization Bearer header succeeds and sets headers', async () => {
    const validToken = await signToken({
      userId: 'usr_bearer_888',
      email: 'bearer@dprtuition.com',
      role: 'ADMIN',
      name: 'Bearer User',
    });

    const req = new NextRequest('http://localhost:3000/api/payments', {
      headers: {
        authorization: `Bearer ${validToken}`,
      },
    });

    const res = await middleware(req);
    assertEqual(res.status, 200);

    assertEqual(res.headers.get('x-user-id'), 'usr_bearer_888');
    assertEqual(res.headers.get('x-user-email'), 'bearer@dprtuition.com');
    assertEqual(res.headers.get('x-user-role'), 'ADMIN');
  });

  await test('AUTH-STRESS-18: Tampered or expired cookie presented to protected API returns 401 and clears cookie', async () => {
    const expiredToken = await new SignJWT({ userId: 'u_exp', role: 'ADMIN' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(SECRET_BYTES);

    const req = new NextRequest('http://localhost:3000/api/fees', {
      headers: {
        cookie: `${COOKIE_NAME}=${expiredToken}`,
      },
    });

    const res = await middleware(req);
    assertEqual(res.status, 401);

    // Must instruct browser to delete/clear the invalid cookie
    const setCookie = res.headers.get('set-cookie') || '';
    assertTrue(
      setCookie.includes(`${COOKIE_NAME}=;`) || setCookie.includes('Max-Age=0') || setCookie.includes('Expires='),
      `Middleware should clear invalid cookie, set-cookie header: ${setCookie}`
    );
  });

  await test('AUTH-STRESS-19: Static assets and Next.js internals pass through unconditionally', async () => {
    const staticPaths = [
      '/_next/static/chunks/app/page.js',
      '/_next/image?url=logo.png',
      '/favicon.ico',
      '/static/logo.svg',
      '/images/banner.png',
      '/styles/global.css',
    ];

    for (const path of staticPaths) {
      const req = new NextRequest(`http://localhost:3000${path}`);
      const res = await middleware(req);
      assertEqual(res.status, 200, `Static path ${path} should bypass auth`);
      assertFalse(res.headers.has('location'));
    }
  });

  // ============================================================================
  // SECTION 6: SESSION CREATION & COOKIE CONFIGURATION
  // ============================================================================

  await test('AUTH-STRESS-20: createSession generates token and secure cookie settings', async () => {
    const session = await createSession({
      id: 'usr_seed_1',
      email: 'admin@dprtuition.com',
      name: 'System Admin',
      role: 'ADMIN',
    });

    assertTrue(session.token.length > 20);
    assertEqual(session.cookieName, COOKIE_NAME);
    assertTrue(session.cookieOptions.httpOnly, 'Cookie must be httpOnly');
    assertEqual(session.cookieOptions.sameSite, 'lax');
    assertEqual(session.cookieOptions.path, '/');
    assertEqual(session.cookieOptions.maxAge, 7 * 24 * 60 * 60);

    const decoded = await verifyToken(session.token);
    assertEqual(decoded.userId, 'usr_seed_1');
    assertEqual(decoded.email, 'admin@dprtuition.com');
  });

  console.log(`\n================================================================================`);
  console.log(`  Adversarial Auth & Middleware Stress Suite Finished: ${passed}/${total} passed (${failed} failed).`);
  console.log(`================================================================================\n`);

  if (failed > 0) process.exit(1);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('08_auth_middleware_empirical_stress.test.ts')) {
  runAuthMiddlewareEmpiricalStressSuite().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}
