import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, createSession, signPre2faToken, COOKIE_NAME, PRE_2FA_COOKIE_NAME, PRE_2FA_COOKIE_OPTIONS } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit({
      key: `login:${ip}`,
      limit: 7,
      windowSeconds: 900, // 15 minutes
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many login attempts. Please wait 15 minutes before trying again.',
          code: 'RATE_LIMITED',
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const sanitizedEmail = String(email).trim().toLowerCase();

    // 1. Find user in database with active memberships
    const user = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
        totpSecret: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 2. Compare password hash
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      // Record failed audit log
      try {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'FAILED_LOGIN',
            entity: 'User',
            entityId: user.id,
            ipAddress: ip,
            details: { reason: 'INVALID_PASSWORD' },
          },
        });
      } catch {}

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 3. Check if Two-Factor Authentication (TOTP) is enabled
    if (user.totpSecret && user.totpSecret.isEnabled) {
      const pre2faToken = await signPre2faToken({
        userId: user.id,
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
      });

      const response = NextResponse.json({
        requires2fa: true,
        message: 'Two-factor authentication required. Enter the 6-digit code from your authenticator app.',
        userId: user.id,
      });

      response.cookies.set(PRE_2FA_COOKIE_NAME, pre2faToken, PRE_2FA_COOKIE_OPTIONS);
      return response;
    }

    // 4. Select active organization membership
    let activeMembership = user.memberships.find(
      (m) => m.status === 'ACTIVE' && m.organization.status === 'ACTIVE'
    );

    // If Super Admin has no org membership, link to first org or allow super-admin mode
    if (!activeMembership && user.isSuperAdmin) {
      const firstOrg = await prisma.organization.findFirst({
        where: { status: 'ACTIVE' },
      });
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

    if (!activeMembership && !user.isSuperAdmin) {
      return NextResponse.json(
        {
          error: 'Your organization account is inactive or suspended. Please contact support.',
          code: 'ORG_SUSPENDED',
        },
        { status: 403 }
      );
    }

    const orgId = activeMembership?.organizationId || '';
    const orgName = activeMembership?.organization.name || 'Platform';
    const orgSlug = activeMembership?.organization.slug || '';
    const role = user.isSuperAdmin ? 'SUPER_ADMIN' : activeMembership?.role || 'ORGANIZATION_ADMIN';

    // 5. Create multi-tenant session
    const session = await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role,
      organizationId: orgId,
      organizationName: orgName,
      organizationSlug: orgSlug,
      isSuperAdmin: user.isSuperAdmin,
      totpVerified: false,
    });

    // Record login audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId: orgId || null,
          action: 'LOGIN_SUCCESS',
          entity: 'User',
          entityId: user.id,
          ipAddress: ip,
          details: { email: user.email, role },
        },
      });
    } catch {}

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
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
    // Remove legacy cookie if present
    response.cookies.delete('dpr_auth_token');
    response.cookies.delete(PRE_2FA_COOKIE_NAME);

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login. Please try again.' },
      { status: 500 }
    );
  }
}
