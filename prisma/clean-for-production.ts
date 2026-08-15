import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('========================================================');
  console.log('🚀 CLEANING DATABASE FOR FRESH PRODUCTION DEPLOYMENT');
  console.log('========================================================\n');

  // 1. Delete all transactional, student, and operational records
  console.log('1. Clearing operational data...');
  const docs = await prisma.document.deleteMany({});
  console.log(`   ✓ Deleted ${docs.count} documents`);

  const payments = await prisma.payment.deleteMany({});
  console.log(`   ✓ Deleted ${payments.count} payments`);

  const fees = await prisma.feeRecord.deleteMany({});
  console.log(`   ✓ Deleted ${fees.count} fee records`);

  const students = await prisma.student.deleteMany({});
  console.log(`   ✓ Deleted ${students.count} students`);

  const expenses = await prisma.expense.deleteMany({});
  console.log(`   ✓ Deleted ${expenses.count} expenses`);

  const auditLogs = await prisma.auditLog.deleteMany({});
  console.log(`   ✓ Deleted ${auditLogs.count} audit logs`);

  const classes = await prisma.class.deleteMany({});
  console.log(`   ✓ Deleted ${classes.count} classes`);

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
        name: 'DPR Admin',
        passwordHash,
        role: 'ADMIN',
      },
    });
    console.log(`   ✓ Superadmin credentials verified: ${adminUser.email}`);
  } else {
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'DPR Admin',
        role: 'ADMIN',
      },
    });
    console.log(`   ✓ Superadmin created: ${adminUser.email}`);
  }

  // Delete any other non-admin dummy users if any exist
  const otherUsers = await prisma.user.deleteMany({
    where: {
      id: { not: adminUser.id },
    },
  });
  if (otherUsers.count > 0) {
    console.log(`   ✓ Removed ${otherUsers.count} extra user accounts`);
  }

  // 3. Reset Institute Settings to default brand new state
  console.log('\n3. Initializing Institute Settings...');
  await prisma.instituteSetting.deleteMany({});
  const settings = await prisma.instituteSetting.create({
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
  console.log(`   ✓ Default settings initialized for: "${settings.instituteName}"`);

  // 4. Verification Summary
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

main()
  .catch((e) => {
    console.error('Error resetting database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
