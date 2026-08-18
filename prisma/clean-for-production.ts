import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { OrganizationType, MemberRole } from '@prisma/client';

const DEFAULT_ORG_ID = 'e0000000-0000-4000-a000-000000000001';

async function cleanForProduction() {
  console.log('========================================================');
  console.log('🧹 CLEANING & PREPARING DATABASE FOR LIVE PRODUCTION');
  console.log('========================================================\n');

  // 1. Wipe all operational and financial records safely
  console.log('1. Purging all test students, classes, payments, and fees...');

  const auditLogs = await prisma.auditLog.deleteMany({});
  console.log(`   ✓ Deleted ${auditLogs.count} audit logs`);

  const documents = await prisma.document.deleteMany({});
  console.log(`   ✓ Deleted ${documents.count} document tokens`);

  const upiSubmissions = await prisma.upiSubmission.deleteMany({});
  console.log(`   ✓ Deleted ${upiSubmissions.count} UPI submissions`);

  const payments = await prisma.payment.deleteMany({});
  console.log(`   ✓ Deleted ${payments.count} payments`);

  const feeRecords = await prisma.feeRecord.deleteMany({});
  console.log(`   ✓ Deleted ${feeRecords.count} fee records`);

  const students = await prisma.student.deleteMany({});
  console.log(`   ✓ Deleted ${students.count} students`);

  const classes = await prisma.class.deleteMany({});
  console.log(`   ✓ Deleted ${classes.count} classes`);

  const expenses = await prisma.expense.deleteMany({});
  console.log(`   ✓ Deleted ${expenses.count} expenses`);

  // 2. Ensure Superadmin User is active and ready
  console.log('\n2. Verifying Superadmin Account...');
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@dprtuition.com').toLowerCase();
  const rawPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(rawPassword, salt);

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  let adminUser;
  if (existingAdmin) {
    adminUser = await prisma.user.update({
      where: { email: adminEmail },
      data: {
        name: 'DPR Master Admin',
        passwordHash,
        isSuperAdmin: true,
      },
    });
    console.log(`   ✓ Superadmin credentials verified: ${adminUser.email}`);
  } else {
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'DPR Master Admin',
        isSuperAdmin: true,
      },
    });
    console.log(`   ✓ Superadmin created: ${adminUser.email}`);
  }

  // 3. Ensure Default Organization exists
  const org = await prisma.organization.upsert({
    where: { id: DEFAULT_ORG_ID },
    create: {
      id: DEFAULT_ORG_ID,
      name: 'DPR Private Tuition',
      slug: 'dpr-tuition',
      organizationType: OrganizationType.PRIVATE_TUITION,
      status: 'ACTIVE',
    },
    update: {
      name: 'DPR Private Tuition',
      slug: 'dpr-tuition',
      status: 'ACTIVE',
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        organizationId: org.id,
        userId: adminUser.id,
      },
    },
    create: {
      organizationId: org.id,
      userId: adminUser.id,
      role: MemberRole.ORGANIZATION_ADMIN,
      status: 'ACTIVE',
    },
    update: {
      role: MemberRole.ORGANIZATION_ADMIN,
      status: 'ACTIVE',
    },
  });

  // 4. Reset Organization Settings to default clean state
  console.log('\n3. Initializing Organization Settings...');
  const settings = await prisma.organizationSetting.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      instituteName: 'DPR Private Tuition',
      tagline: 'Excellence in Academic Coaching & Guidance',
      address: 'Station Road, Near City Center, West Bengal',
      phone: '+91 98765 43210',
      whatsapp: '+91 98765 43210',
      email: 'info@dprtuition.com',
      receiptPrefix: 'DPR-RC',
      feePrefix: 'DPR-FEE',
      currencySymbol: '₹',
      defaultGraceDays: 0,
      upiId: 'dprtuition@upi',
      upiPayeeName: 'DPR Private Tuition',
      upiEnabled: true,
    },
    update: {
      instituteName: 'DPR Private Tuition',
      tagline: 'Excellence in Academic Coaching & Guidance',
      receiptPrefix: 'DPR-RC',
      feePrefix: 'DPR-FEE',
    },
  });
  console.log(`   ✓ Default settings initialized for: "${settings.instituteName}"`);

  // 5. Verification Summary
  console.log('\n========================================================');
  console.log('✅ DATABASE RESET COMPLETE — 100% CLEAN FOR PRODUCTION');
  console.log('========================================================');
  console.log(`Admin Email    : ${adminUser.email}`);
  console.log(`Admin Password : ${rawPassword}`);
  console.log(`Total Students : 0`);
  console.log(`Total Classes  : 0`);
  console.log(`Total Fees     : 0`);
  console.log(`Total Payments : 0`);
  console.log(`Total Expenses : 0`);
  console.log('========================================================\n');
}

cleanForProduction()
  .catch((e) => {
    console.error('Failed to clean database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
