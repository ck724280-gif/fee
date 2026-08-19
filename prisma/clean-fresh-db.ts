import {
  PrismaClient,
  OrganizationType,
  MemberRole,
  SubscriptionPlan,
  SubscriptionCycle,
  SubscriptionStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function resetAndCleanDatabase() {
  console.log('🧹 [1/4] Clearing all database records across all tables...');

  // Cascade delete in strict dependency order
  await prisma.auditLog.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.upiSubmission.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.feeRecord.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.totpSecret.deleteMany({});
  await prisma.organizationMember.deleteMany({});
  await prisma.organizationSetting.deleteMany({});
  await prisma.subscriptionPayment.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✅ [1/4] All tables emptied cleanly.');

  console.log('👑 [2/4] Creating Master Super Administrator account...');
  const passwordHash = bcrypt.hashSync('Admin@12345', 10);
  const masterAdmin = await prisma.user.create({
    data: {
      email: 'admin@dprtuition.com',
      passwordHash,
      name: 'DPR Master Admin',
      mobile: '+91 98765 43210',
      isSuperAdmin: true,
    },
  });
  console.log(`✅ [2/4] Master Admin created: ${masterAdmin.email}`);

  console.log('🏫 [3/4] Creating Platform Setting (Super Admin UPI Configuration)...');
  await prisma.platformSetting.upsert({
    where: { id: 'master_platform_config' },
    create: {
      id: 'master_platform_config',
      upiId: 'admin@dprtuition.com',
      upiPayeeName: 'DPR Tuition Platform',
      upiEnabled: true,
    },
    update: {
      upiId: 'admin@dprtuition.com',
      upiPayeeName: 'DPR Tuition Platform',
      upiEnabled: true,
    },
  });
  console.log('✅ [3/4] Platform Settings created.');

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: masterAdmin.id,
      action: 'SYSTEM_INITIALIZATION',
      entity: 'SYSTEM',
      entityId: masterAdmin.id,
      details: {
        message: 'System fresh initialized. Zero organizations, zero classes, zero students.',
        timestamp: new Date().toISOString(),
      },
      ipAddress: '127.0.0.1',
    },
  });

  console.log('🎉 Database is now 100% fresh, pristine, and ready for production!');
}

resetAndCleanDatabase()
  .catch((e) => {
    console.error('❌ Error resetting database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
