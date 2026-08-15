import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

export const COOKIE_NAME = 'dpr_auth_token';

export const JWT_SECRET_STRING = process.env.JWT_SECRET || 'dpr-tuition-jwt-secret-key-2026-secure-edge';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | string;
  name?: string;
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

/**
 * Signs an Edge-compatible JSON Web Token using jose (HS256).
 */
export async function signToken(
  payload: Omit<AuthPayload, 'iat' | 'exp'>,
  expiresIn: string = '7d'
): Promise<string> {
  const userId = payload.userId || payload.sub || '';
  const token = await new SignJWT({
    userId,
    email: payload.email,
    role: payload.role || 'ADMIN',
    name: payload.name || 'Admin',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verifies an Edge-compatible JSON Web Token using jose (HS256).
 * Throws an error if token is expired, tampered, or invalid.
 */
export async function verifyToken(token: string): Promise<AuthPayload> {
  if (!token || typeof token !== 'string') {
    throw new Error('Token is required and must be a string');
  }

  const { payload } = await jwtVerify(token, JWT_SECRET, {
    algorithms: ['HS256'],
  });

  return {
    userId: (payload.userId as string) || (payload.sub as string),
    email: (payload.email as string) || '',
    role: (payload.role as string) || 'ADMIN',
    name: (payload.name as string) || '',
    sub: payload.sub,
    iat: payload.iat,
    exp: payload.exp,
  };
}

/**
 * Safely verifies a token without throwing, returning null if invalid or expired.
 */
export async function verifyTokenSafe(token?: string | null): Promise<AuthPayload | null> {
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Hashes a plaintext password using bcryptjs with cost factor 10.
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Synchronously hashes a plaintext password using bcryptjs.
 */
export function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password, 10);
}

/**
 * Compares a plaintext password against a bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return await bcrypt.compare(password, hash);
}

/**
 * Synchronously compares a plaintext password against a bcrypt hash.
 */
export function comparePasswordSync(password: string, hash: string): boolean {
  if (!password || !hash) return false;
  return bcrypt.compareSync(password, hash);
}

/**
 * Extracts and verifies the authenticated user from request cookies or Authorization header.
 */
export async function getCurrentUser(req?: NextRequest | Request): Promise<AuthPayload | null> {
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
export async function createSession(user: { id: string; email: string; name?: string; role?: string }) {
  const token = await signToken({
    userId: user.id,
    email: user.email,
    name: user.name || 'Admin',
    role: user.role || 'ADMIN',
  });

  return {
    token,
    cookieName: COOKIE_NAME,
    cookieOptions: COOKIE_OPTIONS,
  };
}
