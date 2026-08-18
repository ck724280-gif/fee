import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, comparePassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password is required to disable 2FA' }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isPasswordValid = await comparePassword(password, dbUser.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    await prisma.totpSecret.deleteMany({
      where: { userId: user.userId },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          organizationId: user.organizationId || null,
          action: '2FA_DISABLED',
          entity: 'User',
          entityId: user.userId,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication has been disabled.',
    });
  } catch (error: any) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while disabling 2FA.' },
      { status: 500 }
    );
  }
}
