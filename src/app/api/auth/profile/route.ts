import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, comparePassword, hashPassword, signToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().trim().email('Please enter a valid email address').optional(),
  currentPassword: z.string().min(1, 'Current password is required to save changes'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').optional().or(z.literal('')),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);
    const userId = req.headers.get('x-user-id') || session?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
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

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);
    const userId = req.headers.get('x-user-id') || session?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0] || 'Validation failed';
      return NextResponse.json(
        { success: false, error: firstError, details: fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, currentPassword, newPassword } = parsed.data;

    // 1. Fetch user to verify current password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User account not found' },
        { status: 404 }
      );
    }

    // 2. Validate current password
    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect. Please verify and try again.' },
        { status: 400 }
      );
    }

    // 3. Prepare update data
    const updateData: any = {};

    if (name && name !== user.name) {
      updateData.name = name;
    }

    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const normalizedEmail = email.toLowerCase();
      // Check if email already in use by another user
      const existingUserWithEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUserWithEmail && existingUserWithEmail.id !== userId) {
        return NextResponse.json(
          { success: false, error: 'This email address is already in use by another account.' },
          { status: 400 }
        );
      }

      updateData.email = normalizedEmail;
    }

    if (newPassword && newPassword.trim().length >= 6) {
      updateData.passwordHash = await hashPassword(newPassword.trim());
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No changes detected',
        data: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    }

    // 4. Update in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    // 5. Create audit log
    await createAuditLog({
      userId: user.id,
      action: newPassword ? 'ADMIN_PASSWORD_CHANGED' : 'ADMIN_PROFILE_UPDATED',
      entity: 'USER',
      entityId: user.id,
      details: {
        emailChanged: Boolean(updateData.email),
        nameChanged: Boolean(updateData.name),
        passwordChanged: Boolean(updateData.passwordHash),
      },
    });

    // 6. Generate refreshed session JWT token
    const token = await signToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Admin security & credentials updated successfully!',
      data: updatedUser,
    });

    // Set updated cookie
    response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);

    return response;
  } catch (error: any) {
    console.error('Error updating admin profile:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update credentials' },
      { status: 500 }
    );
  }
}
