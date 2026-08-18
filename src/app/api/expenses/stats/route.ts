import { NextRequest, NextResponse } from 'next/server';
import { getExpenseSummary } from '@/lib/expense-service';
import { authorizeOrgRequest, AuthError } from '@/lib/authorization';

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(request);

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const stats = await getExpenseSummary(auth.organizationId, startDate, endDate);
    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error('Error fetching expense stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch expense statistics' },
      { status: 500 }
    );
  }
}
