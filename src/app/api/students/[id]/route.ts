import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateStudentSchema } from '@/lib/validations/student';
import { formatYMD, startOfDay } from '@/lib/billing-engine';
import { buildWhatsAppUrl, generateFeeReminderMessage } from '@/lib/whatsapp';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        class: true,
        feeRecords: {
          include: {
            payments: {
              select: {
                id: true,
                receiptNumber: true,
                amount: true,
                paymentMethod: true,
                paymentDate: true,
                transactionId: true,
              },
            },
          },
          orderBy: { billingPeriodStart: 'asc' },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: {
            feeRecord: {
              select: {
                billingPeriodStart: true,
                billingPeriodEnd: true,
              },
            },
          },
        },
        documents: {
          where: { documentType: 'RECEIPT' },
          select: {
            token: true,
            referenceId: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const settings = await prisma.instituteSetting.findFirst();

    const classDefaultFee = student.class.defaultMonthlyFee;
    const actualMonthlyFee = student.feeMode === 'CUSTOM' && student.customMonthlyFee !== null
      ? student.customMonthlyFee
      : classDefaultFee;

    let discountAmount = 0;
    if (student.discountType === 'FIXED') {
      discountAmount = Math.min(student.discountValue, actualMonthlyFee);
    } else if (student.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((actualMonthlyFee * student.discountValue) / 100);
    }
    const effectiveMonthlyFee = Math.max(0, actualMonthlyFee - discountAmount);

    let totalBilled = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let overdueAmount = 0;
    let paidCyclesCount = 0;
    let partialCyclesCount = 0;
    let dueCyclesCount = 0;
    let overdueCyclesCount = 0;

    student.feeRecords.forEach((f) => {
      totalBilled += f.totalAmount;
      totalPaid += f.paidAmount;
      totalOutstanding += f.outstandingAmount;
      if (f.status === 'OVERDUE') {
        overdueAmount += f.outstandingAmount;
        overdueCyclesCount++;
      } else if (f.status === 'PAID') {
        paidCyclesCount++;
      } else if (f.status === 'PARTIALLY_PAID') {
        partialCyclesCount++;
      } else if (f.status === 'DUE') {
        dueCyclesCount++;
      }
    });

    const feeTimeline = student.feeRecords.map((f, idx) => {
      const startStr = formatYMD(new Date(f.billingPeriodStart));
      const endStr = formatYMD(new Date(f.billingPeriodEnd));
      const dueStr = formatYMD(new Date(f.dueDate));

      return {
        id: f.id,
        cycleIndex: idx,
        billingPeriodStart: f.billingPeriodStart,
        billingPeriodEnd: f.billingPeriodEnd,
        billingPeriodStr: `${startStr} to ${endStr}`,
        dueDate: f.dueDate,
        dueDateStr: dueStr,
        baseAmount: f.baseAmount,
        admissionFeeAmount: f.admissionFeeAmount,
        discountAmount: f.discountAmount,
        lateFeeAmount: f.lateFeeAmount,
        totalAmount: f.totalAmount,
        paidAmount: f.paidAmount,
        outstandingAmount: f.outstandingAmount,
        status: f.status,
        notes: f.notes || `Cycle ${idx + 1} (${startStr} to ${endStr})`,
        payments: f.payments.map((p) => ({
          id: p.id,
          receiptNumber: p.receiptNumber,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          paymentDate: p.paymentDate,
          transactionId: p.transactionId,
        })),
      };
    });

    const documentMap = new Map(student.documents.map((d) => [d.referenceId, d.token]));

    const paymentHistory = student.payments.map((p) => {
      const periodStr = p.feeRecord
        ? `${formatYMD(new Date(p.feeRecord.billingPeriodStart))} to ${formatYMD(new Date(p.feeRecord.billingPeriodEnd))}`
        : 'N/A';

      return {
        id: p.id,
        receiptNumber: p.receiptNumber,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        transactionId: p.transactionId,
        notes: p.notes,
        paymentDate: p.paymentDate,
        feeRecordId: p.feeRecordId,
        feePeriod: periodStr,
        documentToken: documentMap.get(p.id) || null,
        documentUrl: documentMap.has(p.id) ? `/api/documents/${documentMap.get(p.id)}` : null,
      };
    });

    // Find latest unpaid fee record for quick action
    const latestUnpaidFee = student.feeRecords.find((f) => f.outstandingAmount > 0);
    let whatsappReminderUrl: string | undefined = undefined;

    const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin || 'http://localhost:3000';

    if (latestUnpaidFee && (student.whatsappNumber || student.mobile)) {
      const phone = student.whatsappNumber || student.mobile;
      const msg = generateFeeReminderMessage({
        studentName: student.name,
        className: student.class.name,
        dueAmount: latestUnpaidFee.outstandingAmount,
        dueDateStr: formatYMD(new Date(latestUnpaidFee.dueDate)),
        billingPeriodStr: `${formatYMD(new Date(latestUnpaidFee.billingPeriodStart))} to ${formatYMD(new Date(latestUnpaidFee.billingPeriodEnd))}`,
        documentUrl: `${origin}/fees/${latestUnpaidFee.id}`,
        instituteName: settings?.instituteName || 'DPR Private Tuition',
        contactPhone: settings?.phone || settings?.whatsapp || '+91 98765 43210',
      });
      whatsappReminderUrl = buildWhatsAppUrl(phone, msg);
    }

    return NextResponse.json({
      success: true,
      data: {
        instituteSettings: settings,
        student: {
          id: student.id,
          studentCode: student.studentCode,
          name: student.name,
          fatherName: student.fatherName,
          motherName: student.motherName,
          guardianName: student.guardianName,
          mobile: student.mobile,
          whatsappNumber: student.whatsappNumber,
          address: student.address,
          dob: student.dob,
          gender: student.gender,
          school: student.school,
          classId: student.classId,
          class: {
            id: student.class.id,
            name: student.class.name,
            defaultMonthlyFee: student.class.defaultMonthlyFee,
            defaultAdmissionFee: student.class.defaultAdmissionFee,
            lateFeeEnabled: student.class.lateFeeEnabled,
          },
          admissionDate: student.admissionDate,
          joiningDate: student.joiningDate,
          feeMode: student.feeMode,
          customMonthlyFee: student.customMonthlyFee,
          admissionFee: student.admissionFee,
          discountType: student.discountType,
          discountValue: student.discountValue,
          status: student.status,
          createdAt: student.createdAt,
        },
        feeConfiguration: {
          classDefaultFee,
          studentFeeMode: student.feeMode,
          customMonthlyFee: student.customMonthlyFee,
          actualMonthlyFee,
          discountType: student.discountType,
          discountValue: student.discountValue,
          discountAmount,
          effectiveMonthlyFee,
          admissionFee: student.admissionFee,
        },
        financialSummary: {
          totalBilled,
          totalPaid,
          totalOutstanding,
          overdueAmount,
          totalCyclesCount: student.feeRecords.length,
          paidCyclesCount,
          partialCyclesCount,
          dueCyclesCount,
          overdueCyclesCount,
        },
        feeTimeline,
        paymentHistory,
        actions: {
          latestDueFeeRecordId: latestUnpaidFee?.id || null,
          hasPendingBalance: totalOutstanding > 0,
          whatsappReminderUrl,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch student 360 profile' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validatedData = updateStudentSchema.parse(body);

    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const updatePayload: any = { ...validatedData };
    if (validatedData.dob) {
      updatePayload.dob = new Date(validatedData.dob);
    }
    if (validatedData.admissionDate) {
      updatePayload.admissionDate = new Date(validatedData.admissionDate);
    }
    if (validatedData.joiningDate) {
      updatePayload.joiningDate = new Date(validatedData.joiningDate);
    }
    if (validatedData.feeMode === 'DEFAULT') {
      updatePayload.customMonthlyFee = null;
    }

    const updated = await prisma.student.update({
      where: { id },
      data: updatePayload,
      include: { class: true },
    });

    await prisma.auditLog.create({
      data: {
        action: 'STUDENT_UPDATED',
        entity: 'STUDENT',
        entityId: id,
        details: { changes: validatedData },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Student updated successfully',
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update student' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            payments: true,
            feeRecords: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    // Perform cascade deletion in atomic transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete associated documents
      await tx.document.deleteMany({ where: { studentId: id } });
      // 2. Delete associated payments
      await tx.payment.deleteMany({ where: { studentId: id } });
      // 3. Delete associated fee records
      await tx.feeRecord.deleteMany({ where: { studentId: id } });
      // 4. Delete the student record
      await tx.student.delete({ where: { id } });

      // 5. Create audit log
      await tx.auditLog.create({
        data: {
          action: 'STUDENT_DELETED',
          entity: 'STUDENT',
          entityId: id,
          details: {
            studentCode: student.studentCode,
            name: student.name,
            deletedPaymentsCount: student._count.payments,
            deletedFeeRecordsCount: student._count.feeRecords,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Student "${student.name}" (${student.studentCode}) and all associated records deleted successfully`,
    });
  } catch (error: any) {
    console.error('Failed to delete student:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete student' },
      { status: 500 }
    );
  }
}
