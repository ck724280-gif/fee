import { NextResponse } from 'next/server';
import { getExpenseStats } from '@/lib/expense-service';

export async function GET() {
  try {
    const stats = await getExpenseStats();
    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error fetching expense stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch expense statistics' },
      { status: 500 }
    );
  }
}
