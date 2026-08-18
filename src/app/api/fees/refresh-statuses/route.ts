import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deriveFeeStatus, startOfDay } from '@/lib/billing-engine';
import { FeeStatus } from '@prisma/client';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(req);

    let currentDateInput: string | undefined = undefined;
    try {
      const body = await req.json();
      currentDateInput = body.currentDate;
    } catch {
      // Empty body is allowed, defaults to now
    }

    const evalDate = startOfDay(currentDateInput ? new Date(currentDateInput) : new Date());

    const feeRecords = await prisma.feeRecord.findMany({
      where: {
        organizationId: auth.organizationId,
        status: { in: [FeeStatus.UPCOMING, FeeStatus.DUE] },
        outstandingAmount: { gt: 0 },
      },
      include: {
        class: true,
      },
    });

    let updatedCount = 0;
    for (const fee of feeRecords) {
      const newStatus = deriveFeeStatus(
        {
          paidAmount: fee.paidAmount,
          totalAmount: fee.totalAmount,
          dueDate: fee.dueDate,
          status: fee.status,
        },
        evalDate,
        fee.class.graceDays
      );

      if (newStatus !== fee.status) {
        await prisma.feeRecord.update({
          where: { id: fee.id },
          data: { status: newStatus },
        });
        updatedCount++;
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        organizationId: auth.organizationId,
        action: 'FEE_STATUSES_REFRESHED',
        entity: 'FEE_RECORD',
        details: {
          evaluatedCount: feeRecords.length,
          updatedCount,
          currentDate: evalDate.toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Refreshed ${updatedCount} fee record statuses`,
      data: {
        evaluated: feeRecords.length,
        updated: updatedCount,
      },
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
