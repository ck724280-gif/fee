import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { feeId, utrNumber } = body;

    // 1. Validate required input
    if (!feeId || typeof feeId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Fee record ID is required.' },
        { status: 400 }
      );
    }

    const cleanUtr = utrNumber ? String(utrNumber).trim() : '';

    if (!cleanUtr || cleanUtr.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid UPI Reference / UTR number (at least 6 characters).' },
        { status: 400 }
      );
    }

    // 2. Fetch Fee Record and Student
    const feeRecord = await prisma.feeRecord.findUnique({
      where: { id: feeId },
      include: {
        student: { include: { class: true } },
        class: true,
      },
    });

    if (!feeRecord || !feeRecord.student) {
      return NextResponse.json(
        { success: false, error: 'Invoice or Fee record not found.' },
        { status: 404 }
      );
    }

    if (feeRecord.status === 'PAID' || feeRecord.outstandingAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'This invoice has already been fully paid and settled.' },
        { status: 400 }
      );
    }

    // 3. Check for Duplicate UTR in already settled payments in this organization
    const existingPayment = await prisma.payment.findFirst({
      where: {
        organizationId: feeRecord.organizationId,
        transactionId: { equals: cleanUtr, mode: 'insensitive' },
      },
    });

    if (existingPayment) {
      return NextResponse.json(
        {
          success: false,
          error: `This UTR/Reference ID (${cleanUtr}) has already been approved and recorded for Receipt ${existingPayment.receiptNumber}. If this is an error, please contact the institute admin.`,
        },
        { status: 400 }
      );
    }

    // 4. Check for existing PENDING submission with same UTR
    const existingPending = await prisma.upiSubmission.findFirst({
      where: {
        feeRecordId: feeRecord.id,
        organizationId: feeRecord.organizationId,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      if (existingPending.utrNumber === cleanUtr) {
        return NextResponse.json({
          success: true,
          pending: true,
          submission: existingPending,
          message: 'Payment proof already submitted and is currently pending admin verification.',
        });
      }
      // Update pending submission with new UTR if student made a typo
      const updated = await prisma.upiSubmission.update({
        where: { id: existingPending.id },
        data: {
          utrNumber: cleanUtr,
          submittedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        pending: true,
        submission: updated,
        message: 'Updated payment UTR proof submitted successfully. Waiting for admin approval.',
      });
    }

    // 5. Create new Pending UPI Submission with organizationId
    const submission = await prisma.upiSubmission.create({
      data: {
        organizationId: feeRecord.organizationId,
        feeRecordId: feeRecord.id,
        studentId: feeRecord.studentId,
        utrNumber: cleanUtr,
        amount: feeRecord.outstandingAmount,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      pending: true,
      submission,
      message: 'Payment proof submitted successfully! The admin will verify the UTR with institute bank records and issue your official receipt.',
    });
  } catch (error: any) {
    console.error('Submit UTR API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit payment proof.' },
      { status: 500 }
    );
  }
}
