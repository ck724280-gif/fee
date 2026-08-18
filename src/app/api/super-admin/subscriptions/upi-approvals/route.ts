import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, handleApiAuthError } from '@/lib/authorization';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    // Retrieve all subscription payments / UTR submissions
    const payments = await prisma.subscriptionPayment.findMany({
      orderBy: { paymentDate: 'desc' },
      include: {
        subscription: {
          include: {
            organization: {
              include: {
                settings: true,
                members: {
                  include: {
                    user: { select: { id: true, name: true, email: true, mobile: true } },
                  },
                },
              },
            },
          },
        },
      },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      payments,
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
      utrNumber,
      amount,
      paymentMethod = 'UPI',
      notes,
      extendMonths = 1,
    } = body;

    if (!organizationId || !utrNumber || amount === undefined || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Organization ID, UTR Number, and a valid Amount are required.' },
        { status: 400 }
      );
    }

    const subscription = await prisma.subscription.findFirst({
      where: { organizationId },
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found for this organization.' }, { status: 404 });
    }

    // Advance expiry date
    const currentExpiry = new Date(subscription.expiryDate);
    const now = new Date();
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + (Number(extendMonths) || 1));

    const receiptNumber = `SAAS-UPI-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const payment = await prisma.$transaction(async (tx) => {
      const createdPayment = await tx.subscriptionPayment.create({
        data: {
          subscriptionId: subscription.id,
          amount: Number(amount),
          paymentDate: new Date(),
          paymentMethod: paymentMethod as any,
          referenceNumber: `UTR: ${String(utrNumber).trim()}`,
          notes: notes ? `Approved UPI UTR: ${String(notes).trim()}` : `Approved UPI UTR (${receiptNumber})`,
          recordedByUserId: admin.userId,
        },
      });

      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          expiryDate: newExpiry,
          status: 'ACTIVE',
        },
      });

      await tx.organization.update({
        where: { id: subscription.organizationId },
        data: { status: 'ACTIVE' },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.userId,
          organizationId: subscription.organizationId,
          action: 'SUPER_ADMIN_APPROVED_SUBSCRIPTION_UPI',
          entity: 'SubscriptionPayment',
          entityId: createdPayment.id,
          details: {
            utrNumber,
            amount: Number(amount),
            newExpiryDate: newExpiry.toISOString(),
            orgName: subscription.organization.name,
          },
        },
      });

      return createdPayment;
    });

    return NextResponse.json({
      success: true,
      message: `UPI Payment (UTR: ${utrNumber}) approved! Plan extended to ${newExpiry.toLocaleDateString('en-IN')}`,
      payment,
      newExpiryDate: newExpiry,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
