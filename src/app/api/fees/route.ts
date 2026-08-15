import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { feeFilterSchema } from '@/lib/validations/fee';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const parsed = feeFilterSchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid filter parameters',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      classId,
      studentId,
      status,
      startDate,
      endDate,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    } = parsed.data;

    const where: Prisma.FeeRecordWhereInput = {};

    if (classId) {
      where.classId = classId;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) {
        where.dueDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.dueDate.lte = new Date(endDate);
      }
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.student = {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { studentCode: { contains: searchTerm, mode: 'insensitive' } },
          { mobile: { contains: searchTerm } },
        ],
      };
    }

    const skip = (page - 1) * limit;

    const [total, feeRecords, aggregations] = await Promise.all([
      prisma.feeRecord.count({ where }),
      prisma.feeRecord.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              studentCode: true,
              name: true,
              mobile: true,
              whatsappNumber: true,
              feeMode: true,
              status: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              defaultMonthlyFee: true,
            },
          },
          payments: {
            select: {
              id: true,
              receiptNumber: true,
              amount: true,
              paymentMethod: true,
              paymentDate: true,
            },
            orderBy: { paymentDate: 'desc' },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.feeRecord.aggregate({
        where,
        _sum: {
          totalAmount: true,
          paidAmount: true,
          outstandingAmount: true,
          lateFeeAmount: true,
          discountAmount: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json(
      {
        success: true,
        data: {
          feeRecords,
          pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
          summary: {
            totalBilled: aggregations._sum.totalAmount || 0,
            totalPaid: aggregations._sum.paidAmount || 0,
            totalOutstanding: aggregations._sum.outstandingAmount || 0,
            totalLateFees: aggregations._sum.lateFeeAmount || 0,
            totalDiscounts: aggregations._sum.discountAmount || 0,
          },
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Error fetching fee records:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to fetch fee records',
      },
      { status: 500 }
    );
  }
}
