import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createStudentSchema, studentQuerySchema } from '@/lib/validations/student';
import { generateStudentCode, generateStudentBillingRecords, formatYMD } from '@/lib/billing-engine';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const query = studentQuerySchema.parse(searchParams);

    const where: any = {};

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
        studentCode: s.studentCode,
        name: s.name,
        fatherName: s.fatherName,
        motherName: s.motherName,
        guardianName: s.guardianName,
        mobile: s.mobile,
        whatsappNumber: s.whatsappNumber,
        address: s.address,
        dob: s.dob,
        gender: s.gender,
        school: s.school,
        classId: s.classId,
        className: s.class.name,
        classDefaultFee,
        feeMode: s.feeMode,
        customMonthlyFee: s.customMonthlyFee,
        actualMonthlyFee,
        admissionFee: s.admissionFee,
        discountType: s.discountType,
        discountValue: s.discountValue,
        admissionDate: s.admissionDate,
        joiningDate: s.joiningDate,
        status: s.status,
        totalBilled,
        totalPaid,
        totalOutstanding,
        latestFeeStatus: latestFeeRecord?.status || 'UPCOMING',
        createdAt: s.createdAt,
      };
    });

    let totalOutstandingSum = 0;
    let activeStudentsCount = 0;
    allMatchingForSummary.forEach((s) => {
      if (s.status === 'ACTIVE') activeStudentsCount++;
      s.feeRecords.forEach((f) => {
        totalOutstandingSum += f.outstandingAmount;
      });
    });

    const totalPages = Math.ceil(total / query.limit) || 1;

    return NextResponse.json({
      success: true,
      data: {
        students: formattedStudents,
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages,
          hasNextPage: query.page < totalPages,
          hasPrevPage: query.page > 1,
        },
        summary: {
          totalStudents: total,
          activeStudents: activeStudentsCount,
          totalOutstanding: totalOutstandingSum,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createStudentSchema.parse(body);

    const cls = await prisma.class.findUnique({
      where: { id: validatedData.classId },
    });

    if (!cls) {
      return NextResponse.json(
        { success: false, error: 'Selected class does not exist' },
        { status: 404 }
      );
    }

    const admissionDate = new Date(validatedData.admissionDate);
    const admissionYear = admissionDate.getFullYear() || new Date().getFullYear();

    const studentCode = await generateStudentCode(prisma, admissionYear);

    const student = await prisma.student.create({
      data: {
        studentCode,
        name: validatedData.name,
        fatherName: validatedData.fatherName,
        motherName: validatedData.motherName || null,
        guardianName: validatedData.guardianName || null,
        mobile: validatedData.mobile,
        whatsappNumber: validatedData.whatsappNumber || null,
        address: validatedData.address || null,
        dob: validatedData.dob ? new Date(validatedData.dob) : null,
        gender: validatedData.gender,
        school: validatedData.school || null,
        classId: validatedData.classId,
        admissionDate,
        joiningDate: validatedData.joiningDate ? new Date(validatedData.joiningDate) : admissionDate,
        feeMode: validatedData.feeMode,
        customMonthlyFee: validatedData.feeMode === 'CUSTOM' ? validatedData.customMonthlyFee : null,
        admissionFee: validatedData.admissionFee,
        discountType: validatedData.discountType,
        discountValue: validatedData.discountValue,
        status: validatedData.status,
      },
      include: {
        class: true,
      },
    });

    let initialBilling = { created: 0, skipped: 0 };
    if (validatedData.autoGenerateFees) {
      initialBilling = await generateStudentBillingRecords(prisma, student.id, {
        currentDate: new Date(),
      });
    }

    await prisma.auditLog.create({
      data: {
        action: 'STUDENT_CREATED',
        entity: 'STUDENT',
        entityId: student.id,
        details: {
          studentCode,
          name: student.name,
          className: cls.name,
          feeMode: student.feeMode,
          admissionDate: formatYMD(admissionDate),
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Student registered successfully',
        data: {
          student,
          initialBilling,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create student' },
      { status: 400 }
    );
  }
}
