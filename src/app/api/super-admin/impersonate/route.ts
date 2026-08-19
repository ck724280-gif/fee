import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, handleApiAuthError } from '@/lib/authorization';
import { signToken, COOKIE_NAME, COOKIE_OPTIONS, getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required.' }, { status: 400 });
    }

    const org = await prisma.organization.findFirst({
      where: { OR: [{ id: organizationId }, { publicId: organizationId }, { slug: organizationId }] },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Institution not found in database.' }, { status: 404 });
    }

    // Sign a secure support/impersonation session token
    const token = await signToken({
      userId: admin.userId,
      email: admin.email,
      name: admin.name,
      role: 'ORGANIZATION_ADMIN',
      organizationId: org.id,
      organizationSlug: org.slug,
      organizationName: org.name,
      isSuperAdmin: true,
      isImpersonating: true,
      impersonatorAdminId: admin.userId,
      impersonatorAdminEmail: admin.email,
      totpVerified: true,
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: admin.userId,
        organizationId: org.id,
        action: 'SUPER_ADMIN_IMPERSONATED_INSTITUTION',
        entity: 'Organization',
        entityId: org.id,
        details: {
          targetOrgName: org.name,
          targetOrgSlug: org.slug,
          impersonatorEmail: admin.email,
        },
      },
    });

    const response = NextResponse.json({
      success: true,
      message: `Access granted! Launching ${org.name} workspace...`,
      redirectUrl: '/',
    });

    response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return response;
  } catch (error) {
    return handleApiAuthError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getCurrentUser(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || !user.isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin privileges required' }, { status: 403 });
    }

    // Re-sign clean Super Admin master session
    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: 'SUPER_ADMIN',
      organizationId: '',
      organizationSlug: '',
      organizationName: '',
      isSuperAdmin: true,
      isImpersonating: false,
      totpVerified: true,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Exited support access mode. Returning to Super Admin console...',
      redirectUrl: '/super-admin/organizations',
    });

    response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return response;
  } catch (error) {
    return handleApiAuthError(error);
  }
}
