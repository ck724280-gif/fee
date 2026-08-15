import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { reportQuerySchema } from '@/lib/validations/report';
import {
  getMonthlyCollectionReport,
  getOverdueFeesReport,
  getClassWiseRevenueReport,
  getPaymentMethodDistributionReport,
  getStudentStatementReport,
  getAdmissionsReport,
  getDiscountReport,
  getDailyCollectionReport,
} from '@/lib/reports-service';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const query = reportQuerySchema.parse(searchParams);

    let reportData: any = null;

    switch (query.type) {
      case 'MONTHLY_COLLECTION':
        reportData = await getMonthlyCollectionReport(prisma, query);
        break;
      case 'OVERDUE_FEES':
        reportData = await getOverdueFeesReport(prisma, query);
        break;
      case 'CLASS_WISE_REVENUE':
        reportData = await getClassWiseRevenueReport(prisma, query);
        break;
      case 'PAYMENT_METHOD_DISTRIBUTION':
        reportData = await getPaymentMethodDistributionReport(prisma, query);
        break;
      case 'STUDENT_STATEMENT':
        if (!query.studentId) {
          return NextResponse.json(
            { success: false, error: 'studentId is required for Student Statement report' },
            { status: 400 }
          );
        }
        reportData = await getStudentStatementReport(prisma, query.studentId, query);
        break;
      case 'ADMISSIONS_REPORT':
        reportData = await getAdmissionsReport(prisma, query);
        break;
      case 'DISCOUNT_REPORT':
        reportData = await getDiscountReport(prisma, query);
        break;
      case 'DAILY_COLLECTION':
        reportData = await getDailyCollectionReport(prisma, query);
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Unsupported report type: ${query.type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        reportType: query.type,
        ...reportData,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
