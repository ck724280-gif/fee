import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(request);

    // 1. Fetch organization with subscription & payment history
    const org = await prisma.organization.findUnique({
      where: { id: auth.organizationId },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          include: {
            payments: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        },
        settings: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const currentSub = org.subscriptions[0];

    // Calculate days remaining
    let daysLeft = 0;
    let isExpired = false;
    let isExpiringSoon = false;

    if (currentSub) {
      const now = new Date();
      const expiry = new Date(currentSub.expiryDate);
      const diffMs = expiry.getTime() - now.getTime();
      daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      isExpired = daysLeft <= 0;
      isExpiringSoon = daysLeft > 0 && daysLeft <= 7;
    }

    // 2. Fetch Super Admin Platform UPI Settings
    let platformSetting = await prisma.platformSetting.findUnique({
      where: { id: 'master_platform_config' },
    });

    if (!platformSetting) {
      platformSetting = await prisma.platformSetting.create({
        data: {
          id: 'master_platform_config',
          upiId: 'admin@dprtuition.com',
          upiPayeeName: 'DPR Tuition Platform',
          upiEnabled: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          status: org.status,
          organizationType: org.organizationType,
        },
        subscription: currentSub
          ? {
              id: currentSub.id,
              plan: currentSub.plan,
              pricePerCycle: currentSub.pricePerCycle,
              billingCycle: currentSub.billingCycle,
              startDate: currentSub.startDate,
              expiryDate: currentSub.expiryDate,
              status: currentSub.status,
              daysLeft: Math.max(0, daysLeft),
              isExpired,
              isExpiringSoon,
              payments: currentSub.payments,
            }
          : null,
        platformUpi: {
          upiId: platformSetting.upiId || 'admin@dprtuition.com',
          upiPayeeName: platformSetting.upiPayeeName || 'DPR Tuition Platform',
          upiEnabled: platformSetting.upiEnabled,
        },
      },
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
