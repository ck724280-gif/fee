import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, signToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Query user by normalized email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    if (!user) {
      await createAuditLog({
        userId: null,
        action: 'LOGIN_FAILED',
        entity: 'USER',
        details: { email: normalizedEmail, reason: 'User not found' },
        ipAddress: clientIp,
      });
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password against stored bcrypt hash
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      await createAuditLog({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'USER',
        entityId: user.id,
        details: { email: normalizedEmail, reason: 'Invalid password' },
        ipAddress: clientIp,
      });
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Issue JWT token with session claims
    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Record LOGIN_SUCCESS in AuditLog
    await createAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entity: 'USER',
      entityId: user.id,
      details: {
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ipAddress: clientIp,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: 'Authentication successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 }
    );

    // Attach httpOnly, secure cookie
    response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred during authentication',
      },
      { status: 500 }
    );
  }
}
