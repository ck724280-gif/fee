import { NextRequest, NextResponse } from 'next/server';
import { createExpenseSchema } from '@/lib/validations/expense';
import { getExpenses, createExpense } from '@/lib/expense-service';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(req);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const category = (searchParams.get('category') as any) || undefined;
    const paymentMethod = (searchParams.get('paymentMethod') as any) || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await getExpenses(
      { search, category, paymentMethod, startDate, endDate, page, limit },
      auth.organizationId
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(req);

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

    const expense = await createExpense(parsed.data, auth.organizationId, auth.userId);

    return NextResponse.json(
      {
        success: true,
        message: 'Expense recorded successfully',
        data: expense,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiAuthError(error);
  }
}
