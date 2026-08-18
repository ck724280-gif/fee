import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateStudentBillingRecords, generateBatchBillingRecords } from '@/lib/billing-engine';
import { generateFeesSchema } from '@/lib/validations/fee';
import { createAuditLog } from '@/lib/audit';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(request);

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is acceptable
    }

    const validation = generateFeesSchema.safeParse(body);
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

    const { studentId, classId, throughDate, currentDate } = validation.data;

    if (studentId) {
      const result = await generateStudentBillingRecords(prisma, studentId, auth.organizationId, {
        throughDate,
        currentDate,
      });

      await createAuditLog({
        userId: auth.userId,
        organizationId: auth.organizationId,
        action: 'FEE_GENERATED',
        entity: 'FEE_RECORD',
        entityId: studentId,
        details: {
          studentId,
          created: result.created,
          skipped: result.skipped,
          throughDate: throughDate ? new Date(throughDate).toISOString() : null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Generated ${result.created} billing record(s), skipped ${result.skipped} existing`,
        data: result,
      });
    } else {
      const result = await generateBatchBillingRecords(prisma, auth.organizationId, {
        classId,
        throughDate,
        currentDate,
      });

      await createAuditLog({
        userId: auth.userId,
        organizationId: auth.organizationId,
        action: 'FEE_BATCH_GENERATED',
        entity: 'FEE_RECORD',
        details: {
          classId: classId || null,
          created: result.created,
          skipped: result.skipped,
          totalProcessed: result.totalProcessed,
          throughDate: throughDate ? new Date(throughDate).toISOString() : null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Batch generation complete: ${result.created} created, ${result.skipped} skipped across ${result.totalProcessed} active student(s)`,
        data: result,
      });
    }
  } catch (error) {
    return handleApiAuthError(error);
  }
}
