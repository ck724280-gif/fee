import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, handleApiAuthError } from '@/lib/authorization';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
    const orgId = searchParams.get('organizationId');

    const where: any = {};
    if (orgId) {
      where.organizationId = orgId;
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      auditLogs,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
