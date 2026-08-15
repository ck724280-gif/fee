import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { updateExpenseSchema } from '@/lib/validations/expense';
import { updateExpense, deleteExpense } from '@/lib/expense-service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        recordedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!expense) {
      return NextResponse.json(
        { success: false, error: 'Expense record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: expense,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch expense' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getCurrentUser(req);
    const userId = req.headers.get('x-user-id') || session?.userId;

    const body = await req.json();
    const parsed = updateExpenseSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0] || 'Validation error';
      return NextResponse.json(
        { success: false, error: firstError, details: fieldErrors },
        { status: 400 }
      );
    }

    const updated = await updateExpense(id, parsed.data, userId);

    return NextResponse.json({
      success: true,
      message: 'Expense updated successfully',
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update expense' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getCurrentUser(req);
    const userId = req.headers.get('x-user-id') || session?.userId;

    await deleteExpense(id, userId);

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
