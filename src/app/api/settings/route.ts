import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateSettingsSchema } from '@/lib/validations/settings';
import { authorizeOrgRequest, handleApiAuthError } from '@/lib/authorization';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(req);

    let settings = await prisma.organizationSetting.findUnique({
      where: { organizationId: auth.organizationId },
    });

    if (!settings) {
      settings = await prisma.organizationSetting.create({
        data: {
          organizationId: auth.organizationId,
          instituteName: auth.organizationName || 'Education Institute',
          tagline: 'Excellence in Academic Coaching & Guidance',
          address: '',
          phone: '',
          email: auth.email,
          receiptPrefix: 'RC',
          feePrefix: 'FEE',
          currencySymbol: '₹',
          defaultGraceDays: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: settings,
      organization: {
        id: auth.organizationId,
        name: auth.organizationName,
        slug: auth.organizationSlug,
        organizationType: auth.organizationType,
      },
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authorizeOrgRequest(req, { allowedRoles: ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'] });

    const body = await req.json();
    const validatedData = updateSettingsSchema.parse(body);

    const settings = await prisma.$transaction(async (tx) => {
      const updated = await tx.organizationSetting.upsert({
        where: { organizationId: auth.organizationId },
        create: {
          organizationId: auth.organizationId,
          instituteName: validatedData.instituteName || auth.organizationName,
          tagline: validatedData.tagline,
          address: validatedData.address,
          phone: validatedData.phone,
          whatsapp: validatedData.whatsapp,
          email: validatedData.email,
          logoUrl: validatedData.logoUrl,
          receiptPrefix: validatedData.receiptPrefix || 'RC',
          feePrefix: validatedData.feePrefix || 'FEE',
          currencySymbol: validatedData.currencySymbol || '₹',
          defaultGraceDays: validatedData.defaultGraceDays || 0,
          upiId: validatedData.upiId,
          upiPayeeName: validatedData.upiPayeeName,
          upiEnabled: validatedData.upiEnabled ?? true,
          customQrUrl: validatedData.customQrUrl,
          reminderMessage: validatedData.reminderMessage,
          receiptMessage: validatedData.receiptMessage,
          footerText: validatedData.footerText,
          signatureUrl: validatedData.signatureUrl,
        },
        update: {
          instituteName: validatedData.instituteName,
          tagline: validatedData.tagline,
          address: validatedData.address,
          phone: validatedData.phone,
          whatsapp: validatedData.whatsapp,
          email: validatedData.email,
          logoUrl: validatedData.logoUrl,
          receiptPrefix: validatedData.receiptPrefix || undefined,
          feePrefix: validatedData.feePrefix || undefined,
          currencySymbol: validatedData.currencySymbol || undefined,
          defaultGraceDays: validatedData.defaultGraceDays ?? undefined,
          upiId: validatedData.upiId,
          upiPayeeName: validatedData.upiPayeeName,
          upiEnabled: validatedData.upiEnabled,
          customQrUrl: validatedData.customQrUrl,
          reminderMessage: validatedData.reminderMessage,
          receiptMessage: validatedData.receiptMessage,
          footerText: validatedData.footerText,
          signatureUrl: validatedData.signatureUrl,
        },
      });

      if (validatedData.instituteName) {
        await tx.organization.update({
          where: { id: auth.organizationId },
          data: { name: validatedData.instituteName },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          organizationId: auth.organizationId,
          action: 'SETTINGS_UPDATED',
          entity: 'OrganizationSetting',
          entityId: updated.id,
          details: { changes: validatedData },
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: 'Organization branding and settings saved successfully!',
      data: settings,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
