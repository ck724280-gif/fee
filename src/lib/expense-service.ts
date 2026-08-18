import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { ExpenseCategory, PaymentMethod } from '@prisma/client';
import { EXPENSE_CATEGORY_LABELS } from './validations/expense';

export interface ExpenseFilterParams {
  search?: string;
  category?: ExpenseCategory;
  paymentMethod?: PaymentMethod;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export async function getExpenses(params: ExpenseFilterParams = {}, organizationId: string) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = { organizationId };

  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: 'insensitive' } },
      { payeeName: { contains: params.search, mode: 'insensitive' } },
      { referenceNumber: { contains: params.search, mode: 'insensitive' } },
      { notes: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  if (params.category) {
    where.category = params.category;
  }

  if (params.paymentMethod) {
    where.paymentMethod = params.paymentMethod;
  }

  if (params.startDate || params.endDate) {
    where.expenseDate = {};
    if (params.startDate) {
      where.expenseDate.gte = new Date(params.startDate);
    }
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      where.expenseDate.lte = end;
    }
  }

  const [total, expenses] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      skip,
      take: limit,
      include: {
        recordedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
  ]);

  return {
    expenses,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function createExpense(data: any, organizationId: string, userId?: string) {
  const expense = await prisma.expense.create({
    data: {
      organizationId,
      title: data.title,
      category: data.category,
      amount: data.amount,
      expenseDate: data.expenseDate,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber || null,
      payeeName: data.payeeName || null,
      notes: data.notes || null,
      receiptUrl: data.receiptUrl || null,
      recordedByUserId: userId || null,
    },
  });

  await createAuditLog({
    userId,
    organizationId,
    action: 'EXPENSE_CREATED',
    entity: 'EXPENSE',
    entityId: expense.id,
    details: {
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
    },
  });

  return expense;
}

export async function updateExpense(id: string, data: any, organizationId: string, userId?: string) {
  const existing = await prisma.expense.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error('Expense not found or unauthorized');
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      title: data.title ?? existing.title,
      category: data.category ?? existing.category,
      amount: data.amount ?? existing.amount,
      expenseDate: data.expenseDate ?? existing.expenseDate,
      paymentMethod: data.paymentMethod ?? existing.paymentMethod,
      referenceNumber: data.referenceNumber !== undefined ? data.referenceNumber : existing.referenceNumber,
      payeeName: data.payeeName !== undefined ? data.payeeName : existing.payeeName,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      receiptUrl: data.receiptUrl !== undefined ? data.receiptUrl : existing.receiptUrl,
    },
  });

  await createAuditLog({
    userId,
    organizationId,
    action: 'EXPENSE_UPDATED',
    entity: 'EXPENSE',
    entityId: id,
    details: { previous: existing, updated },
  });

  return updated;
}

export async function deleteExpense(id: string, organizationId: string, userId?: string) {
  const existing = await prisma.expense.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new Error('Expense not found or unauthorized');
  }

  await prisma.expense.delete({
    where: { id },
  });

  await createAuditLog({
    userId,
    organizationId,
    action: 'EXPENSE_DELETED',
    entity: 'EXPENSE',
    entityId: id,
    details: { deletedExpense: existing },
  });

  return { success: true };
}

export async function getExpenseById(id: string, organizationId: string) {
  const expense = await prisma.expense.findFirst({
    where: { id, organizationId },
    include: {
      recordedByUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return expense;
}

export async function getExpenseSummary(organizationId: string, startDate?: string, endDate?: string) {
  const where: any = { organizationId };

  if (startDate || endDate) {
    where.expenseDate = {};
    if (startDate) where.expenseDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.expenseDate.lte = end;
    }
  }

  const [totalAgg, categoryAgg] = await Promise.all([
    prisma.expense.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const categoryBreakdown = categoryAgg.map((item) => ({
    category: item.category,
    label: EXPENSE_CATEGORY_LABELS[item.category] || item.category,
    totalAmount: item._sum.amount || 0,
    count: item._count.id,
  }));

  return {
    totalExpenses: totalAgg._sum.amount || 0,
    expenseCount: totalAgg._count.id || 0,
    categoryBreakdown,
  };
}

export const getExpenseStats = getExpenseSummary;
