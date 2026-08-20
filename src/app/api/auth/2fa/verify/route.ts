import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import { verifyTotpCode, decryptSecret, verifyAndConsumeRecoveryCode } from '@/lib/totp';
import { createSession, PRE_2FA_COOKIE_NAME, JWT_SECRET_STRING } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit({
      key: `2fa-verify:${ip}`,
      limit: 7,
      windowSeconds: 900,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many verification attempts. Please wait 15 minutes before trying again.',
          code: 'RATE_LIMITED',
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { code, recoveryCode } = body;

    // 1. Get pre-2FA token from cookie
    const pre2faToken = request.cookies.get(PRE_2FA_COOKIE_NAME)?.value;
    if (!pre2faToken) {
      return NextResponse.json(
        { error: '2FA session expired. Please start over from login.', code: 'SESSION_EXPIRED' },
        { status: 401 }
      );
    }

    let pre2faPayload: any;
    try {
      const { payload } = await jwtVerify(pre2faToken, JWT_SECRET, { algorithms: ['HS256'] });
      pre2faPayload = payload;
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired 2FA token. Please log in again.', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    const userId = pre2faPayload.userId;

    // 2. Fetch user and encrypted TOTP secret
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { organization: true },
        },
        totpSecret: true,
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

    // 3. Check 6-digit TOTP code
    if (code) {
      const plainSecret = decryptSecret(user.totpSecret.secretEncrypted);
      isValid = verifyTotpCode(plainSecret, String(code));
    }

    // 4. Check Recovery Code if TOTP code not provided or failed
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
        { error: 'Invalid 6-digit verification code or recovery code. Please try again.' },
        { status: 401 }
      );
    }

    // 5. Select active organization membership
    let activeMembership = user.memberships.find(
      (m) => m.status === 'ACTIVE' && m.organization.status === 'ACTIVE'
    );

    if (!activeMembership && user.isSuperAdmin) {
      const firstOrg = await prisma.organization.findFirst({ where: { status: 'ACTIVE' } });
      if (firstOrg) {
        activeMembership = {
          id: 'super-admin-virtual',
          userId: user.id,
          organizationId: firstOrg.id,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          organization: firstOrg,
        } as any;
      }
    }

    const orgId = activeMembership?.organizationId || '';
    const orgName = activeMembership?.organization.name || 'Platform';
    const orgSlug = activeMembership?.organization.slug || '';
    const role = user.isSuperAdmin ? 'SUPER_ADMIN' : activeMembership?.role || 'ORGANIZATION_ADMIN';

    // 6. Generate Full Multi-Tenant Session
    const session = await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role,
      organizationId: orgId,
      organizationName: orgName,
      organizationSlug: orgSlug,
      isSuperAdmin: user.isSuperAdmin,
      totpVerified: true,
    });

    // Record audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId: orgId || null,
          action: 'LOGIN_2FA_SUCCESS',
          entity: 'User',
          entityId: user.id,
          ipAddress: ip,
          details: { usedRecoveryCode },
        },
      });
    } catch {}

    const response = NextResponse.json({
      success: true,
      message: '2FA authentication verified successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
        isSuperAdmin: user.isSuperAdmin,
        organization: {
          id: orgId,
          name: orgName,
          slug: orgSlug,
        },
      },
    });

    response.cookies.set(session.cookieName, session.token, session.cookieOptions);
    response.cookies.delete(PRE_2FA_COOKIE_NAME);
    response.cookies.delete('dpr_auth_token');

    return response;
  } catch (error: any) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during 2FA verification.' },
      { status: 500 }
    );
  }
}
