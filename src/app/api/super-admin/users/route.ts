import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, handleApiAuthError } from '@/lib/authorization';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        mobile: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
        totpSecret: {
          select: { isEnabled: true, verifiedAt: true },
        },
        memberships: {
          include: {
            organization: {
              select: { id: true, name: true, slug: true, status: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
