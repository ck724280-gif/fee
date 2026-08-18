import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { approveUpiSubmission, rejectUpiSubmission } from '@/lib/payment-service';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(req);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status')?.toUpperCase() || 'ALL';
    const search = searchParams.get('search')?.trim() || '';

    const where: any = {
      organizationId: auth.organizationId,
    };

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

    const [submissions, pendingCount] = await Promise.all([
      prisma.upiSubmission.findMany({
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
      }),
      prisma.upiSubmission.count({
        where: {
          organizationId: auth.organizationId,
          status: 'PENDING',
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: submissions,
      meta: {
        total: submissions.length,
        pendingCount,
      },
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(req);

    const body = await req.json();
    const { submissionId, action, rejectionReason } = body;

    if (!submissionId || !action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Valid submissionId and action (APPROVE/REJECT) are required.' },
        { status: 400 }
      );
    }

    if (action === 'APPROVE') {
      const result = await approveUpiSubmission(
        submissionId,
        auth.organizationId,
        auth.userId
      );

      return NextResponse.json({
        success: true,
        message: `UPI payment approved successfully! Receipt ${result.receiptNumber} generated.`,
        data: result,
      });
    } else {
      const result = await rejectUpiSubmission(
        submissionId,
        auth.organizationId,
        rejectionReason || 'Invalid UTR or payment not received.',
        auth.userId
      );

      return NextResponse.json({
        success: true,
        message: 'UPI payment proof was rejected.',
        data: result,
      });
    }
  } catch (error) {
    return handleApiAuthError(error);
  }
}
