import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPasswordReset2faToken, hashPassword } from '@/lib/auth';
import { verifyTotpCode, decryptSecret, verifyAndConsumeRecoveryCode } from '@/lib/totp';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit({
      key: `2fa-reset-verify:${ip}`,
      limit: 6,
      windowSeconds: 900,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many reset attempts. Please wait 15 minutes before trying again.',
          code: 'RATE_LIMITED',
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { resetToken, code, recoveryCode, newPassword } = body;

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Reset session token is missing or expired. Please start over.' },
        { status: 400 }
      );
    }

    if (!newPassword || String(newPassword).length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    // 1. Verify 2FA password reset token
    const tokenPayload = await verifyPasswordReset2faToken(resetToken);
    if (!tokenPayload || !tokenPayload.userId) {
      return NextResponse.json(
        { error: 'Invalid or expired password reset session. Please request a new code.' },
        { status: 401 }
      );
    }

    // 2. Fetch user and encrypted TOTP secret
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.userId },
      include: {
        totpSecret: true,
        memberships: { include: { organization: true } },
      },
    });

    if (!user || !user.totpSecret || !user.totpSecret.isEnabled) {
      return NextResponse.json(
        { error: 'Two-factor authentication is not active on this account.' },
        { status: 400 }
      );
    }

    let isValid = false;
    let usedRecoveryCode = false;

    // 3. Verify TOTP 6-digit code
    if (code && String(code).trim().length === 6) {
      const plainSecret = decryptSecret(user.totpSecret.secretEncrypted);
      isValid = verifyTotpCode(plainSecret, String(code).trim());
    }

    // 4. Verify Recovery Code if TOTP not valid or not supplied
    if (!isValid && recoveryCode) {
      const recoveryResult = verifyAndConsumeRecoveryCode(
        user.totpSecret.recoveryCodesEncrypted,
        String(recoveryCode)
      );

      if (recoveryResult.isValid && recoveryResult.updatedEncryptedPayload) {
        isValid = true;
        usedRecoveryCode = true;
        await prisma.totpSecret.update({
          where: { userId: user.id },
          data: { recoveryCodesEncrypted: recoveryResult.updatedEncryptedPayload },
        });
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid 6-digit Authenticator code or Backup Recovery Code. Please try again.' },
        { status: 401 }
      );
    }

    // 5. Hash new password securely with bcrypt
    const passwordHash = await hashPassword(String(newPassword));

    // 6. Update user password in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        updatedAt: new Date(),
      },
    });

    // 7. Create security audit log
    try {
      const orgId = user.memberships?.[0]?.organizationId || null;
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId: orgId,
          action: 'PASSWORD_RESET_VIA_2FA',
          entity: 'User',
          entityId: user.id,
          ipAddress: ip,
          details: {
            method: usedRecoveryCode ? 'BACKUP_RECOVERY_CODE' : 'GOOGLE_AUTHENTICATOR_TOTP',
            email: user.email,
          },
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully! You can now log in with your new credentials.',
      email: user.email,
      isSuperAdmin: !!user.isSuperAdmin,
    });
  } catch (error: any) {
    console.error('Password reset verify error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while resetting password.' },
      { status: 500 }
    );
  }
}
