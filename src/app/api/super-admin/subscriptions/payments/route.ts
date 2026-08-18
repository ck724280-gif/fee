import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, handleApiAuthError } from '@/lib/authorization';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const body = await request.json();

    const {
      subscriptionId,
      organizationId,
      amount,
      paymentMethod = 'UPI',
      referenceNumber,
      notes,
      extendMonths = 1,
    } = body;

    if ((!subscriptionId && !organizationId) || amount === undefined || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Organization/Subscription ID and a valid payment amount are required.' },
        { status: 400 }
      );
    }

    let subscription: any = null;
    if (subscriptionId) {
      subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { organization: true },
      });
    } else if (organizationId) {
      subscription = await prisma.subscription.findFirst({
        where: { organizationId },
        include: { organization: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription record not found for this organization.' }, { status: 404 });
    }

    // Calculate new expiry date
    const currentExpiry = new Date(subscription.expiryDate);
    const now = new Date();
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + (Number(extendMonths) || 1));

    const receiptNumber = `SAAS-RC-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const payment = await prisma.$transaction(async (tx) => {
      const createdPayment = await tx.subscriptionPayment.create({
        data: {
          subscriptionId: subscription.id,
          amount: Number(amount),
          paymentDate: new Date(),
          paymentMethod: paymentMethod as any,
          referenceNumber: referenceNumber ? String(referenceNumber).trim() : receiptNumber,
          notes: notes ? String(notes).trim() : null,
          recordedByUserId: admin.userId,
        },
      });

      // Advance subscription expiry date and ensure status is ACTIVE
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          expiryDate: newExpiry,
          status: 'ACTIVE',
        },
      });

      // Also ensure organization status is ACTIVE
      await tx.organization.update({
        where: { id: subscription.organizationId },
        data: { status: 'ACTIVE' },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.userId,
          organizationId: subscription.organizationId,
          action: 'SUBSCRIPTION_PAYMENT_RECORDED',
          entity: 'SubscriptionPayment',
          entityId: createdPayment.id,
          details: {
            amount: Number(amount),
            paymentMethod,
            receiptNumber,
            referenceNumber,
            orgName: subscription.organization.name,
            extendedMonths: extendMonths,
            newExpiryDate: newExpiry.toISOString(),
          },
        },
      });

      return createdPayment;
    });

    return NextResponse.json({
      success: true,
      message: `Payment of ₹${Number(amount).toLocaleString('en-IN')} recorded successfully! Plan extended to ${newExpiry.toLocaleDateString('en-IN')}`,
      payment,
      newExpiryDate: newExpiry,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
