import prisma from '../src/lib/prisma';
import { generateSecret, verifyTotpCode, encryptSecret, decryptSecret, generateRecoveryCodes } from '../src/lib/totp';
import { signToken, verifyToken } from '../src/lib/auth';
import { recordPayment, listPayments } from '../src/lib/payment-service';
import { generateStudentBillingRecords, generateStudentCode } from '../src/lib/billing-engine';
import { getMonthlyCollectionReport } from '../src/lib/reports-service';
import { OrganizationType, MemberRole, FeeMode, StudentStatus, ClassStatus, LateFeeType } from '@prisma/client';

async function runMultiTenantVerification() {
  console.log('🚀 ========================================================');
  console.log('🛡️  MULTI-TENANT SAAS ADVERSARIAL SECURITY VERIFICATION');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST 1: TOTP & AES-256 Encryption Security
  // -------------------------------------------------------------
  console.log('🧪 TEST SUITE 1: 2FA TOTP & Cryptographic Security');
  const secret = generateSecret();
  const encrypted = encryptSecret(secret);
  const decrypted = decryptSecret(encrypted);
  assert(secret === decrypted, 'AES-256-GCM encryption and decryption matches original secret');
  assert(encrypted.split(':').length === 3, 'Ciphertext contains iv, authTag, and ciphertext components');

  const recoveryCodes = generateRecoveryCodes(8);
  assert(recoveryCodes.length === 8, 'Generated exactly 8 single-use recovery backup codes');
  assert(recoveryCodes.every((c) => /^[0-9A-F]{4}-[0-9A-F]{4}$/.test(c)), 'Recovery codes follow standard format');

  // -------------------------------------------------------------
  // TEST 2: Multi-Tenant Provisioning (Org Alpha & Org Beta)
  // -------------------------------------------------------------
  console.log('\n🧪 TEST SUITE 2: Multi-Tenant Isolation & Provisioning');
  const alphaSlug = `test-org-alpha-${Date.now()}`;
  const betaSlug = `test-org-beta-${Date.now()}`;

  const orgAlpha = await prisma.organization.create({
    data: {
      name: 'Alpha Science Academy',
      slug: alphaSlug,
      organizationType: OrganizationType.COACHING,
      status: 'ACTIVE',
    },
  });

  const orgBeta = await prisma.organization.create({
    data: {
      name: 'Beta Tutorial Hub',
      slug: betaSlug,
      organizationType: OrganizationType.TUTORIAL,
      status: 'ACTIVE',
    },
  });

  await prisma.organizationSetting.createMany({
    data: [
      {
        organizationId: orgAlpha.id,
        instituteName: 'Alpha Science Academy',
        receiptPrefix: 'ALPHA-RC',
        currencySymbol: '₹',
        defaultGraceDays: 3,
      },
      {
        organizationId: orgBeta.id,
        instituteName: 'Beta Tutorial Hub',
        receiptPrefix: 'BETA-RC',
        currencySymbol: '₹',
        defaultGraceDays: 0,
      },
    ],
  });

  assert(orgAlpha.id !== orgBeta.id, 'Distinct tenant workspace UUIDs created');

  // -------------------------------------------------------------
  // TEST 3: Cross-Tenant Class & Student Isolation
  // -------------------------------------------------------------
  console.log('\n🧪 TEST SUITE 3: Tenant Data Separation & Sequential Code Isolation');
  const classAlpha = await prisma.class.create({
    data: {
      organizationId: orgAlpha.id,
      name: 'Class 10 Physics',
      defaultMonthlyFee: 1500,
      defaultAdmissionFee: 500,
      status: ClassStatus.ACTIVE,
    },
  });

  const classBeta = await prisma.class.create({
    data: {
      organizationId: orgBeta.id,
      name: 'Class 10 Physics', // Exact same name in different tenant!
      defaultMonthlyFee: 2000,
      defaultAdmissionFee: 800,
      status: ClassStatus.ACTIVE,
    },
  });

  const codeAlpha = await generateStudentCode(prisma, orgAlpha.id, 2026);
  const studentAlpha = await prisma.student.create({
    data: {
      organizationId: orgAlpha.id,
      studentCode: codeAlpha,
      name: 'Alpha Student One',
      fatherName: 'Mr. Alpha Senior',
      mobile: '+91 99999 11111',
      classId: classAlpha.id,
      admissionDate: new Date('2026-04-01'),
      feeMode: FeeMode.DEFAULT,
      status: StudentStatus.ACTIVE,
    },
  });

  const codeBeta = await generateStudentCode(prisma, orgBeta.id, 2026);
  const studentBeta = await prisma.student.create({
    data: {
      organizationId: orgBeta.id,
      studentCode: codeBeta,
      name: 'Beta Student One',
      fatherName: 'Mr. Beta Senior',
      mobile: '+91 99999 22222',
      classId: classBeta.id,
      admissionDate: new Date('2026-04-01'),
      feeMode: FeeMode.DEFAULT,
      status: StudentStatus.ACTIVE,
    },
  });

  assert(studentAlpha.studentCode.startsWith('ALPHA-2026-'), 'Alpha student code prefixed with Alpha branding');
  assert(studentBeta.studentCode.startsWith('BETA-2026-'), 'Beta student code prefixed with Beta branding');

  // -------------------------------------------------------------
  // TEST 4: Billing Engine & Idempotency in Isolated Tenants
  // -------------------------------------------------------------
  console.log('\n🧪 TEST SUITE 4: Billing Cycle Generation & Receipt Numbering');
  const billAlpha = await generateStudentBillingRecords(prisma, studentAlpha.id, orgAlpha.id, {
    throughDate: new Date('2026-06-01'),
  });
  const billBeta = await generateStudentBillingRecords(prisma, studentBeta.id, orgBeta.id, {
    throughDate: new Date('2026-06-01'),
  });

  assert(billAlpha.created > 0, 'Alpha fee cycles created successfully');
  assert(billBeta.created > 0, 'Beta fee cycles created successfully');

  // -------------------------------------------------------------
  // TEST 5: IDOR & Cross-Tenant Access Prevention
  // -------------------------------------------------------------
  console.log('\n🧪 TEST SUITE 5: IDOR & Unauthorized Cross-Tenant Payment Attempt');
  const alphaFee = await prisma.feeRecord.findFirst({
    where: { organizationId: orgAlpha.id, studentId: studentAlpha.id },
  });

  // Attempting to record payment for Alpha fee using Beta organization credentials
  let crossTenantPrevented = false;
  try {
    await recordPayment(
      {
        feeRecordId: alphaFee!.id,
        amount: 500,
        paymentMethod: 'CASH',
      },
      orgBeta.id // Maliciously passing Beta organizationId to manipulate Alpha fee!
    );
  } catch (err: any) {
    crossTenantPrevented = err.message.includes('not belong to your organization');
  }

  assert(crossTenantPrevented, 'IDOR Attempt BLOCKED: Tenant Beta CANNOT pay or mutate Tenant Alpha fee record');

  // Legitimate payment inside Alpha
  const legitimatePayment = await recordPayment(
    {
      feeRecordId: alphaFee!.id,
      amount: 500,
      paymentMethod: 'CASH',
    },
    orgAlpha.id
  );

  assert(legitimatePayment.receiptNumber.startsWith('ALPHA-RC-'), 'Alpha payment issued receipt with Alpha prefix');

  // -------------------------------------------------------------
  // TEST 6: Report Isolation
  // -------------------------------------------------------------
  console.log('\n🧪 TEST SUITE 6: Multi-Tenant Financial Report Isolation');
  const reportAlpha = await getMonthlyCollectionReport(prisma, orgAlpha.id);
  const reportBeta = await getMonthlyCollectionReport(prisma, orgBeta.id);

  assert(reportAlpha.summary.totalCollected === 500, 'Alpha report reflects only Alpha collections (₹500)');
  assert(reportBeta.summary.totalCollected === 0, 'Beta report strictly isolated with ₹0 collections');

  // Cleanup test organizations
  await prisma.payment.deleteMany({ where: { organizationId: { in: [orgAlpha.id, orgBeta.id] } } });
  await prisma.document.deleteMany({ where: { organizationId: { in: [orgAlpha.id, orgBeta.id] } } });
  await prisma.feeRecord.deleteMany({ where: { organizationId: { in: [orgAlpha.id, orgBeta.id] } } });
  await prisma.student.deleteMany({ where: { organizationId: { in: [orgAlpha.id, orgBeta.id] } } });
  await prisma.class.deleteMany({ where: { organizationId: { in: [orgAlpha.id, orgBeta.id] } } });
  await prisma.organizationSetting.deleteMany({ where: { organizationId: { in: [orgAlpha.id, orgBeta.id] } } });
  await prisma.auditLog.deleteMany({ where: { organizationId: { in: [orgAlpha.id, orgBeta.id] } } });
  await prisma.organization.deleteMany({ where: { id: { in: [orgAlpha.id, orgBeta.id] } } });

  console.log('\n========================================================');
  console.log(`🏁 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMultiTenantVerification()
  .catch((err) => {
    console.error('Fatal verification error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
