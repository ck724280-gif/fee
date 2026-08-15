import { NextRequest, NextResponse } from 'next/server';
import { listAuditLogs } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const action = searchParams.get('action') || undefined;
    const entity = searchParams.get('entity') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);

    const result = await listAuditLogs({
      action,
      entity,
      entityId,
      userId,
      startDate,
      endDate,
      search,
      page: isNaN(page) || page < 1 ? 1 : page,
      limit: isNaN(limit) || limit < 1 ? 25 : Math.min(limit, 100),
    });

    return NextResponse.json(
      {
        success: true,
        data: result.logs,
        pagination: result.pagination,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to retrieve audit logs',
      },
      { status: 500 }
    );
  }
}
