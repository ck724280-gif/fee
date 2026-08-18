import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, handleApiAuthError } from '@/lib/authorization';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;

    const org = await prisma.organization.findFirst({
      where: { OR: [{ id }, { publicId: id }, { slug: id }] },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, mobile: true, isSuperAdmin: true } },
          },
        },
        settings: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          include: { payments: { orderBy: { paymentDate: 'desc' } } },
        },
        classes: {
          include: { _count: { select: { students: true } } },
        },
        _count: {
          select: {
            students: true,
            feeRecords: true,
            payments: true,
            expenses: true,
          },
        },
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, organization: org });
  } catch (error) {
    return handleApiAuthError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const { name, organizationType, status } = body;

    const existingOrg = await prisma.organization.findFirst({
      where: { OR: [{ id }, { publicId: id }] },
    });

    if (!existingOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = String(name).trim();
    if (organizationType) updateData.organizationType = organizationType;
    if (status) updateData.status = status;

    const updatedOrg = await prisma.organization.update({
      where: { id: existingOrg.id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.userId,
        organizationId: existingOrg.id,
        action: 'SUPER_ADMIN_UPDATED_ORGANIZATION',
        entity: 'Organization',
        entityId: existingOrg.id,
        details: { changes: updateData },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Organization updated successfully',
      organization: updatedOrg,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
