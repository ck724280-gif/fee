import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, AuthPayload } from '@/lib/auth';

export interface AuthorizedContext {
  userId: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ORGANIZATION_ADMIN' | 'ACCOUNTANT' | 'TEACHER' | 'STAFF' | string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationType: string;
  isSuperAdmin: boolean;
}

export class AuthError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number = 401, code: string = 'UNAUTHORIZED') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Authorizes a request by validating the user's session against database memberships.
 * NEVER trusts client-supplied organization_id or tenant headers.
 */
export async function authorizeOrgRequest(
  req: Request | NextRequest,
  options: {
    allowedRoles?: string[];
    allowSuperAdminBypass?: boolean;
    targetOrgId?: string; // Optional org id override (only permitted if caller is Super Admin)
  } = {}
): Promise<AuthorizedContext> {
  const sessionUser = await getCurrentUser(req);

  if (!sessionUser || !sessionUser.userId) {
    throw new AuthError('Authentication required. Please sign in.', 401, 'AUTH_REQUIRED');
  }

  // Fetch live user status from DB
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.userId },
    include: {
      memberships: {
        where: { status: 'ACTIVE' },
        include: { organization: true },
      },
    },
  });

  if (!user) {
    throw new AuthError('User account not found or deactivated.', 401, 'USER_NOT_FOUND');
  }

  const isSuperAdmin = !!user.isSuperAdmin;

  // Determine active organization
  let activeMembership = user.memberships.find(
    (m) => m.organizationId === sessionUser.organizationId && m.organization.status === 'ACTIVE'
  );

  // If no matching session org, default to user's first active membership
  if (!activeMembership && user.memberships.length > 0) {
    activeMembership = user.memberships[0];
  }

  // Super Admin handling
  if (isSuperAdmin && (!activeMembership || options.targetOrgId)) {
    const targetOrgId = options.targetOrgId || sessionUser.organizationId;
    const targetOrg = targetOrgId
      ? await prisma.organization.findUnique({ where: { id: targetOrgId } })
      : await prisma.organization.findFirst({ where: { status: 'ACTIVE' } });

    if (targetOrg) {
      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: 'SUPER_ADMIN',
        organizationId: targetOrg.id,
        organizationName: targetOrg.name,
        organizationSlug: targetOrg.slug,
        organizationType: targetOrg.organizationType,
        isSuperAdmin: true,
      };
    }
  }

  if (!activeMembership) {
    throw new AuthError(
      'No active organization membership found. Your organization access may be suspended.',
      403,
      'ORG_ACCESS_DENIED'
    );
  }

  // Check role restrictions if specified
  if (options.allowedRoles && options.allowedRoles.length > 0) {
    const hasRole = options.allowedRoles.includes(activeMembership.role) || isSuperAdmin;
    if (!hasRole) {
      throw new AuthError('You do not have permission to perform this action.', 403, 'INSUFFICIENT_PERMISSIONS');
    }
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: activeMembership.role,
    organizationId: activeMembership.organizationId,
    organizationName: activeMembership.organization.name,
    organizationSlug: activeMembership.organization.slug,
    organizationType: activeMembership.organization.organizationType,
    isSuperAdmin,
  };
}

/**
 * Enforces Super Admin access for platform-level management APIs.
 */
export async function requireSuperAdmin(req: Request | NextRequest): Promise<{ userId: string; email: string; name: string }> {
  const sessionUser = await getCurrentUser(req);

  if (!sessionUser || !sessionUser.userId) {
    throw new AuthError('Authentication required.', 401, 'AUTH_REQUIRED');
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.userId },
  });

  if (!user || !user.isSuperAdmin) {
    throw new AuthError('Access denied. Super Administrator privileges required.', 403, 'SUPER_ADMIN_REQUIRED');
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
  };
}

/**
 * Protects against Insecure Direct Object References (IDOR).
 * Verifies that a resource belongs to the specified organization.
 */
export async function assertResourceOwnership(
  modelName: 'class' | 'student' | 'feeRecord' | 'payment' | 'document' | 'expense' | 'upiSubmission',
  resourceId: string,
  organizationId: string
): Promise<any> {
  if (!resourceId || !organizationId) {
    throw new AuthError('Resource ID and Organization ID are required.', 400, 'BAD_REQUEST');
  }

  const delegate = (prisma as any)[modelName];
  if (!delegate || typeof delegate.findFirst !== 'function') {
    throw new Error(`Invalid Prisma model delegate: ${modelName}`);
  }

  const record = await delegate.findFirst({
    where: {
      id: resourceId,
      organizationId,
    },
  });

  if (!record) {
    throw new AuthError(
      'Resource not found or does not belong to your organization.',
      403,
      'CROSS_TENANT_ACCESS_BLOCKED'
    );
  }

  return record;
}

/**
 * Formats standard error responses for API routes.
 */
export function handleApiAuthError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  console.error('Unhandled authorization/server error:', error);
  return NextResponse.json(
    {
      error: 'An internal authorization error occurred.',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}
