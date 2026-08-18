import {
  PrismaClient,
  ClassStatus,
  LateFeeType,
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

  console.log('🏫 [3/4] Creating Primary Organization (DPR Private Tuition)...');
  const org = await prisma.organization.create({
    data: {
      id: crypto.randomUUID(),
      publicId: crypto.randomUUID(),
      name: 'DPR Private Tuition',
      slug: 'dpr-tuition',
      organizationType: OrganizationType.PRIVATE_TUITION,
      status: 'ACTIVE',
    },
  });

  // Assign Master Admin as Organization Admin
  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: masterAdmin.id,
      role: MemberRole.ORGANIZATION_ADMIN,
      status: 'ACTIVE',
    },
  });

  // Set up Institute Settings
  await prisma.organizationSetting.create({
    data: {
      organizationId: org.id,
      instituteName: 'DPR Private Tuition',
      tagline: 'Excellence in Coaching & Fee Management',
      address: 'City Center, West Bengal, India',
      phone: '+91 98765 43210',
      whatsapp: '+91 98765 43210',
      email: 'admin@dprtuition.com',
      receiptPrefix: 'DPR-RC',
      feePrefix: 'DPR-FEE',
      currencySymbol: '₹',
      defaultGraceDays: 5,
      upiId: 'dprtuition@upi',
      upiPayeeName: 'DPR Private Tuition',
      upiEnabled: true,
    },
  });

  // Set up 10-Year Active Enterprise Subscription
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 10);

  await prisma.subscription.create({
    data: {
      organizationId: org.id,
      plan: SubscriptionPlan.PREMIUM,
      pricePerCycle: 0,
      billingCycle: SubscriptionCycle.YEARLY,
      startDate: new Date(),
      expiryDate,
      status: SubscriptionStatus.ACTIVE,
      notes: 'Primary Master Platform Workspace',
      createdByUserId: masterAdmin.id,
    },
  });
  console.log(`✅ [3/4] Primary Organization ready: ${org.name}`);

  console.log('📚 [4/4] Provisioning standard default classes...');
  const defaultClasses = [
    { name: 'Class 5', fee: 500, admission: 200 },
    { name: 'Class 6', fee: 600, admission: 250 },
    { name: 'Class 7', fee: 700, admission: 300 },
    { name: 'Class 8', fee: 800, admission: 350 },
    { name: 'Class 9', fee: 900, admission: 400 },
    { name: 'Class 10', fee: 1000, admission: 500 },
  ];

  for (const cls of defaultClasses) {
    await prisma.class.create({
      data: {
        organizationId: org.id,
        name: cls.name,
        defaultMonthlyFee: cls.fee,
        defaultAdmissionFee: cls.admission,
        lateFeeEnabled: true,
        lateFeeType: LateFeeType.PER_DAY,
        lateFeeAmount: 20,
        graceDays: 5,
        status: ClassStatus.ACTIVE,
      },
    });
  }
  console.log(`✅ [4/4] Created ${defaultClasses.length} standard classes (Class 5 - Class 10).`);

  // Record initial clean audit trail
  await prisma.auditLog.create({
    data: {
      userId: masterAdmin.id,
      organizationId: org.id,
      action: 'SYSTEM_INITIALIZATION',
      entity: 'SYSTEM',
      entityId: org.id,
      details: {
        message: 'Database reset and freshly initialized with zero dummy records.',
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
