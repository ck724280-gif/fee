import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, handleApiAuthError } from '@/lib/authorization';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    let setting = await prisma.platformSetting.findUnique({
      where: { id: 'master_platform_config' },
    });

    if (!setting) {
      setting = await prisma.platformSetting.create({
        data: {
          id: 'master_platform_config',
          upiId: 'admin@dprtuition.com',
          upiPayeeName: 'DPR Tuition Platform',
          upiEnabled: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      settings: {
        upiId: setting.upiId || '',
        upiPayeeName: setting.upiPayeeName || '',
        upiEnabled: setting.upiEnabled,
        updatedAt: setting.updatedAt,
      },
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const body = await request.json();
    const { upiId, upiPayeeName, upiEnabled } = body;

    if (!upiId || !String(upiId).trim()) {
      return NextResponse.json(
        { success: false, error: 'Platform UPI ID is required (e.g. yourname@upi)' },
        { status: 400 }
      );
    }

    const updated = await prisma.platformSetting.upsert({
      where: { id: 'master_platform_config' },
      create: {
        id: 'master_platform_config',
        upiId: String(upiId).trim(),
        upiPayeeName: upiPayeeName ? String(upiPayeeName).trim() : 'EduSaaS Platform',
        upiEnabled: upiEnabled !== undefined ? Boolean(upiEnabled) : true,
      },
      update: {
        upiId: String(upiId).trim(),
        upiPayeeName: upiPayeeName ? String(upiPayeeName).trim() : 'EduSaaS Platform',
        upiEnabled: upiEnabled !== undefined ? Boolean(upiEnabled) : true,
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: admin.userId,
        action: 'SUPER_ADMIN_UPDATED_PLATFORM_UPI',
        entity: 'PlatformSetting',
        entityId: updated.id,
        details: { upiId: updated.upiId, upiPayeeName: updated.upiPayeeName },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Platform Super Admin UPI payment credentials updated successfully!',
      settings: updated,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
