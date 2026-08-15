import { PrismaClient, Prisma } from '@prisma/client';
import prisma from './prisma';

export interface CreateAuditLogInput {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, any> | any;
  ipAddress?: string | null;
  prismaClient?: PrismaClient | Prisma.TransactionClient | any;
}

export interface AuditLogFilterOptions {
  action?: string;
  entity?: string;
  entityId?: string;
  userId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Creates an immutable audit trail entry in the database.
 * Designed to be non-blocking for critical business paths (catches internal DB errors unless within a transaction).
 */
export async function createAuditLog(input: CreateAuditLogInput) {
  const client = input.prismaClient || prisma;

  try {
    const record = await client.auditLog.create({
      data: {
        userId: input.userId || null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId || null,
        details: input.details ? JSON.parse(JSON.stringify(input.details)) : null,
        ipAddress: input.ipAddress || null,
      },
    });
    return record;
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
    // If running within an explicit transaction client, bubble up so the transaction handles it
    if (input.prismaClient) {
      throw error;
    }
    return null;
  }
}

/**
 * Queries audit logs with filtering, search, and pagination.
 */
export async function listAuditLogs(
  options: AuditLogFilterOptions = {},
  prismaClient: PrismaClient | any = prisma
) {
  const {
    action,
    entity,
    entityId,
    userId,
    startDate,
    endDate,
    page = 1,
    limit = 25,
    search,
  } = options;

  const where: any = {};

  if (action) {
    where.action = action;
  }

  if (entity) {
    where.entity = entity;
  }

  if (entityId) {
    where.entityId = entityId;
  }

  if (userId) {
    where.userId = userId;
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) {
      where.timestamp.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.timestamp.lte = end;
    }
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { action: { contains: term, mode: 'insensitive' } },
      { entity: { contains: term, mode: 'insensitive' } },
      { entityId: { contains: term, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [total, logs] = await Promise.all([
    prismaClient.auditLog.count({ where }),
    prismaClient.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: skip + logs.length < total,
    },
  };
}
