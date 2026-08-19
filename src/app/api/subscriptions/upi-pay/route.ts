import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(request, {
      allowedRoles: ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'],
    });

    const body = await request.json();
    const { utrNumber, amount, durationMonths, plan } = body;

    if (!utrNumber || String(utrNumber).trim().length < 6) {
      return NextResponse.json(
        { error: 'Please enter a valid 12-digit UPI Transaction / UTR Number.' },
        { status: 400 }
      );
    }

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than 0.' },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: auth.organizationId },
      include: {
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    let sub = org.subscriptions[0];

    // If no subscription exists, create one in PENDING state
    if (!sub) {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + (Number(durationMonths) || 1));

      sub = await prisma.subscription.create({
        data: {
          organizationId: org.id,
          plan: plan || 'BASIC',
          pricePerCycle: Number(amount),
          startDate: new Date(),
          expiryDate,
          status: 'PENDING',
          createdByUserId: auth.userId,
        },
      });
    }

    // Generate receipt number
    const receiptNumber = `SAAS-UPI-${Date.now().toString().slice(-6)}`;

    // Create SubscriptionPayment record with PENDING status (awaiting super admin approval)
    const payment = await prisma.subscriptionPayment.create({
      data: {
        subscriptionId: sub.id,
        amount: Number(amount),
        paymentMethod: 'UPI',
        referenceNumber: String(utrNumber).trim(),
        status: 'PENDING',
        notes: `Renewal request: ${durationMonths || 1} month(s) via UPI UTR: ${String(utrNumber).trim()}`,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        organizationId: org.id,
        action: 'INSTITUTE_SUBMITTED_UPI_MEMBERSHIP_PAYMENT',
        entity: 'SubscriptionPayment',
        entityId: payment.id,
        details: {
          utrNumber: String(utrNumber).trim(),
          amount: Number(amount),
          durationMonths: durationMonths || 1,
          orgName: org.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'UPI payment submitted successfully! Super Admin will verify and activate your membership shortly.',
      payment,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
