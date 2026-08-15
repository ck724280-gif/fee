import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateStudentBillingRecords, generateBatchBillingRecords } from '@/lib/billing-engine';
import { generateFeesSchema } from '@/lib/validations/fee';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is acceptable (defaults to batch active generation)
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
    const userId = request.headers.get('x-user-id') || null;

    if (studentId) {
      const result = await generateStudentBillingRecords(prisma, studentId, {
        throughDate,
        currentDate,
      });

      await createAuditLog({
        userId,
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

      return NextResponse.json(
        {
          success: true,
          message: `Generated ${result.created} billing record(s), skipped ${result.skipped} existing`,
          data: result,
        },
        { status: 200 }
      );
    } else {
      const result = await generateBatchBillingRecords(prisma, {
        classId,
        throughDate,
        currentDate,
      });

      await createAuditLog({
        userId,
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

      return NextResponse.json(
        {
          success: true,
          message: `Batch generation complete: ${result.created} created, ${result.skipped} skipped across ${result.totalProcessed} active student(s)`,
          data: result,
        },
        { status: 200 }
      );
    }
  } catch (err: any) {
    console.error('Error generating billing records:', err);
    const status = err.message?.includes('not found') ? 404 : 400;
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'An unexpected error occurred during fee generation',
      },
      { status }
    );
  }
}

