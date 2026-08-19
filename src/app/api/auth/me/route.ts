import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser(request);
    if (!session || !session.userId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            organization: {
              include: {
                settings: true,
                subscriptions: {
                  where: { status: 'ACTIVE' },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
        totpSecret: {
          select: {
            isEnabled: true,
            verifiedAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Determine active organization
    let currentMembership = user.memberships.find(
      (m) => m.organizationId === session.organizationId
    ) || user.memberships[0];

    let currentOrg = currentMembership?.organization;

    // If Super Admin is accessing / impersonating an organization not directly in their memberships
    if (!currentOrg && user.isSuperAdmin && session.organizationId) {
      currentOrg = (await prisma.organization.findUnique({
        where: { id: session.organizationId },
        include: {
          settings: true,
          subscriptions: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })) as any;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        mobile: user.mobile,
        isSuperAdmin: user.isSuperAdmin,
        role: session.role || currentMembership?.role || (user.isSuperAdmin ? 'SUPER_ADMIN' : 'ORGANIZATION_ADMIN'),
        twoFactorEnabled: !!user.totpSecret?.isEnabled,
        isImpersonating: Boolean(session.isImpersonating),
        impersonatorAdminEmail: session.impersonatorAdminEmail || '',
      },
      currentOrganization: currentOrg
        ? {
            id: currentOrg.id,
            publicId: currentOrg.publicId,
            name: currentOrg.name,
            slug: currentOrg.slug,
            organizationType: currentOrg.organizationType,
            status: currentOrg.status,
            settings: currentOrg.settings,
            subscription: currentOrg.subscriptions?.[0] || null,
          }
        : null,
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        publicId: m.organization.publicId,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
        status: m.organization.status,
      })),
    });
  } catch (error: any) {
    console.error('Auth /me error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Failed to verify session' },
      { status: 500 }
    );
  }
}
