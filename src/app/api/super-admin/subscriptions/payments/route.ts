import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, handleApiAuthError } from '@/lib/authorization';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const body = await request.json();

    const {
      subscriptionId,
      amount,
      paymentMethod = 'UPI',
      referenceNumber,
      notes,
    } = body;

    if (!subscriptionId || amount === undefined || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Subscription ID and a valid payment amount are required.' },
        { status: 400 }
      );
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { organization: true },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription record not found' }, { status: 404 });
    }

    const payment = await prisma.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        amount: Number(amount),
        paymentDate: new Date(),
        paymentMethod: paymentMethod as any,
        referenceNumber: referenceNumber ? String(referenceNumber).trim() : null,
        notes: notes ? String(notes).trim() : null,
        recordedByUserId: admin.userId,
      },
    });

    // Ensure subscription status is ACTIVE
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'ACTIVE' },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.userId,
        organizationId: subscription.organizationId,
        action: 'SUBSCRIPTION_PAYMENT_RECORDED',
        entity: 'SubscriptionPayment',
        entityId: payment.id,
        details: { amount, paymentMethod, referenceNumber, orgName: subscription.organization.name },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription payment recorded successfully',
      payment,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
