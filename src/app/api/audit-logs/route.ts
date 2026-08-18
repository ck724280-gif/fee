import { NextRequest, NextResponse } from 'next/server';
import { listAuditLogs } from '@/lib/audit';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(req);

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
      organizationId: auth.organizationId,
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

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
