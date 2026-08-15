import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateSettingsSchema } from '@/lib/validations/settings';

export async function GET() {
  try {
    let settings = await prisma.instituteSetting.findFirst();

    if (!settings) {
      settings = await prisma.instituteSetting.create({
        data: {
          instituteName: 'DPR Private Tuition',
          tagline: 'Excellence in Academic Coaching & Guidance',
          address: 'Station Road, Near City Center, West Bengal',
          phone: '+91 98765 43210',
          whatsapp: '+91 98765 43210',
          email: 'info@dprtuition.com',
          receiptPrefix: 'DPR-RC',
          currencySymbol: '₹',
          defaultGraceDays: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = updateSettingsSchema.parse(body);

    let settings = await prisma.instituteSetting.findFirst();

    if (settings) {
      settings = await prisma.instituteSetting.update({
        where: { id: settings.id },
        data: validatedData,
      });
    } else {
      settings = await prisma.instituteSetting.create({
        data: validatedData,
      });
    }

    await prisma.auditLog.create({
      data: {
        action: 'SETTINGS_UPDATED',
        entity: 'INSTITUTE_SETTING',
        entityId: settings.id,
        details: { changes: validatedData },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update settings' },
      { status: 400 }
    );
  }
}
