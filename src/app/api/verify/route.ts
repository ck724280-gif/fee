import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { formatDate } from '@/lib/utils';

function maskName(name: string): string {
  if (!name) return 'Anonymous';
  const parts = name.trim().split(/\s+/);
  return parts
    .map((part) => {
      if (part.length <= 1) return part;
      return part.charAt(0) + '*'.repeat(Math.max(1, part.length - 1));
    })
    .join(' ');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Verification query parameter is required' },
        { status: 400 }
      );
    }

    // 1. Search in Payments (by receiptNumber or transactionId/UTR)
    let payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { receiptNumber: { equals: query, mode: 'insensitive' } },
          { transactionId: { equals: query, mode: 'insensitive' } },
        ],
      },
      include: {
        student: { include: { class: true } },
        feeRecord: true,
      },
    });

    let docToken: string | null = null;

    // 2. If not found in payments, check Documents by token
    if (!payment) {
      const doc = await prisma.document.findUnique({
        where: { token: query },
        include: {
          student: { include: { class: true } },
        },
      });

      if (doc) {
        docToken = doc.token;
        if (doc.documentType === 'RECEIPT') {
          payment = await prisma.payment.findUnique({
            where: { id: doc.referenceId },
            include: {
              student: { include: { class: true } },
              feeRecord: true,
            },
          });
        } else if (doc.documentType === 'REMINDER') {
          const fee = await prisma.feeRecord.findUnique({
            where: { id: doc.referenceId },
            include: {
              student: { include: { class: true } },
              class: true,
            },
          });

          if (fee && fee.student) {
            const rawSign = `${fee.id}:${fee.student.studentCode}:${fee.outstandingAmount}:${fee.dueDate.toISOString()}`;
            const signatureHash = crypto.createHash('sha256').update(rawSign).digest('hex');

            return NextResponse.json({
              success: true,
              data: {
                documentType: 'Official Fee Notice',
                referenceCode: fee.id.substring(0, 8).toUpperCase(),
                studentCode: fee.student.studentCode,
                maskedStudentName: maskName(fee.student.name),
                className: fee.class.name,
                amount: fee.outstandingAmount,
                paymentMethod: 'PAYMENT NOTICE',
                utrNumber: null,
                paymentDate: formatDate(fee.dueDate),
                signatureHash,
                documentToken: doc.token,
                verifiedAt: new Date().toUTCString(),
              },
            });
          }
        }
      }
    }

    if (!payment || !payment.student) {
      return NextResponse.json(
        {
          success: false,
          error: `No official receipt or notice found matching "${query}". Please check the receipt number or token.`,
        },
        { status: 404 }
      );
    }

    // Find receipt document token if not already found
    if (!docToken) {
      const doc = await prisma.document.findFirst({
        where: { referenceId: payment.id, documentType: 'RECEIPT' },
      });
      if (doc) docToken = doc.token;
    }

    // Compute cryptographic SHA-256 signature
    const rawSignData = `${payment.receiptNumber}:${payment.student.studentCode}:${payment.amount}:${payment.paymentDate.toISOString()}:${payment.transactionId || 'NONE'}`;
    const signatureHash = crypto.createHash('sha256').update(rawSignData).digest('hex');

    return NextResponse.json({
      success: true,
      data: {
        documentType: 'Official Payment Receipt',
        receiptNumber: payment.receiptNumber,
        studentCode: payment.student.studentCode,
        maskedStudentName: maskName(payment.student.name),
        className: payment.student.class?.name || 'Enrolled Class',
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        utrNumber: payment.transactionId || null,
        paymentDate: formatDate(payment.paymentDate),
        signatureHash,
        documentToken: docToken,
        verifiedAt: new Date().toUTCString(),
      },
    });
  } catch (error: any) {
    console.error('Verify API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}
