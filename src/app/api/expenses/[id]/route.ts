import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateExpenseSchema } from '@/lib/validations/expense';
import { updateExpense, deleteExpense } from '@/lib/expense-service';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeOrgRequest(req);
    const { id } = await params;

    const expense = await prisma.expense.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: {
        recordedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!expense) {
      return NextResponse.json(
        { success: false, error: 'Expense record not found in your organization' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeOrgRequest(req);
    const { id } = await params;

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

    const updated = await updateExpense(id, parsed.data, auth.organizationId, auth.userId);

    return NextResponse.json({
      success: true,
      message: 'Expense updated successfully',
      data: updated,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeOrgRequest(req);
    const { id } = await params;

    await deleteExpense(id, auth.organizationId, auth.userId);

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
