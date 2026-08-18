import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, handleApiAuthError } from '@/lib/authorization';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const subscriptions = await prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            organizationType: true,
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      subscriptions,
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
      organizationId,
      plan = 'BASIC',
      pricePerCycle = 0,
      billingCycle = 'MONTHLY',
      startDate,
      expiryDate,
      status = 'ACTIVE',
      notes,
    } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const calculatedExpiry = expiryDate ? new Date(expiryDate) : new Date();
    if (!expiryDate) {
      if (billingCycle === 'YEARLY') {
        calculatedExpiry.setFullYear(calculatedExpiry.getFullYear() + 1);
      } else if (billingCycle === 'QUARTERLY') {
        calculatedExpiry.setMonth(calculatedExpiry.getMonth() + 3);
      } else {
        calculatedExpiry.setMonth(calculatedExpiry.getMonth() + 1);
      }
    }

    const subscription = await prisma.subscription.create({
      data: {
        organizationId: org.id,
        plan: plan as any,
        pricePerCycle: Number(pricePerCycle) || 0,
        billingCycle: billingCycle as any,
        startDate: startDate ? new Date(startDate) : new Date(),
        expiryDate: calculatedExpiry,
        status: status as any,
        notes: notes ? String(notes).trim() : null,
        createdByUserId: admin.userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.userId,
        organizationId: org.id,
        action: 'SUBSCRIPTION_CREATED',
        entity: 'Subscription',
        entityId: subscription.id,
        details: { plan, pricePerCycle, billingCycle, status },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription plan created/updated successfully',
      subscription,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
