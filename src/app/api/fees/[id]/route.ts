import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateFeeRecordSchema } from '@/lib/validations/fee';
import { FeeStatus } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const feeRecord = await prisma.feeRecord.findUnique({
      where: { id },
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
          error: `Fee record with ID ${id} not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: feeRecord,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Error fetching fee record:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to fetch fee record',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const existing = await prisma.feeRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Fee record with ID ${id} not found`,
        },
        { status: 404 }
      );
    }

    const { status, notes, lateFeeAmount } = validation.data;
    const updateData: any = {};

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    let currentTotal = existing.totalAmount;
    let currentPaid = existing.paidAmount;

    if (lateFeeAmount !== undefined) {
      updateData.lateFeeAmount = lateFeeAmount;
      currentTotal =
        existing.baseAmount -
        existing.discountAmount +
        existing.admissionFeeAmount +
        lateFeeAmount;
      updateData.totalAmount = currentTotal;
      updateData.outstandingAmount = Math.max(0, currentTotal - currentPaid);
    }

    if (status !== undefined) {
      updateData.status = status;
      if (status === FeeStatus.WAIVED || status === FeeStatus.CANCELLED) {
        // Excused or cancelled fees have 0 outstanding balance
        updateData.outstandingAmount = 0;
      } else if (status === FeeStatus.PAID) {
        updateData.outstandingAmount = 0;
      }
    }

    const updated = await prisma.feeRecord.update({
      where: { id },
      data: updateData,
      include: {
        student: {
          select: { id: true, name: true, studentCode: true },
        },
        class: {
          select: { id: true, name: true },
        },
        payments: true,
      },
    });

    const userId = request.headers.get('x-user-id') || null;
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'FEE_RECORD_UPDATED',
        entity: 'FEE_RECORD',
        entityId: id,
        details: {
          changes: validation.data,
          studentCode: updated.student?.studentCode,
          newStatus: updated.status,
          newOutstanding: updated.outstandingAmount,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Fee record updated successfully',
        data: updated,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Error updating fee record:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to update fee record',
      },
      { status: 500 }
    );
  }
}
