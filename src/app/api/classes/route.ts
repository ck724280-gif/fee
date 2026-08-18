import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClassSchema, classFilterSchema } from '@/lib/validations/class';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(req);

    const url = new URL(req.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const query = classFilterSchema.parse(searchParams);

    const where: any = {
      organizationId: auth.organizationId,
    };
    if (query.status) {
      where.status = query.status;
    }
    if (query.search && query.search.trim()) {
      where.name = { contains: query.search.trim(), mode: 'insensitive' };
    }

    let classes = await prisma.class.findMany({
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

    // If organization has no classes yet, auto-provision standard default classes
    if (classes.length === 0 && !query.search) {
      const defaultClasses = [
        { name: 'Class 5', defaultMonthlyFee: 500, defaultAdmissionFee: 200 },
        { name: 'Class 6', defaultMonthlyFee: 600, defaultAdmissionFee: 250 },
        { name: 'Class 7', defaultMonthlyFee: 700, defaultAdmissionFee: 300 },
        { name: 'Class 8', defaultMonthlyFee: 800, defaultAdmissionFee: 350 },
        { name: 'Class 9', defaultMonthlyFee: 900, defaultAdmissionFee: 400 },
        { name: 'Class 10', defaultMonthlyFee: 1000, defaultAdmissionFee: 500 },
      ];

      for (const dc of defaultClasses) {
        await prisma.class.create({
          data: {
            organizationId: auth.organizationId,
            name: dc.name,
            defaultMonthlyFee: dc.defaultMonthlyFee,
            defaultAdmissionFee: dc.defaultAdmissionFee,
            status: 'ACTIVE',
          },
        });
      }

      classes = await prisma.class.findMany({
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
    }

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
  } catch (error) {
    return handleApiAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(req, { allowedRoles: ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'] });

    const body = await req.json();
    const validatedData = createClassSchema.parse(body);

    const existing = await prisma.class.findFirst({
      where: {
        name: validatedData.name,
        organizationId: auth.organizationId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Class with name "${validatedData.name}" already exists in your organization` },
        { status: 409 }
      );
    }

    const newClass = await prisma.class.create({
      data: {
        organizationId: auth.organizationId,
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
        userId: auth.userId,
        organizationId: auth.organizationId,
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
  } catch (error) {
    return handleApiAuthError(error);
  }
}
