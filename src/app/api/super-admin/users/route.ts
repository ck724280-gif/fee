import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, handleApiAuthError } from '@/lib/authorization';
import { hashPassword } from '@/lib/auth';

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

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const body = await request.json();

    const {
      userId,
      email,
      name,
      mobile,
      newPassword,
      isSuperAdmin,
      reset2FA,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (email && email.trim() !== targetUser.email) {
      const sanitizedEmail = email.trim().toLowerCase();
      // Check if email already in use
      const existingEmail = await prisma.user.findUnique({
        where: { email: sanitizedEmail },
      });
      if (existingEmail && existingEmail.id !== targetUser.id) {
        return NextResponse.json(
          { error: `Email address "${sanitizedEmail}" is already registered to another user.` },
          { status: 409 }
        );
      }
      updateData.email = sanitizedEmail;
    }

    if (name) updateData.name = name.trim();
    if (mobile !== undefined) updateData.mobile = mobile ? mobile.trim() : null;
    if (isSuperAdmin !== undefined) updateData.isSuperAdmin = Boolean(isSuperAdmin);

    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters long.' },
          { status: 400 }
        );
      }
      updateData.passwordHash = await hashPassword(newPassword.trim());
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: targetUser.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          mobile: true,
          isSuperAdmin: true,
        },
      });

      if (reset2FA) {
        await tx.totpSecret.deleteMany({
          where: { userId: targetUser.id },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: admin.userId,
          action: 'SUPER_ADMIN_UPDATED_USER_CREDENTIALS',
          entity: 'User',
          entityId: targetUser.id,
          details: {
            targetUserId: targetUser.id,
            previousEmail: targetUser.email,
            newEmail: updateData.email || targetUser.email,
            passwordChanged: !!newPassword,
            reset2FA: !!reset2FA,
          },
        },
      });

      return u;
    });

    return NextResponse.json({
      success: true,
      message: `User credentials updated successfully! ${newPassword ? '(Password was reset)' : ''}`,
      user: updated,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const cleanOrphans = searchParams.get('cleanOrphans') === 'true';

    if (cleanOrphans) {
      // Find all non-superadmin users with 0 organization memberships
      const allUsers = await prisma.user.findMany({
        where: { isSuperAdmin: false },
        include: {
          memberships: true,
        },
      });

      const orphanUsers = allUsers.filter((u) => u.memberships.length === 0);
      const orphanIds = orphanUsers.map((u) => u.id);

      if (orphanIds.length > 0) {
        await prisma.$transaction(async (tx) => {
          await tx.totpSecret.deleteMany({
            where: { userId: { in: orphanIds } },
          });
          await tx.user.deleteMany({
            where: { id: { in: orphanIds } },
          });
          await tx.auditLog.create({
            data: {
              userId: admin.userId,
              action: 'SUPER_ADMIN_CLEANED_ORPHAN_USERS',
              entity: 'User',
              details: { cleanedCount: orphanIds.length, emails: orphanUsers.map((u) => u.email) },
            },
          });
        });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully cleaned ${orphanIds.length} orphaned user account(s).`,
        deletedCount: orphanIds.length,
      });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Cannot delete Super Admin account directly.' },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.totpSecret.deleteMany({ where: { userId: targetUser.id } });
      await tx.organizationMember.deleteMany({ where: { userId: targetUser.id } });
      await tx.user.delete({ where: { id: targetUser.id } });
      await tx.auditLog.create({
        data: {
          userId: admin.userId,
          action: 'SUPER_ADMIN_DELETED_USER',
          entity: 'User',
          entityId: targetUser.id,
          details: { deletedEmail: targetUser.email, deletedName: targetUser.name },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `User account "${targetUser.email}" deleted successfully.`,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
