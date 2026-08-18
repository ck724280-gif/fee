import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, handleApiAuthError } from '@/lib/authorization';
import { hashPassword } from '@/lib/auth';

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

    const {
      name,
      organizationType,
      status,
      plan,
      pricePerCycle,
      billingCycle,
      ownerName,
      ownerEmail,
      ownerMobile,
      ownerPassword,
    } = body;

    const existingOrg = await prisma.organization.findFirst({
      where: { OR: [{ id }, { publicId: id }] },
      include: {
        subscriptions: { orderBy: { createdAt: 'desc' } },
        settings: true,
        members: {
          include: { user: true },
        },
      },
    });

    if (!existingOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = String(name).trim();
    if (organizationType) updateData.organizationType = organizationType;
    if (status) updateData.status = status;

    const updatedOrg = await prisma.$transaction(async (tx) => {
      // 1. Update Organization
      const org = await tx.organization.update({
        where: { id: existingOrg.id },
        data: updateData,
      });

      // 2. Update Organization Settings
      const settingsUpdate: any = {};
      if (name) settingsUpdate.instituteName = String(name).trim();
      if (ownerMobile !== undefined) settingsUpdate.phone = ownerMobile ? String(ownerMobile).trim() : null;
      if (ownerEmail) settingsUpdate.email = String(ownerEmail).trim().toLowerCase();

      if (Object.keys(settingsUpdate).length > 0) {
        await tx.organizationSetting.updateMany({
          where: { organizationId: existingOrg.id },
          data: settingsUpdate,
        });
      }

      // 3. Update Administrator User Credentials
      const adminMember =
        existingOrg.members.find((m) => m.role === 'ORGANIZATION_ADMIN') ||
        existingOrg.members[0];

      if (adminMember && adminMember.user) {
        const userUpdate: any = {};
        if (ownerName) userUpdate.name = String(ownerName).trim();
        if (ownerMobile !== undefined) userUpdate.mobile = ownerMobile ? String(ownerMobile).trim() : null;

        if (ownerEmail && ownerEmail.trim().toLowerCase() !== adminMember.user.email) {
          const sanitizedEmail = ownerEmail.trim().toLowerCase();
          const emailCheck = await tx.user.findUnique({ where: { email: sanitizedEmail } });
          if (emailCheck && emailCheck.id !== adminMember.user.id) {
            throw new Error(`Email "${sanitizedEmail}" is already in use by another user account.`);
          }
          userUpdate.email = sanitizedEmail;
        }

        if (ownerPassword && ownerPassword.trim()) {
          if (ownerPassword.trim().length < 6) {
            throw new Error('New admin password must be at least 6 characters long.');
          }
          userUpdate.passwordHash = await hashPassword(ownerPassword.trim());
        }

        if (Object.keys(userUpdate).length > 0) {
          await tx.user.update({
            where: { id: adminMember.user.id },
            data: userUpdate,
          });
        }
      }

      // 4. Update Subscription Plan / Pricing
      if (plan || pricePerCycle !== undefined || billingCycle) {
        const sub = existingOrg.subscriptions[0];
        if (sub) {
          await tx.subscription.update({
            where: { id: sub.id },
            data: {
              ...(plan ? { plan } : {}),
              ...(pricePerCycle !== undefined ? { pricePerCycle: Number(pricePerCycle) } : {}),
              ...(billingCycle ? { billingCycle } : {}),
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: admin.userId,
          organizationId: existingOrg.id,
          action: 'SUPER_ADMIN_UPDATED_ORGANIZATION_ALL_DETAILS',
          entity: 'Organization',
          entityId: existingOrg.id,
          details: {
            orgName: org.name,
            updatedEmail: ownerEmail || adminMember?.user?.email,
            passwordChanged: !!ownerPassword,
            plan: plan || existingOrg.subscriptions[0]?.plan,
          },
        },
      });

      return org;
    });

    return NextResponse.json({
      success: true,
      message: `Organization "${updatedOrg.name}" and all administrator credentials updated successfully!`,
      organization: updatedOrg,
    });
  } catch (error: any) {
    return handleApiAuthError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin(request);
    const { id } = await params;

    const existingOrg = await prisma.organization.findFirst({
      where: { OR: [{ id }, { publicId: id }] },
    });

    if (!existingOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.subscriptionPayment.deleteMany({
        where: { subscription: { organizationId: existingOrg.id } },
      });
      await tx.subscription.deleteMany({
        where: { organizationId: existingOrg.id },
      });
      await tx.payment.deleteMany({
        where: { organizationId: existingOrg.id },
      });
      await tx.expense.deleteMany({
        where: { organizationId: existingOrg.id },
      });
      await tx.feeRecord.deleteMany({
        where: { organizationId: existingOrg.id },
      });
      await tx.document.deleteMany({
        where: { organizationId: existingOrg.id },
      });
      await tx.student.deleteMany({
        where: { organizationId: existingOrg.id },
      });
      await tx.class.deleteMany({
        where: { organizationId: existingOrg.id },
      });
      await tx.organizationSetting.deleteMany({
        where: { organizationId: existingOrg.id },
      });
      await tx.organizationMember.deleteMany({
        where: { organizationId: existingOrg.id },
      });
      await tx.auditLog.create({
        data: {
          userId: admin.userId,
          action: 'SUPER_ADMIN_DELETED_ORGANIZATION',
          entity: 'Organization',
          entityId: existingOrg.id,
          details: { deletedOrgName: existingOrg.name, deletedSlug: existingOrg.slug },
        },
      });
      await tx.organization.delete({
        where: { id: existingOrg.id },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Organization "${existingOrg.name}" and all associated data have been deleted successfully.`,
    });
  } catch (error) {
    return handleApiAuthError(error);
  }
}
