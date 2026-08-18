import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, handleApiAuthError } from '@/lib/authorization';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const [
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      totalUsers,
      totalStudents,
      subscriptionPaymentsAgg,
      recentOrganizations,
      recentLogs,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { status: 'ACTIVE' } }),
      prisma.organization.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count(),
      prisma.student.count(),
      prisma.subscriptionPayment.aggregate({
        _sum: { amount: true },
      }),
      prisma.organization.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          members: {
            where: { role: 'ORGANIZATION_ADMIN' },
            include: { user: { select: { name: true, email: true } } },
            take: 1,
          },
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { students: true, classes: true },
          },
        },
      }),
      prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: {
          organization: { select: { name: true } },
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    const totalRevenue = subscriptionPaymentsAgg._sum.amount || 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalOrganizations,
        activeOrganizations,
        suspendedOrganizations,
        expiredOrganizations: totalOrganizations - activeOrganizations - suspendedOrganizations,
        totalUsers,
        totalStudents,
        totalRevenue,
      },
      recentOrganizations,
      recentLogs,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
