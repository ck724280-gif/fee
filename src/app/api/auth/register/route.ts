import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { hashPassword, createSession, PRE_2FA_COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  return `${base || 'org'}-${randomSuffix}`;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit({
      key: `register:${ip}`,
      limit: 5,
      windowSeconds: 3600, // 1 hour
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Too many registration attempts from this network. Please try again later.',
          code: 'RATE_LIMITED',
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      organizationName,
      organizationType = 'PRIVATE_TUITION',
      ownerName,
      email,
      mobile,
      password,
    } = body;

    // 1. Validation
    if (!organizationName || !ownerName || !email || !password) {
      return NextResponse.json(
        { error: 'Organization name, owner name, email, and password are required.' },
        { status: 400 }
      );
    }

    const sanitizedEmail = String(email).trim().toLowerCase();
    const sanitizedOrgName = String(organizationName).trim();
    const sanitizedOwnerName = String(ownerName).trim();

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // 2. Check if user email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please sign in.' },
        { status: 409 }
      );
    }

    // 3. Hash Password
    const passwordHash = await hashPassword(password);

    // 4. Generate unique IDs and prefixes
    const orgSlug = generateSlug(sanitizedOrgName);
    const orgPublicId = crypto.randomUUID();
    const cleanPrefix = sanitizedOrgName
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 4)
      .toUpperCase() || 'RC';
    const receiptPrefix = `${cleanPrefix}-RC`;
    const feePrefix = `${cleanPrefix}-FEE`;

    // 5. Execute Atomic Multi-Tenant Registration Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 5a. Create Organization
      const org = await tx.organization.create({
        data: {
          publicId: orgPublicId,
          name: sanitizedOrgName,
          slug: orgSlug,
          organizationType: organizationType as any,
          status: 'ACTIVE',
        },
      });

      // 5b. Create User
      const user = await tx.user.create({
        data: {
          email: sanitizedEmail,
          passwordHash,
          name: sanitizedOwnerName,
          mobile: mobile ? String(mobile).trim() : null,
          isSuperAdmin: false,
        },
      });

      // 5c. Create Organization Membership as ORGANIZATION_ADMIN
      const membership = await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: 'ORGANIZATION_ADMIN',
          status: 'ACTIVE',
        },
      });

      // 5d. Create Initial Organization Settings & Branding
      await tx.organizationSetting.create({
        data: {
          organizationId: org.id,
          instituteName: sanitizedOrgName,
          receiptPrefix,
          feePrefix,
          currencySymbol: '₹',
          phone: mobile ? String(mobile).trim() : null,
          email: sanitizedEmail,
          upiEnabled: false,
        },
      });

      // 5e. Create Initial Free Starter / Trial Subscription (30 days)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      await tx.subscription.create({
        data: {
          organizationId: org.id,
          plan: 'BASIC',
          pricePerCycle: 0,
          billingCycle: 'MONTHLY',
          startDate: new Date(),
          expiryDate,
          status: 'ACTIVE',
          notes: 'Standard 30-Day Starter Period',
        },
      });

      // 5f. Record Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          action: 'ORGANIZATION_REGISTERED',
          entity: 'Organization',
          entityId: org.id,
          ipAddress: ip,
          details: {
            organizationName: org.name,
            organizationType: org.organizationType,
            ownerEmail: user.email,
          },
        },
      });

      return { org, user, membership };
    });

    // 6. Create Session Token
    const session = await createSession({
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: 'ORGANIZATION_ADMIN',
      organizationId: result.org.id,
      organizationName: result.org.name,
      organizationSlug: result.org.slug,
      isSuperAdmin: false,
      totpVerified: false,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Organization registered successfully! Welcome to your fresh workspace.',
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: 'ORGANIZATION_ADMIN',
        organization: {
          id: result.org.id,
          name: result.org.name,
          slug: result.org.slug,
        },
      },
    });

    response.cookies.set(session.cookieName, session.token, session.cookieOptions);
    response.cookies.delete('dpr_auth_token');
    response.cookies.delete(PRE_2FA_COOKIE_NAME);

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during organization registration. Please try again.' },
      { status: 500 }
    );
  }
}
