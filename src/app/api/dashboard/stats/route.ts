import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDashboardStats } from '@/lib/dashboard-service';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(req);

    const url = new URL(req.url);
    const currentDate = url.searchParams.get('currentDate') || undefined;

    const stats = await getDashboardStats(prisma, auth.organizationId, currentDate);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
