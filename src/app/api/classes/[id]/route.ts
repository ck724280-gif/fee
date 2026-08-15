import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateClassSchema } from '@/lib/validations/class';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cls = await prisma.class.findUnique({
      where: { id },
      include: {
        students: {
          select: {
            id: true,
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
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: cls,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch class' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validatedData = updateClassSchema.parse(body);

    const existing = await prisma.class.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    if (validatedData.name && validatedData.name !== existing.name) {
      const nameConflict = await prisma.class.findUnique({
        where: { name: validatedData.name },
      });
      if (nameConflict) {
        return NextResponse.json(
          { success: false, error: `Class name "${validatedData.name}" already in use` },
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update class' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.class.findUnique({
      where: { id },
      include: {
        _count: {
          select: { students: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    if (existing._count.students > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete class with ${existing._count.students} assigned students. Please reassign students or archive the class (set status to INACTIVE).`,
        },
        { status: 400 }
      );
    }

    await prisma.class.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'CLASS_DELETED',
        entity: 'CLASS',
        entityId: id,
        details: { name: existing.name },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Class deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete class' },
      { status: 500 }
    );
  }
}
