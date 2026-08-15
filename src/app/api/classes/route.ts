import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClassSchema, classFilterSchema } from '@/lib/validations/class';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const query = classFilterSchema.parse(searchParams);

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.search && query.search.trim()) {
      where.name = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        _count: {
          select: {
            students: { where: { status: 'ACTIVE' } },
            feeRecords: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = classes.map((c) => ({
      id: c.id,
      name: c.name,
      defaultMonthlyFee: c.defaultMonthlyFee,
      defaultAdmissionFee: c.defaultAdmissionFee,
      lateFeeEnabled: c.lateFeeEnabled,
      lateFeeType: c.lateFeeType,
      lateFeeAmount: c.lateFeeAmount,
      graceDays: c.graceDays,
      status: c.status,
      activeStudentsCount: c._count.students,
      totalFeeRecordsCount: c._count.feeRecords,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createClassSchema.parse(body);

    const existing = await prisma.class.findUnique({
      where: { name: validatedData.name },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Class with name "${validatedData.name}" already exists` },
        { status: 409 }
      );
    }

    const newClass = await prisma.class.create({
      data: {
        name: validatedData.name,
        defaultMonthlyFee: validatedData.defaultMonthlyFee,
        defaultAdmissionFee: validatedData.defaultAdmissionFee,
        lateFeeEnabled: validatedData.lateFeeEnabled,
        lateFeeType: validatedData.lateFeeType,
        lateFeeAmount: validatedData.lateFeeAmount,
        graceDays: validatedData.graceDays,
        status: validatedData.status,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CLASS_CREATED',
        entity: 'CLASS',
        entityId: newClass.id,
        details: { name: newClass.name, defaultMonthlyFee: newClass.defaultMonthlyFee },
      },
    });

    return NextResponse.json(
      { success: true, message: 'Class created successfully', data: newClass },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create class' },
      { status: 400 }
    );
  }
}
