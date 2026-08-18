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
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(req);

    const url = new URL(req.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const query = reportQuerySchema.parse(searchParams);

    let reportData: any = null;

    switch (query.type) {
      case 'MONTHLY_COLLECTION':
        reportData = await getMonthlyCollectionReport(prisma, auth.organizationId, query);
        break;
      case 'OVERDUE_FEES':
        reportData = await getOverdueFeesReport(prisma, auth.organizationId, query);
        break;
      case 'CLASS_WISE_REVENUE':
        reportData = await getClassWiseRevenueReport(prisma, auth.organizationId, query);
        break;
      case 'PAYMENT_METHOD_DISTRIBUTION':
        reportData = await getPaymentMethodDistributionReport(prisma, auth.organizationId, query);
        break;
      case 'STUDENT_STATEMENT':
        if (!query.studentId) {
          return NextResponse.json(
            { success: false, error: 'studentId is required for Student Statement report' },
            { status: 400 }
          );
        }
        reportData = await getStudentStatementReport(prisma, query.studentId, auth.organizationId, query);
        break;
      case 'ADMISSIONS_REPORT':
        reportData = await getAdmissionsReport(prisma, auth.organizationId, query);
        break;
      case 'DISCOUNT_REPORT':
        reportData = await getDiscountReport(prisma, auth.organizationId, query);
        break;
      case 'DAILY_COLLECTION':
        reportData = await getDailyCollectionReport(prisma, auth.organizationId, query);
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
  } catch (error) {
    return handleApiAuthError(error);
  }
}
