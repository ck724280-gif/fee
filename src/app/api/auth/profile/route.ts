import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, hashPassword, signToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().trim().email('Please enter a valid email address').optional(),
  currentPassword: z.string().optional().or(z.literal('')),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').optional().or(z.literal('')),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(req);

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        role: auth.role,
        organizationId: auth.organizationId,
        organizationName: auth.organizationName,
      },
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(req);

    const body = await req.json();
    const parsed = updateProfileSchema.parse(body);

    const { name, email, currentPassword, newPassword } = parsed;

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User account not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (name && name !== user.name) {
      updateData.name = name;
    }

    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const normalizedEmail = email.toLowerCase();
      const existingUserWithEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUserWithEmail && existingUserWithEmail.id !== auth.userId) {
        return NextResponse.json(
          { success: false, error: 'This email address is already in use by another account.' },
          { status: 400 }
        );
      }

      updateData.email = normalizedEmail;
    }

    if (newPassword && newPassword.trim().length >= 6) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is required to set a new password.' },
          { status: 400 }
        );
      }
      const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect.' },
          { status: 400 }
        );
      }
      updateData.passwordHash = await hashPassword(newPassword.trim());
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No changes detected',
        data: { id: user.id, email: user.email, name: user.name },
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      organizationId: auth.organizationId,
      action: newPassword ? 'ADMIN_PASSWORD_CHANGED' : 'ADMIN_PROFILE_UPDATED',
      entity: 'USER',
      entityId: user.id,
      details: {
        emailChanged: Boolean(updateData.email),
        nameChanged: Boolean(updateData.name),
        passwordChanged: Boolean(updateData.passwordHash),
      },
    });

    // Generate refreshed session JWT token
    const token = await signToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: auth.role,
      organizationId: auth.organizationId,
      organizationSlug: auth.organizationSlug,
      isSuperAdmin: Boolean(updatedUser.isSuperAdmin),
    });

    const response = NextResponse.json({
      success: true,
      message: 'Admin security & credentials updated successfully!',
      data: updatedUser,
    });

    response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return response;
  } catch (error) {
    return handleApiAuthError(error);
  }
}
