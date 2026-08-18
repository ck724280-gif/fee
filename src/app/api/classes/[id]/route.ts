import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateClassSchema } from '@/lib/validations/class';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeOrgRequest(req);
    const { id } = await params;

    const cls = await prisma.class.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: {
        students: {
          select: {
            id: true,
            publicId: true,
            studentCode: true,
            name: true,
            feeMode: true,
            status: true,
            mobile: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            students: true,
            feeRecords: true,
          },
        },
      },
    });

    if (!cls) {
      return NextResponse.json(
        { success: false, error: 'Class not found in your organization' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: cls,
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
    const auth = await authorizeOrgRequest(req, { allowedRoles: ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'] });
    const { id } = await params;
    const body = await req.json();
    const validatedData = updateClassSchema.parse(body);

    const existing = await prisma.class.findFirst({
      where: { id, organizationId: auth.organizationId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Class not found in your organization' },
        { status: 404 }
      );
    }

    if (validatedData.name && validatedData.name !== existing.name) {
      const nameConflict = await prisma.class.findFirst({
        where: {
          name: validatedData.name,
          organizationId: auth.organizationId,
          id: { not: id },
        },
      });
      if (nameConflict) {
        return NextResponse.json(
          { success: false, error: `Class name "${validatedData.name}" is already in use in your organization` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.class.update({
      where: { id },
      data: validatedData,
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        organizationId: auth.organizationId,
        action: 'CLASS_UPDATED',
        entity: 'CLASS',
        entityId: id,
        details: { changes: validatedData },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Class updated successfully',
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
    const auth = await authorizeOrgRequest(req, { allowedRoles: ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'] });
    const { id } = await params;

    const existing = await prisma.class.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: {
        _count: {
          select: {
            students: true,
            feeRecords: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Class not found in your organization' },
        { status: 404 }
      );
    }

    if (existing._count.students > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete class "${existing.name}" because it contains ${existing._count.students} active student(s). Reassign students first.`,
        },
        { status: 400 }
      );
    }

    await prisma.class.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        organizationId: auth.organizationId,
        action: 'CLASS_DELETED',
        entity: 'CLASS',
        entityId: id,
        details: { name: existing.name },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Class "${existing.name}" deleted successfully`,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
