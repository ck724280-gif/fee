import { PrismaClient, Prisma } from '@prisma/client';
import prisma from './prisma';

export interface CreateAuditLogInput {
  userId?: string | null;
  organizationId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, any> | any;
  ipAddress?: string | null;
  prismaClient?: PrismaClient | Prisma.TransactionClient | any;
}

export interface AuditLogFilterOptions {
  organizationId?: string;
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
 */
export async function createAuditLog(input: CreateAuditLogInput) {
  const client = input.prismaClient || prisma;

  try {
    const record = await client.auditLog.create({
      data: {
        userId: input.userId || null,
        organizationId: input.organizationId || null,
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
    if (input.prismaClient) {
      throw error;
    }
    return null;
  }
}

/**
 * Queries audit logs with filtering, search, and tenant isolation.
 */
export async function listAuditLogs(
  options: AuditLogFilterOptions = {},
  prismaClient: PrismaClient | any = prisma
) {
  const {
    organizationId,
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

  if (organizationId) {
    where.organizationId = organizationId;
  }

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

  if (search) {
    const searchTrim = search.trim();
    where.OR = [
      { action: { contains: searchTrim, mode: 'insensitive' } },
      { entity: { contains: searchTrim, mode: 'insensitive' } },
      { entityId: { contains: searchTrim, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [total, logs] = await Promise.all([
    prismaClient.auditLog.count({ where }),
    prismaClient.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    logs,
    data: logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + logs.length < total,
    },
  };
}

export const AuditService = {
  createAuditLog,
  listAuditLogs,
};

export default AuditService;
