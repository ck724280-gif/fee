import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateFeeRecordSchema } from '@/lib/validations/fee';
import { FeeStatus } from '@prisma/client';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeOrgRequest(request);
    const { id } = await params;

    const feeRecord = await prisma.feeRecord.findFirst({
      where: {
        id,
        organizationId: auth.organizationId,
      },
      include: {
        student: {
          include: {
            class: true,
          },
        },
        class: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: {
            recordedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!feeRecord) {
      return NextResponse.json(
        {
          success: false,
          error: `Fee record with ID ${id} not found in your organization`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: feeRecord,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeOrgRequest(request);
    const { id } = await params;
    const body = await request.json();

    const validation = updateFeeRecordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const existing = await prisma.feeRecord.findFirst({
      where: {
        id,
        organizationId: auth.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Fee record with ID ${id} not found in your organization`,
        },
        { status: 404 }
      );
    }

    const { status, notes, lateFeeAmount } = validation.data;
    const updateData: any = {};

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (lateFeeAmount !== undefined) {
      const parsedLateFee = Number(lateFeeAmount);
      const totalAmount = existing.baseAmount + existing.admissionFeeAmount - existing.discountAmount + parsedLateFee;
      const outstandingAmount = Math.max(0, totalAmount - existing.paidAmount);

      updateData.lateFeeAmount = parsedLateFee;
      updateData.totalAmount = totalAmount;
      updateData.outstandingAmount = outstandingAmount;
    }

    if (status !== undefined) {
      updateData.status = status as FeeStatus;
    }

    const updated = await prisma.feeRecord.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        organizationId: auth.organizationId,
        action: 'FEE_RECORD_UPDATED',
        entity: 'FeeRecord',
        entityId: id,
        details: { previous: existing, updated: updateData },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
