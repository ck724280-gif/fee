import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { createStudentSchema, studentQuerySchema } from '@/lib/validations/student';
import { generateStudentCode, generateStudentBillingRecords, formatYMD } from '@/lib/billing-engine';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(req);

    const url = new URL(req.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const query = studentQuerySchema.parse(searchParams);

    const where: any = {
      organizationId: auth.organizationId,
    };

    if (query.classId) {
      where.classId = query.classId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.feeMode) {
      where.feeMode = query.feeMode;
    }
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { studentCode: { contains: term, mode: 'insensitive' } },
        { mobile: { contains: term } },
        { fatherName: { contains: term, mode: 'insensitive' } },
        { school: { contains: term, mode: 'insensitive' } },
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [total, students, allMatchingForSummary] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        include: {
          class: {
            select: {
              id: true,
              name: true,
              defaultMonthlyFee: true,
              defaultAdmissionFee: true,
            },
          },
          feeRecords: {
            select: {
              totalAmount: true,
              paidAmount: true,
              outstandingAmount: true,
              status: true,
            },
          },
        },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip,
        take: query.limit,
      }),
      prisma.student.findMany({
        where,
        select: {
          status: true,
          feeRecords: {
            select: {
              outstandingAmount: true,
            },
          },
        },
      }),
    ]);

    const formattedStudents = students.map((s) => {
      const classDefaultFee = s.class.defaultMonthlyFee;
      const actualMonthlyFee = s.feeMode === 'CUSTOM' && s.customMonthlyFee !== null
        ? s.customMonthlyFee
        : classDefaultFee;

      let totalBilled = 0;
      let totalPaid = 0;
      let totalOutstanding = 0;

      s.feeRecords.forEach((f) => {
        totalBilled += f.totalAmount;
        totalPaid += f.paidAmount;
        totalOutstanding += f.outstandingAmount;
      });

      const latestFeeRecord = s.feeRecords[s.feeRecords.length - 1];

      return {
        id: s.id,
        publicId: s.publicId,
        studentCode: s.studentCode,
        name: s.name,
        fatherName: s.fatherName,
        motherName: s.motherName,
        guardianName: s.guardianName,
        mobile: s.mobile,
        whatsappNumber: s.whatsappNumber,
        address: s.address,
        dob: s.dob ? formatYMD(s.dob) : null,
        gender: s.gender,
        school: s.school,
        classId: s.classId,
        className: s.class.name,
        admissionDate: formatYMD(s.admissionDate),
        joiningDate: s.joiningDate ? formatYMD(s.joiningDate) : null,
        feeMode: s.feeMode,
        classDefaultFee,
        actualMonthlyFee,
        customMonthlyFee: s.customMonthlyFee,
        admissionFee: s.admissionFee,
        discountType: s.discountType,
        discountValue: s.discountValue,
        status: s.status,
        totalBilled,
        totalPaid,
        totalOutstanding,
        currentFeeStatus: latestFeeRecord ? latestFeeRecord.status : 'UPCOMING',
        createdAt: s.createdAt,
      };
    });

    let activeCount = 0;
    let inactiveCount = 0;
    let totalOutstandingAll = 0;

    allMatchingForSummary.forEach((s) => {
      if (s.status === 'ACTIVE') activeCount++;
      if (s.status === 'INACTIVE') inactiveCount++;
      s.feeRecords.forEach((f) => {
        totalOutstandingAll += f.outstandingAmount;
      });
    });

    return NextResponse.json({
      data: formattedStudents,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
      summary: {
        totalStudents: total,
        activeStudents: activeCount,
        inactiveStudents: inactiveCount,
        totalOutstanding: totalOutstandingAll,
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
    const validatedData = createStudentSchema.parse(body);

    // Verify class belongs to this organization (prevents IDOR)
    const targetClass = await prisma.class.findFirst({
      where: {
        id: validatedData.classId,
        organizationId: auth.organizationId,
      },
    });

    if (!targetClass) {
      return NextResponse.json(
        { error: 'Selected Class does not exist in your organization.' },
        { status: 400 }
      );
    }

    const admissionDate = new Date(validatedData.admissionDate);
    const joiningDate = validatedData.joiningDate ? new Date(validatedData.joiningDate) : null;
    const dob = validatedData.dob ? new Date(validatedData.dob) : null;

    const studentCode = await generateStudentCode(
      prisma,
      auth.organizationId,
      admissionDate.getFullYear()
    );

    const student = await prisma.$transaction(async (tx) => {
      const createdStudent = await tx.student.create({
        data: {
          publicId: crypto.randomUUID(),
          organizationId: auth.organizationId,
          studentCode,
          name: validatedData.name,
          fatherName: validatedData.fatherName,
          motherName: validatedData.motherName || null,
          guardianName: validatedData.guardianName || null,
          mobile: validatedData.mobile,
          whatsappNumber: validatedData.whatsappNumber || null,
          address: validatedData.address || null,
          dob,
          gender: validatedData.gender,
          school: validatedData.school || null,
          classId: validatedData.classId,
          admissionDate,
          joiningDate,
          feeMode: validatedData.feeMode,
          customMonthlyFee: validatedData.feeMode === 'CUSTOM' ? validatedData.customMonthlyFee : null,
          admissionFee: validatedData.admissionFee ?? targetClass.defaultAdmissionFee,
          discountType: validatedData.discountType,
          discountValue: validatedData.discountValue,
          status: 'ACTIVE',
        },
        include: {
          class: true,
        },
      });

      // Automatically generate initial billing cycle
      await generateStudentBillingRecords(tx, createdStudent.id, auth.organizationId, {
        throughDate: new Date(),
      });

      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          organizationId: auth.organizationId,
          action: 'STUDENT_CREATED',
          entity: 'Student',
          entityId: createdStudent.id,
          details: {
            name: createdStudent.name,
            studentCode: createdStudent.studentCode,
            className: targetClass.name,
            feeMode: createdStudent.feeMode,
          },
        },
      });

      return createdStudent;
    });

    return NextResponse.json(
      {
        success: true,
        data: student,
        message: 'Student created successfully with automated initial billing cycle',
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiAuthError(error);
  }
}
