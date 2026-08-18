import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeOrgRequest(request);
    const { id } = await params;

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [{ id }, { publicId: id }, { receiptNumber: id }],
        organizationId: auth.organizationId,
      },
      include: {
        student: {
          include: { class: true },
        },
        feeRecord: {
          include: { class: true },
        },
        recordedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment record not found in your organization' },
        { status: 404 }
      );
    }

    // Check for document token
    const doc = await prisma.document.findFirst({
      where: {
        referenceId: payment.id,
        organizationId: auth.organizationId,
        documentType: 'RECEIPT',
      },
    });

    return NextResponse.json({
      success: true,
      payment: {
        ...payment,
        documentToken: doc?.token || null,
        documentUrl: doc ? `/api/documents/${doc.token}` : null,
      },
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
