import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { recordPayment } from '@/lib/payment-service';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);
    let userId = req.headers.get('x-user-id') || session?.userId;

    if (!userId) {
      const adminUser = await prisma.user.findFirst();
      userId = adminUser?.id;
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status')?.toUpperCase() || 'ALL';
    const search = searchParams.get('search')?.trim() || '';

    const where: any = {};

    if (status !== 'ALL' && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { utrNumber: { contains: search, mode: 'insensitive' } },
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { student: { studentCode: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const submissions = await prisma.upiSubmission.findMany({
      where,
      include: {
        student: {
          include: { class: true },
        },
        feeRecord: {
          include: { class: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 100,
    });

    const pendingCount = await prisma.upiSubmission.count({
      where: { status: 'PENDING' },
    });

    return NextResponse.json({
      success: true,
      data: submissions,
      meta: {
        total: submissions.length,
        pendingCount,
      },
    });
  } catch (error: any) {
    console.error('Fetch UPI submissions error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch payment submissions' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);
    let userId = req.headers.get('x-user-id') || session?.userId;

    if (!userId) {
      const adminUser = await prisma.user.findFirst();
      userId = adminUser?.id || undefined;
    }

    const body = await req.json();
    const { submissionId, action, rejectionReason } = body;

    if (!submissionId || !action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Valid submissionId and action (APPROVE/REJECT) are required.' },
        { status: 400 }
      );
    }

    const submission = await prisma.upiSubmission.findUnique({
      where: { id: submissionId },
      include: {
        feeRecord: true,
        student: { include: { class: true } },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: 'UPI Submission record not found.' },
        { status: 404 }
      );
    }

    if (submission.status !== 'PENDING') {
      return NextResponse.json(
        {
          success: false,
          error: `This submission has already been processed with status: ${submission.status}.`,
        },
        { status: 400 }
      );
    }

    // 1. REJECT ACTION
    if (action === 'REJECT') {
      const reason = rejectionReason?.trim() || 'Payment not found in institute bank account statement.';

      const updated = await prisma.upiSubmission.update({
        where: { id: submission.id },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
          reviewedAt: new Date(),
          reviewedByUserId: userId,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Payment proof rejected successfully. Student invoice will prompt for the correct UTR.',
        data: updated,
      });
    }

    // 2. APPROVE ACTION -> Record payment, update fee record, generate receipt
    const result = await recordPayment({
      feeRecordId: submission.feeRecordId,
      amount: submission.amount,
      paymentMethod: 'UPI',
      transactionId: submission.utrNumber,
      notes: `Online UPI Verified (UTR: ${submission.utrNumber})`,
      paymentDate: submission.submittedAt,
      recordedByUserId: userId || undefined,
    });

    const payment = result.payment;

    // Update submission record to APPROVED
    const updated = await prisma.upiSubmission.update({
      where: { id: submission.id },
      data: {
        status: 'APPROVED',
        approvedPaymentId: payment.id,
        reviewedAt: new Date(),
        reviewedByUserId: userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Payment verified & approved successfully! Receipt ${payment.receiptNumber} issued.`,
      data: {
        submission: updated,
        payment,
      },
    });
  } catch (error: any) {
    console.error('Process UPI submission error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process UPI submission' },
      { status: 500 }
    );
  }
}
