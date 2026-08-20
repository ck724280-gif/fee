import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signPasswordReset2faToken } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit({
      key: `2fa-reset-initiate:${ip}`,
      limit: 6,
      windowSeconds: 900, // 15 mins
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many password reset requests. Please wait 15 minutes before trying again.',
          code: 'RATE_LIMITED',
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email || !String(email).trim()) {
      return NextResponse.json(
        { error: 'Registered User ID (Email) is required.' },
        { status: 400 }
      );
    }

    const sanitizedEmail = String(email).trim().toLowerCase();

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
      include: {
        totpSecret: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email address.' },
        { status: 404 }
      );
    }

    if (!user.totpSecret || !user.totpSecret.isEnabled) {
      return NextResponse.json(
        {
          error: 'Two-Step Verification (2FA) is NOT active on this account. Self-service 2FA password reset is only available for accounts with active Google Authenticator or Recovery Codes. Please contact your platform Super Administrator to reset your password.',
          has2fa: false,
          code: '2FA_NOT_ENABLED',
        },
        { status: 400 }
      );
    }

    // Sign 10-minute reset token
    const resetToken = await signPasswordReset2faToken({
      userId: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    });

    // Mask email for UI presentation (e.g. ad***@dprtuition.com)
    const [localPart, domainPart] = user.email.split('@');
    const maskedLocal =
      localPart.length <= 3
        ? `${localPart.slice(0, 1)}***`
        : `${localPart.slice(0, 2)}***${localPart.slice(-1)}`;
    const maskedEmail = `${maskedLocal}@${domainPart || 'domain.com'}`;

    return NextResponse.json({
      success: true,
      resetToken,
      maskedEmail,
      has2fa: true,
      isSuperAdmin: !!user.isSuperAdmin,
      message: 'Account verified with active 2FA. Please enter your Google Authenticator code or a Backup Recovery Code to set a new password.',
    });
  } catch (error: any) {
    console.error('Password reset initiate error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while initiating password reset.' },
      { status: 500 }
    );
  }
}
