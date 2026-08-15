import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, COOKIE_NAME } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    if (user?.userId) {
      await createAuditLog({
        userId: user.userId,
        action: 'LOGOUT',
        entity: 'USER',
        entityId: user.userId,
        details: {
          email: user.email,
          name: user.name,
        },
        ipAddress: clientIp,
      });
    }

    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );

    response.cookies.delete(COOKIE_NAME);
    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    const response = NextResponse.json(
      { success: true, message: 'Logged out' },
      { status: 200 }
    );
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    if (user?.userId) {
      await createAuditLog({
        userId: user.userId,
        action: 'LOGOUT',
        entity: 'USER',
        entityId: user.userId,
        details: {
          email: user.email,
          name: user.name,
        },
        ipAddress: clientIp,
      });
    }
  } catch (err) {
    console.error('Logout logging error on GET:', err);
  }

  const loginUrl = new URL('/login', req.url);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(COOKIE_NAME);
  return response;
}
