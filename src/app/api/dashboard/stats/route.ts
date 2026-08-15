import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDashboardStats } from '@/lib/dashboard-service';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const currentDate = url.searchParams.get('currentDate') || undefined;

    const stats = await getDashboardStats(prisma, currentDate);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
