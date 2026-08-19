import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateStudentSchema } from '@/lib/validations/student';
import { formatYMD, startOfDay } from '@/lib/billing-engine';
import { buildWhatsAppUrl, generateFeeReminderMessage } from '@/lib/whatsapp';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeOrgRequest(req);
    const { id } = await params;

    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id }, { publicId: id }],
        organizationId: auth.organizationId,
      },
      include: {
        class: true,
        feeRecords: {
          include: {
            payments: {
              select: {
                id: true,
                publicId: true,
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
        { success: false, error: 'Student not found in your organization' },
        { status: 404 }
      );
    }

    const settings = await prisma.organizationSetting.findUnique({
      where: { organizationId: auth.organizationId },
    });

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
      const startStr = formatYMD(f.billingPeriodStart);
      const endStr = formatYMD(f.billingPeriodEnd);
      const dueStr = formatYMD(f.dueDate);
      const billingPeriodStr = `${startStr} to ${endStr}`;

      const phone = student.whatsappNumber || student.mobile;
      const origin = process.env.NEXT_PUBLIC_APP_URL || '';
      const reminderMsg = generateFeeReminderMessage({
        studentName: student.name,
        className: student.class.name,
        amountDue: f.outstandingAmount,
        dueDateStr: dueStr,
        billingPeriodStr,
        documentUrl: origin ? `${origin}/fees/${f.id}` : `/fees/${f.id}`,
        instituteName: settings?.instituteName || auth.organizationName,
        contactPhone: settings?.phone || settings?.whatsapp || '',
      });
      const whatsappUrl = phone ? buildWhatsAppUrl(phone, reminderMsg) : undefined;

      return {
        id: f.id,
        cycleIndex: idx + 1,
        billingPeriodStart: startStr,
        billingPeriodEnd: endStr,
        billingPeriodStr,
        dueDate: dueStr,
        dueDateStr: dueStr,
        baseAmount: f.baseAmount,
        admissionFeeAmount: f.admissionFeeAmount,
        discountAmount: f.discountAmount,
        lateFeeAmount: f.lateFeeAmount,
        totalAmount: f.totalAmount,
        paidAmount: f.paidAmount,
        outstandingAmount: f.outstandingAmount,
        status: f.status,
        notes: f.notes,
        whatsappUrl,
        payments: f.payments.map((p) => ({
          id: p.id,
          receiptNumber: p.receiptNumber,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          paymentDate: formatYMD(p.paymentDate),
          transactionId: p.transactionId,
        })),
      };
    });

    const docTokenMap: Record<string, string> = {};
    student.documents.forEach((d) => {
      docTokenMap[d.referenceId] = d.token;
    });

    const paymentHistory = student.payments.map((p) => {
      const token = docTokenMap[p.id];
      return {
        id: p.id,
        publicId: p.publicId,
        receiptNumber: p.receiptNumber,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        transactionId: p.transactionId,
        notes: p.notes,
        paymentDate: formatYMD(p.paymentDate),
        feePeriod: p.feeRecord
          ? `${formatYMD(p.feeRecord.billingPeriodStart)} to ${formatYMD(p.feeRecord.billingPeriodEnd)}`
          : 'N/A',
        billingPeriod: p.feeRecord
          ? `${formatYMD(p.feeRecord.billingPeriodStart)} to ${formatYMD(p.feeRecord.billingPeriodEnd)}`
          : 'N/A',
        documentUrl: token ? `/api/documents/${token}` : null,
        documentToken: token || null,
      };
    });

    const nextDueRecord = student.feeRecords.find(
      (f) => f.status === 'OVERDUE' || f.status === 'DUE' || f.status === 'PARTIALLY_PAID'
    );

    const phone = student.whatsappNumber || student.mobile;
    const origin = process.env.NEXT_PUBLIC_APP_URL || '';

    const whatsappReminderUrl = phone && nextDueRecord
      ? buildWhatsAppUrl(
          phone,
          generateFeeReminderMessage({
            studentName: student.name,
            className: student.class.name,
            amountDue: nextDueRecord.outstandingAmount,
            dueDateStr: formatYMD(nextDueRecord.dueDate),
            billingPeriodStr: `${formatYMD(nextDueRecord.billingPeriodStart)} to ${formatYMD(nextDueRecord.billingPeriodEnd)}`,
            documentUrl: origin ? `${origin}/fees/${nextDueRecord.id}` : `/fees/${nextDueRecord.id}`,
            instituteName: settings?.instituteName || auth.organizationName,
            contactPhone: settings?.phone || settings?.whatsapp || '',
          })
        )
      : undefined;

    const studentPayload = {
      id: student.id,
      publicId: student.publicId,
      studentCode: student.studentCode,
      name: student.name,
      fatherName: student.fatherName,
      motherName: student.motherName,
      guardianName: student.guardianName,
      mobile: student.mobile,
      whatsappNumber: student.whatsappNumber,
      address: student.address,
      dob: student.dob ? formatYMD(student.dob) : null,
      gender: student.gender,
      school: student.school,
      classId: student.classId,
      className: student.class.name,
      class: student.class,
      admissionDate: formatYMD(student.admissionDate),
      joiningDate: student.joiningDate ? formatYMD(student.joiningDate) : null,
      feeMode: student.feeMode,
      classDefaultFee,
      actualMonthlyFee,
      customMonthlyFee: student.customMonthlyFee,
      discountType: student.discountType,
      discountValue: student.discountValue,
      discountAmount,
      effectiveMonthlyFee,
      admissionFee: student.admissionFee,
      status: student.status,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };

    const feeConfigPayload = {
      studentFeeMode: student.feeMode,
      classDefaultFee,
      actualMonthlyFee,
      customMonthlyFee: student.customMonthlyFee,
      discountType: student.discountType,
      discountValue: student.discountValue,
      discountAmount,
      effectiveMonthlyFee,
      admissionFee: student.admissionFee,
    };

    const financialSummaryPayload = {
      totalBilled,
      totalPaid,
      totalOutstanding,
      overdueAmount,
      paidCyclesCount,
      partialCyclesCount,
      dueCyclesCount,
      overdueCyclesCount,
      totalCyclesCount: student.feeRecords.length,
      nextDueDate: nextDueRecord ? formatYMD(nextDueRecord.dueDate) : null,
      nextDueAmount: nextDueRecord ? nextDueRecord.outstandingAmount : 0,
    };

    const actionsPayload = {
      hasPendingBalance: totalOutstanding > 0,
      hasOverdueBalance: overdueAmount > 0,
      canGenerateCycles: true,
      whatsappReminderUrl,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...studentPayload,
        student: studentPayload,
        feeConfiguration: feeConfigPayload,
        financialSummary: financialSummaryPayload,
        feeTimeline,
        paymentHistory,
        actions: actionsPayload,
        instituteSettings: settings,
      },
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeOrgRequest(req);
    const { id } = await params;

    const existingStudent = await prisma.student.findFirst({
      where: {
        OR: [{ id }, { publicId: id }],
        organizationId: auth.organizationId,
      },
    });

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Student not found in your organization.' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = updateStudentSchema.parse(body);

    const updated = await prisma.student.update({
      where: { id: existingStudent.id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.fatherName && { fatherName: validatedData.fatherName }),
        ...(validatedData.motherName !== undefined && { motherName: validatedData.motherName }),
        ...(validatedData.guardianName !== undefined && { guardianName: validatedData.guardianName }),
        ...(validatedData.mobile && { mobile: validatedData.mobile }),
        ...(validatedData.whatsappNumber !== undefined && { whatsappNumber: validatedData.whatsappNumber }),
        ...(validatedData.address !== undefined && { address: validatedData.address }),
        ...(validatedData.dob !== undefined && { dob: validatedData.dob ? new Date(validatedData.dob) : null }),
        ...(validatedData.gender && { gender: validatedData.gender }),
        ...(validatedData.school !== undefined && { school: validatedData.school }),
        ...(validatedData.feeMode && { feeMode: validatedData.feeMode }),
        ...(validatedData.customMonthlyFee !== undefined && {
          customMonthlyFee: validatedData.feeMode === 'CUSTOM' ? validatedData.customMonthlyFee : null,
        }),
        ...(validatedData.discountType && { discountType: validatedData.discountType }),
        ...(validatedData.discountValue !== undefined && { discountValue: validatedData.discountValue }),
        ...(validatedData.status && { status: validatedData.status }),
      },
      include: {
        class: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Student updated successfully',
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeOrgRequest(req);
    const { id } = await params;

    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id }, { publicId: id }],
        organizationId: auth.organizationId,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found in your organization' },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete Payments
      await tx.payment.deleteMany({
        where: { studentId: student.id, organizationId: auth.organizationId },
      });

      // 2. Delete UPI Submissions
      await tx.upiSubmission.deleteMany({
        where: { studentId: student.id, organizationId: auth.organizationId },
      });

      // 3. Delete Fee Records
      await tx.feeRecord.deleteMany({
        where: { studentId: student.id, organizationId: auth.organizationId },
      });

      // 4. Delete Generated Documents
      await tx.document.deleteMany({
        where: { studentId: student.id, organizationId: auth.organizationId },
      });

      // 5. Delete Student
      await tx.student.delete({
        where: { id: student.id },
      });

      // 6. Record Audit Log
      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          organizationId: auth.organizationId,
          action: 'STUDENT_DELETED',
          entity: 'Student',
          entityId: student.id,
          details: {
            name: student.name,
            studentCode: student.studentCode,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Student and all associated fee records deleted permanently',
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
