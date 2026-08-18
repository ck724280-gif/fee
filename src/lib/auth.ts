import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

export const COOKIE_NAME = 'edu_saas_token';
export const PRE_2FA_COOKIE_NAME = 'edu_saas_pre_2fa';
const DEFAULT_ORG_ID = 'e0000000-0000-4000-a000-000000000001';

export const JWT_SECRET_STRING = process.env.JWT_SECRET || 'edu-saas-jwt-secret-key-2026-production-edge';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export interface AuthPayload {
  userId: string;
  id?: string;
  email: string;
  name?: string;
  role: 'SUPER_ADMIN' | 'ORGANIZATION_ADMIN' | 'ACCOUNTANT' | 'TEACHER' | 'STAFF' | string;
  organizationId: string;
  organizationSlug?: string;
  organizationName?: string;
  isSuperAdmin?: boolean;
  totpVerified?: boolean;
  sub?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
};

export const PRE_2FA_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 5 * 60, // 5 minutes only for 2FA completion
};

/**
 * Signs an Edge-compatible JSON Web Token using jose (HS256).
 */
export async function signToken(
  payload: Omit<AuthPayload, 'iat' | 'exp' | 'organizationId'> & { organizationId?: string },
  expiresIn: string = '7d'
): Promise<string> {
  const userId = payload.userId || payload.id || payload.sub || '';
  const token = await new SignJWT({
    userId,
    id: userId,
    email: payload.email,
    name: payload.name || 'User',
    role: payload.role || 'ORGANIZATION_ADMIN',
    organizationId: payload.organizationId || DEFAULT_ORG_ID,
    organizationSlug: payload.organizationSlug || '',
    organizationName: payload.organizationName || '',
    isSuperAdmin: !!payload.isSuperAdmin,
    totpVerified: !!payload.totpVerified,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Signs a short-lived pre-2FA token used strictly during the 2-step TOTP login flow.
 */
export async function signPre2faToken(payload: {
  userId: string;
  email: string;
  organizationId?: string;
  isSuperAdmin?: boolean;
}): Promise<string> {
  return await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    organizationId: payload.organizationId || DEFAULT_ORG_ID,
    isSuperAdmin: !!payload.isSuperAdmin,
    purpose: '2FA_CHALLENGE',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(JWT_SECRET);
}

/**
 * Verifies a pre-2FA token.
 */
export async function verifyPre2faToken(token: string): Promise<{
  userId: string;
  email: string;
  organizationId: string;
  isSuperAdmin?: boolean;
} | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });

    if (payload.purpose !== '2FA_CHALLENGE') {
      return null;
    }

    return {
      userId: (payload.userId as string) || (payload.sub as string),
      email: payload.email as string,
      organizationId: (payload.organizationId as string) || DEFAULT_ORG_ID,
      isSuperAdmin: Boolean(payload.isSuperAdmin),
    };
  } catch {
    return null;
  }
}

/**
 * Verifies a token and returns the parsed payload. Throws if expired or invalid.
 */
export async function verifyToken(token: string): Promise<AuthPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET, {
    algorithms: ['HS256'],
  });

  const userId = (payload.userId as string) || (payload.sub as string);

  return {
    userId,
    id: userId,
    email: payload.email as string,
    name: payload.name as string | undefined,
    role: payload.role as string,
    organizationId: (payload.organizationId as string) || DEFAULT_ORG_ID,
    organizationSlug: payload.organizationSlug as string | undefined,
    organizationName: payload.organizationName as string | undefined,
    isSuperAdmin: Boolean(payload.isSuperAdmin),
    totpVerified: Boolean(payload.totpVerified),
    sub: payload.sub,
    iat: payload.iat,
    exp: payload.exp,
  };
}

/**
 * Safe token verification helper that returns null on error without throwing.
 */
export async function verifyTokenSafe(token: string): Promise<AuthPayload | null> {
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Hashes a plaintext password using bcrypt with salt rounds = 10.
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Synchronous hash password helper
 */
export function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password, 10);
}

/**
 * Compares a plaintext password against a stored bcrypt hash.
 */
export async function verifyPassword(
  plainPassword: any,
  passwordHash: any
): Promise<boolean> {
  if (
    !plainPassword ||
    typeof plainPassword !== 'string' ||
    !passwordHash ||
    typeof passwordHash !== 'string'
  ) {
    return false;
  }
  try {
    return await bcrypt.compare(plainPassword, passwordHash);
  } catch {
    return false;
  }
}

export function verifyPasswordSync(
  plainPassword: any,
  passwordHash: any
): boolean {
  if (
    !plainPassword ||
    typeof plainPassword !== 'string' ||
    !passwordHash ||
    typeof passwordHash !== 'string'
  ) {
    return false;
  }
  try {
    return bcrypt.compareSync(plainPassword, passwordHash);
  } catch {
    return false;
  }
}

export const comparePassword = verifyPassword;
export const comparePasswordSync = verifyPasswordSync;

/**
 * Extracts and verifies the current session from NextRequest cookies or Authorization header.
 */
export async function getCurrentUser(
  req?: NextRequest | { cookies?: any; headers?: any }
): Promise<AuthPayload | null> {
  try {
    let token: string | undefined;

    if (req) {
      if ('cookies' in req && typeof req.cookies?.get === 'function') {
        token = req.cookies.get(COOKIE_NAME)?.value;
      } else if (req.headers) {
        const cookieHeader = req.headers.get('cookie');
        if (cookieHeader) {
          const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
          if (match) {
            token = decodeURIComponent(match[1]);
          }
        }
      }

      // Fallback to legacy cookie if present
      if (!token && req.headers) {
        const cookieHeader = req.headers.get('cookie');
        if (cookieHeader) {
          const match = cookieHeader.match(/(?:^|;\s*)dpr_auth_token=([^;]*)/);
          if (match) {
            token = decodeURIComponent(match[1]);
          }
        }
      }

      // Check Bearer token in Authorization header as fallback
      if (!token && req.headers) {
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7).trim();
        }
      }
    }

    if (!token) {
      return null;
    }

    return await verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Session creation helper: creates a signed token and returns cookie configuration.
 */
export async function createSession(payload: {
  userId?: string;
  id?: string;
  email: string;
  name?: string;
  role: string;
  organizationId?: string;
  organizationSlug?: string;
  organizationName?: string;
  isSuperAdmin?: boolean;
  totpVerified?: boolean;
  [key: string]: any;
}) {
  const userId = payload.userId || payload.id || '';
  const token = await signToken({
    ...payload,
    userId,
    id: userId,
    organizationId: payload.organizationId || DEFAULT_ORG_ID,
  });

  return {
    token,
    cookieName: COOKIE_NAME,
    cookieOptions: COOKIE_OPTIONS,
  };
}
