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

export async function getExpenses(params: ExpenseFilterParams = {}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {};

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

export async function createExpense(data: any, userId?: string) {
  const expense = await prisma.expense.create({
    data: {
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
    action: 'EXPENSE_CREATED',
    entity: 'EXPENSE',
    entityId: expense.id,
    details: {
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      payeeName: expense.payeeName,
    },
  });

  return expense;
}

export async function updateExpense(id: string, data: any, userId?: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Expense record not found');
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      ...data,
      referenceNumber: data.referenceNumber !== undefined ? data.referenceNumber : existing.referenceNumber,
      payeeName: data.payeeName !== undefined ? data.payeeName : existing.payeeName,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      receiptUrl: data.receiptUrl !== undefined ? data.receiptUrl : existing.receiptUrl,
    },
  });

  await createAuditLog({
    userId,
    action: 'EXPENSE_UPDATED',
    entity: 'EXPENSE',
    entityId: id,
    details: { changes: data },
  });

  return updated;
}

export async function deleteExpense(id: string, userId?: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Expense record not found');
  }

  await prisma.expense.delete({ where: { id } });

  await createAuditLog({
    userId,
    action: 'EXPENSE_DELETED',
    entity: 'EXPENSE',
    entityId: id,
    details: {
      title: existing.title,
      amount: existing.amount,
      category: existing.category,
    },
  });

  return { success: true };
}

export async function getExpenseStats() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [
    allExpenses,
    todayExpenses,
    thisMonthExpenses,
    lastMonthExpenses,
    allPayments,
    thisMonthPayments,
  ] = await Promise.all([
    prisma.expense.findMany({ select: { amount: true, category: true, expenseDate: true } }),
    prisma.expense.findMany({
      where: { expenseDate: { gte: startOfToday } },
      select: { amount: true },
    }),
    prisma.expense.findMany({
      where: { expenseDate: { gte: startOfMonth } },
      select: { amount: true, category: true },
    }),
    prisma.expense.findMany({
      where: { expenseDate: { gte: startOfLastMonth, lte: endOfLastMonth } },
      select: { amount: true },
    }),
    prisma.payment.findMany({ select: { amount: true } }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: startOfMonth } },
      select: { amount: true },
    }),
  ]);

  const totalExpense = allExpenses.reduce((sum, e) => sum + e.amount, 0);
  const todayExpense = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const thisMonthExpense = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const lastMonthExpense = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const totalIncome = allPayments.reduce((sum, p) => sum + p.amount, 0);
  const thisMonthIncome = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  const netSurplusAllTime = totalIncome - totalExpense;
  const netSurplusThisMonth = thisMonthIncome - thisMonthExpense;

  // Category distribution for this month / all time
  const categoryMap: Record<string, number> = {};
  thisMonthExpenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });

  const categoryBreakdown = Object.entries(categoryMap).map(([cat, amount]) => {
    const meta = EXPENSE_CATEGORY_LABELS[cat as ExpenseCategory] || { label: cat, color: '#64748B' };
    return {
      category: cat,
      label: meta.label,
      amount,
      color: meta.color,
      percentage: thisMonthExpense > 0 ? Math.round((amount / thisMonthExpense) * 100) : 0,
    };
  }).sort((a, b) => b.amount - a.amount);

  // Identify top category
  const topCategory = categoryBreakdown[0] || null;

  return {
    todayExpense,
    thisMonthExpense,
    lastMonthExpense,
    totalExpense,
    totalIncome,
    thisMonthIncome,
    netSurplusThisMonth,
    netSurplusAllTime,
    topCategory,
    categoryBreakdown,
  };
}

export function generateExpensesCsv(expenses: any[]): string {
  const headers = [
    'Date',
    'Expense Title',
    'Category',
    'Amount (INR)',
    'Payment Method',
    'Payee / Vendor',
    'Reference / Bill No',
    'Notes',
  ];

  const rows = expenses.map((e) => {
    const dateStr = new Date(e.expenseDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const catLabel = EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory]?.label || e.category;

    return [
      `"${dateStr}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${catLabel}"`,
      `"${e.amount.toFixed(2)}"`,
      `"${e.paymentMethod}"`,
      `"${(e.payeeName || '').replace(/"/g, '""')}"`,
      `"${(e.referenceNumber || '').replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}
