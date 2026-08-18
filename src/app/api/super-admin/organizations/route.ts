import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, handleApiAuthError } from '@/lib/authorization';
import { hashPassword } from '@/lib/auth';

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  return `${base || 'org'}-${randomSuffix}`;
}

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, mobile: true } },
          },
        },
        settings: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            students: true,
            classes: true,
            feeRecords: true,
            payments: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      organizations,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const body = await request.json();

    const {
      name,
      organizationType = 'PRIVATE_TUITION',
      ownerName,
      ownerEmail,
      ownerMobile,
      ownerPassword,
      plan = 'BASIC',
      pricePerCycle = 0,
      billingCycle = 'MONTHLY',
    } = body;

    if (!name || !ownerName || !ownerEmail || !ownerPassword) {
      return NextResponse.json(
        { error: 'Organization name, owner name, owner email, and initial password are required.' },
        { status: 400 }
      );
    }

    const sanitizedEmail = String(ownerEmail).trim().toLowerCase();
    const sanitizedOrgName = String(name).trim();

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (!user) {
      const passwordHash = await hashPassword(ownerPassword);
      user = await prisma.user.create({
        data: {
          email: sanitizedEmail,
          passwordHash,
          name: String(ownerName).trim(),
          mobile: ownerMobile ? String(ownerMobile).trim() : null,
        },
      });
    }

    const orgSlug = generateSlug(sanitizedOrgName);
    const orgPublicId = crypto.randomUUID();
    const cleanPrefix = sanitizedOrgName.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'RC';

    const expiryDate = new Date();
    if (billingCycle === 'YEARLY') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else if (billingCycle === 'QUARTERLY') {
      expiryDate.setMonth(expiryDate.getMonth() + 3);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    const newOrg = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          publicId: orgPublicId,
          name: sanitizedOrgName,
          slug: orgSlug,
          organizationType: organizationType as any,
          status: 'ACTIVE',
        },
      });

      await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: 'ORGANIZATION_ADMIN',
          status: 'ACTIVE',
        },
      });

      await tx.organizationSetting.create({
        data: {
          organizationId: org.id,
          instituteName: sanitizedOrgName,
          receiptPrefix: `${cleanPrefix}-RC`,
          feePrefix: `${cleanPrefix}-FEE`,
          currencySymbol: '₹',
          email: sanitizedEmail,
          phone: ownerMobile ? String(ownerMobile).trim() : null,
        },
      });

      await tx.subscription.create({
        data: {
          organizationId: org.id,
          plan: plan as any,
          pricePerCycle: Number(pricePerCycle) || 0,
          billingCycle: billingCycle as any,
          startDate: new Date(),
          expiryDate,
          status: 'ACTIVE',
          createdByUserId: admin.userId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.userId,
          organizationId: org.id,
          action: 'SUPER_ADMIN_CREATED_ORGANIZATION',
          entity: 'Organization',
          entityId: org.id,
          details: { name: org.name, plan, pricePerCycle, ownerEmail: user.email },
        },
      });

      return org;
    });

    return NextResponse.json({
      success: true,
      message: 'Organization created successfully by Super Admin',
      organization: newOrg,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
