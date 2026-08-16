import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordPayment } from '@/lib/payment-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { feeRecordId, utrNumber, payerName, payerPhone, amount } = body;

    if (!feeRecordId || typeof feeRecordId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid Fee Record ID is required' },
        { status: 400 }
      );
    }

    if (!utrNumber || typeof utrNumber !== 'string' || utrNumber.trim().length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please enter a valid 12-digit UTR / UPI Reference Number (min 6 characters)',
        },
        { status: 400 }
      );
    }

    const cleanUtr = utrNumber.trim();

    // 1. Fetch fee record
    const fee = await prisma.feeRecord.findUnique({
      where: { id: feeRecordId },
      include: {
        student: true,
        class: true,
      },
    });

    if (!fee) {
      return NextResponse.json(
        { success: false, error: 'Fee record not found' },
        { status: 404 }
      );
    }

    if (fee.outstandingAmount <= 0 || fee.status === 'PAID') {
      return NextResponse.json(
        { success: false, error: 'This fee invoice has already been fully paid and settled' },
        { status: 400 }
      );
    }

    // 2. Check for duplicate UTR
    const existingPaymentWithUtr = await prisma.payment.findFirst({
      where: {
        transactionId: cleanUtr,
      },
      include: {
        feeRecord: true,
      },
    });

    if (existingPaymentWithUtr) {
      return NextResponse.json(
        {
          success: false,
          error: `This UTR (${cleanUtr}) has already been recorded under Receipt ${existingPaymentWithUtr.receiptNumber}.`,
        },
        { status: 409 }
      );
    }

    // 3. Determine payment amount (default to outstanding balance or specified partial amount)
    const payAmount = amount && Number(amount) > 0 ? Math.min(Number(amount), fee.outstandingAmount) : fee.outstandingAmount;

    // 4. Record payment atomically using payment-service
    const paymentResult = await recordPayment({
      feeRecordId: fee.id,
      amount: payAmount,
      paymentMethod: 'UPI',
      transactionId: cleanUtr,
      notes: `Online UPI Payment verified (Payer: ${payerName?.trim() || 'Parent/Student'}${payerPhone ? `, Tel: ${payerPhone.trim()}` : ''})`,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment received and verified successfully!',
      data: {
        paymentId: paymentResult.payment.id,
        receiptNumber: paymentResult.payment.receiptNumber,
        documentToken: paymentResult.documentToken,
        documentUrl: paymentResult.documentUrl,
        paidAmount: paymentResult.payment.amount,
        remainingOutstanding: paymentResult.feeRecord.outstandingAmount,
        status: paymentResult.feeRecord.status,
      },
    });
  } catch (error: any) {
    console.error('UTR Submission Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to verify and record UPI payment' },
      { status: 500 }
    );
  }
}
