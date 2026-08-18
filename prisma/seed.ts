import {
  PrismaClient,
  FeeMode,
  DiscountType,
  StudentStatus,
  ClassStatus,
  LateFeeType,
  Gender,
  FeeStatus,
  PaymentMethod,
  DocumentType,
  OrganizationType,
  MemberRole,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_ORG_ID = 'e0000000-0000-4000-a000-000000000001';

async function main() {
  console.log('🌱 Starting Multi-Tenant Education Management SaaS seed...');

  // Clean data
  await prisma.auditLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.upiSubmission.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.feeRecord.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.totpSecret.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organizationSetting.deleteMany();
  await prisma.subscriptionPayment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  // Create Super Admin / Primary User
  const passwordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@12345', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: process.env.ADMIN_EMAIL || 'admin@dprtuition.com',
      passwordHash,
      name: process.env.ADMIN_NAME || 'DPR Master Admin',
      isSuperAdmin: true,
    },
  });

  // Create Primary Organization
  const org = await prisma.organization.create({
    data: {
      id: DEFAULT_ORG_ID,
      name: 'DPR Private Tuition',
      slug: 'dpr-tuition',
      organizationType: OrganizationType.PRIVATE_TUITION,
      status: 'ACTIVE',
    },
  });

  // Create Org Member
  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: adminUser.id,
      role: MemberRole.ORGANIZATION_ADMIN,
      status: 'ACTIVE',
    },
  });

  // Create Org Settings
  await prisma.organizationSetting.create({
    data: {
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
      defaultGraceDays: 5,
      upiId: 'dprtuition@upi',
      upiPayeeName: 'DPR Private Tuition',
      upiEnabled: true,
    },
  });

  // Create Classes
  const class8 = await prisma.class.create({
    data: {
      organizationId: org.id,
      name: 'Class 8',
      defaultMonthlyFee: 800,
      defaultAdmissionFee: 300,
      lateFeeEnabled: true,
      lateFeeType: LateFeeType.PER_DAY,
      lateFeeAmount: 25,
      graceDays: 5,
      status: ClassStatus.ACTIVE,
    },
  });

  const class10 = await prisma.class.create({
    data: {
      organizationId: org.id,
      name: 'Class 10',
      defaultMonthlyFee: 1200,
      defaultAdmissionFee: 500,
      lateFeeEnabled: true,
      lateFeeType: LateFeeType.FIXED,
      lateFeeAmount: 100,
      graceDays: 5,
      status: ClassStatus.ACTIVE,
    },
  });

  // Create Students
  const student1 = await prisma.student.create({
    data: {
      organizationId: org.id,
      studentCode: 'DPR-2026-001',
      name: 'Aarav Sharma',
      fatherName: 'Rajesh Sharma',
      mobile: '+91 98765 11111',
      gender: Gender.MALE,
      classId: class8.id,
      admissionDate: new Date('2026-04-01'),
      feeMode: FeeMode.DEFAULT,
      discountType: DiscountType.NONE,
      discountValue: 0,
      admissionFee: 300,
      status: StudentStatus.ACTIVE,
    },
  });

  const student2 = await prisma.student.create({
    data: {
      organizationId: org.id,
      studentCode: 'DPR-2026-002',
      name: 'Ananya Sen',
      fatherName: 'Subhas Sen',
      mobile: '+91 98765 22222',
      gender: Gender.FEMALE,
      classId: class10.id,
      admissionDate: new Date('2026-04-01'),
      feeMode: FeeMode.CUSTOM,
      customMonthlyFee: 1000,
      discountType: DiscountType.FIXED,
      discountValue: 100,
      admissionFee: 500,
      status: StudentStatus.ACTIVE,
    },
  });

  // Create Fee Records
  const fee1 = await prisma.feeRecord.create({
    data: {
      organizationId: org.id,
      studentId: student1.id,
      classId: class8.id,
      billingPeriodStart: new Date('2026-04-01'),
      billingPeriodEnd: new Date('2026-04-30'),
      dueDate: new Date('2026-05-01'),
      baseAmount: 800,
      admissionFeeAmount: 300,
      discountAmount: 0,
      lateFeeAmount: 0,
      totalAmount: 1100,
      paidAmount: 1100,
      outstandingAmount: 0,
      status: FeeStatus.PAID,
      feeMode: FeeMode.DEFAULT,
    },
  });

  const p1 = await prisma.payment.create({
    data: {
      organizationId: org.id,
      receiptNumber: 'DPR-RC-2026-0001',
      feeRecordId: fee1.id,
      studentId: student1.id,
      amount: 1100,
      paymentMethod: PaymentMethod.CASH,
      paymentDate: new Date('2026-04-05'),
      recordedByUserId: adminUser.id,
    },
  });

  await prisma.document.create({
    data: {
      organizationId: org.id,
      documentType: DocumentType.RECEIPT,
      referenceId: p1.id,
      studentId: student1.id,
      metadata: { receiptNumber: p1.receiptNumber, amount: p1.amount },
    },
  });

  // Seed Audit Logs
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      organizationId: org.id,
      action: 'SYSTEM_INITIALIZATION',
      entity: 'SYSTEM',
      entityId: org.id,
      details: { message: 'Database initialized for multi-tenant SaaS.' },
      ipAddress: '127.0.0.1',
    },
  });

  console.log('🎉 Multi-tenant SaaS database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
