import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createExpenseSchema } from '@/lib/validations/expense';
import { getExpenses, createExpense, generateExpensesCsv } from '@/lib/expense-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') as any || undefined;
    const paymentMethod = searchParams.get('paymentMethod') as any || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const format = searchParams.get('format') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // If CSV download requested
    if (format === 'csv') {
      const result = await getExpenses({ search, category, paymentMethod, startDate, endDate, page: 1, limit: 10000 });
      const csv = generateExpensesCsv(result.expenses);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="dpr-expenses-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    const result = await getExpenses({ search, category, paymentMethod, startDate, endDate, page, limit });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);
    const userId = req.headers.get('x-user-id') || session?.userId;

    const body = await req.json();
    const parsed = createExpenseSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0] || 'Validation error';
      return NextResponse.json(
        { success: false, error: firstError, details: fieldErrors },
        { status: 400 }
      );
    }

    const expense = await createExpense(parsed.data, userId);

    return NextResponse.json(
      {
        success: true,
        message: 'Expense recorded successfully',
        data: expense,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error recording expense:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record expense' },
      { status: 500 }
    );
  }
}
