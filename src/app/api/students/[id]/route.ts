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

      const phone = student.whatsappNumber || student.mobile;
      const origin = process.env.NEXT_PUBLIC_APP_URL || '';
      const reminderMsg = generateFeeReminderMessage({
        studentName: student.name,
        className: student.class.name,
        amountDue: f.outstandingAmount,
        dueDateStr: dueStr,
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
        dueDate: dueStr,
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
        billingPeriod: p.feeRecord
          ? `${formatYMD(p.feeRecord.billingPeriodStart)} to ${formatYMD(p.feeRecord.billingPeriodEnd)}`
          : 'N/A',
        documentUrl: token ? `/api/documents/${token}` : null,
      };
    });

    const nextDueRecord = student.feeRecords.find(
      (f) => f.status === 'OVERDUE' || f.status === 'DUE' || f.status === 'PARTIALLY_PAID'
    );

    return NextResponse.json({
      success: true,
      data: {
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
        financialSummary: {
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
        },
        feeTimeline,
        paymentHistory,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
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
        { success: false, error: 'Student not found in your organization' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = updateStudentSchema.parse(body);

    const updatePayload: any = {};
    if (validatedData.name !== undefined) updatePayload.name = validatedData.name;
    if (validatedData.fatherName !== undefined) updatePayload.fatherName = validatedData.fatherName;
    if (validatedData.motherName !== undefined) updatePayload.motherName = validatedData.motherName;
    if (validatedData.guardianName !== undefined) updatePayload.guardianName = validatedData.guardianName;
    if (validatedData.mobile !== undefined) updatePayload.mobile = validatedData.mobile;
    if (validatedData.whatsappNumber !== undefined) updatePayload.whatsappNumber = validatedData.whatsappNumber;
    if (validatedData.address !== undefined) updatePayload.address = validatedData.address;
    if (validatedData.dob !== undefined) updatePayload.dob = validatedData.dob ? new Date(validatedData.dob) : null;
    if (validatedData.gender !== undefined) updatePayload.gender = validatedData.gender;
    if (validatedData.school !== undefined) updatePayload.school = validatedData.school;
    if (validatedData.classId !== undefined) updatePayload.classId = validatedData.classId;
    if (validatedData.feeMode !== undefined) updatePayload.feeMode = validatedData.feeMode;
    if (validatedData.customMonthlyFee !== undefined) updatePayload.customMonthlyFee = validatedData.customMonthlyFee;
    if (validatedData.admissionFee !== undefined) updatePayload.admissionFee = validatedData.admissionFee;
    if (validatedData.discountType !== undefined) updatePayload.discountType = validatedData.discountType;
    if (validatedData.discountValue !== undefined) updatePayload.discountValue = validatedData.discountValue;
    if (validatedData.status !== undefined) updatePayload.status = validatedData.status;

    const updatedStudent = await prisma.$transaction(async (tx) => {
      const student = await tx.student.update({
        where: { id: existingStudent.id },
        data: updatePayload,
        include: { class: true },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          organizationId: auth.organizationId,
          action: 'STUDENT_UPDATED',
          entity: 'Student',
          entityId: existingStudent.id,
          details: { changes: updatePayload },
        },
      });

      return student;
    });

    return NextResponse.json({
      success: true,
      data: updatedStudent,
      message: 'Student profile updated successfully',
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
    const auth = await authorizeOrgRequest(req, { allowedRoles: ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'] });
    const { id } = await params;

    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id }, { publicId: id }],
        organizationId: auth.organizationId,
      },
      include: {
        payments: { select: { id: true } },
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found in your organization' },
        { status: 404 }
      );
    }

    // Preserve historical accounting: soft-delete if payments exist
    if (student.payments.length > 0) {
      const updated = await prisma.student.update({
        where: { id: student.id },
        data: { status: 'INACTIVE' },
      });

      await prisma.auditLog.create({
        data: {
          userId: auth.userId,
          organizationId: auth.organizationId,
          action: 'STUDENT_DEACTIVATED',
          entity: 'Student',
          entityId: student.id,
          details: { reason: 'Student deactivated due to existing financial history' },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Student has existing payment records and was safely deactivated instead of deleted.',
        data: updated,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.feeRecord.deleteMany({ where: { studentId: student.id } });
      await tx.student.delete({ where: { id: student.id } });
      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          organizationId: auth.organizationId,
          action: 'STUDENT_DELETED',
          entity: 'Student',
          entityId: student.id,
          details: { studentCode: student.studentCode, name: student.name },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Student and related records deleted successfully',
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
