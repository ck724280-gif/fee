import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { verifyTotpCode, decryptSecret } from '@/lib/totp';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    const dbSecret = await prisma.totpSecret.findUnique({
      where: { userId: user.userId },
    });

    if (!dbSecret) {
      return NextResponse.json(
        { error: 'No 2FA setup in progress. Please start setup again.' },
        { status: 400 }
      );
    }

    const plainSecret = decryptSecret(dbSecret.secretEncrypted);
    const isValid = verifyTotpCode(plainSecret, String(code));

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid 6-digit code. Please verify the code from Google Authenticator and try again.' },
        { status: 400 }
      );
    }

    // Enable 2FA
    await prisma.totpSecret.update({
      where: { userId: user.userId },
      data: {
        isEnabled: true,
        verifiedAt: new Date(),
      },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          organizationId: user.organizationId || null,
          action: '2FA_ENABLED',
          entity: 'User',
          entityId: user.userId,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication has been enabled successfully! Your account is now secured.',
    });
  } catch (error: any) {
    console.error('2FA confirmation error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while confirming 2FA.' },
      { status: 500 }
    );
  }
}
