import { PrismaClient, FeeMode, DiscountType, StudentStatus, ClassStatus, LateFeeType, Gender, FeeStatus, PaymentMethod, DocumentType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting DPR Fee Management System database seed...');

  // 1. Clean existing records in dependency order
  console.log('🧹 Cleaning existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.feeRecord.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.instituteSetting.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Admin User
  console.log('👤 Seeding Admin User...');
  const passwordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@12345', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: process.env.ADMIN_EMAIL || 'admin@dprtuition.com',
      passwordHash,
      name: process.env.ADMIN_NAME || 'DPR Admin',
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin created: ${adminUser.email}`);

  // 3. Seed Institute Settings
  console.log('🏫 Seeding Institute Settings...');
  const instituteSettings = await prisma.instituteSetting.create({
    data: {
      instituteName: 'DPR Private Tuition',
      tagline: 'Excellence in Academic Coaching & Guidance',
      address: 'Station Road, Near City Center, West Bengal',
      phone: '+91 98765 43210',
      whatsapp: '+91 98765 43210',
      email: 'info@dprtuition.com',
      receiptPrefix: 'DPR-RC',
      currencySymbol: '₹',
      defaultGraceDays: 5,
    },
  });
  console.log(`✅ Institute settings created: ${instituteSettings.instituteName}`);

  // 4. Seed Classes
  console.log('📚 Seeding Classes...');
  const class5 = await prisma.class.create({
    data: {
      name: 'Class 5',
      defaultMonthlyFee: 500,
      defaultAdmissionFee: 200,
      lateFeeEnabled: false,
      lateFeeType: LateFeeType.FIXED,
      lateFeeAmount: 0,
      graceDays: 5,
      status: ClassStatus.ACTIVE,
    },
  });

  const class6 = await prisma.class.create({
    data: {
      name: 'Class 6',
      defaultMonthlyFee: 600,
      defaultAdmissionFee: 200,
      lateFeeEnabled: false,
      lateFeeType: LateFeeType.FIXED,
      lateFeeAmount: 0,
      graceDays: 5,
      status: ClassStatus.ACTIVE,
    },
  });

  const class7 = await prisma.class.create({
    data: {
      name: 'Class 7',
      defaultMonthlyFee: 700,
      defaultAdmissionFee: 250,
      lateFeeEnabled: false,
      lateFeeType: LateFeeType.FIXED,
      lateFeeAmount: 0,
      graceDays: 5,
      status: ClassStatus.ACTIVE,
    },
  });

  const class8 = await prisma.class.create({
    data: {
      name: 'Class 8',
      defaultMonthlyFee: 800,
      defaultAdmissionFee: 300,
      lateFeeEnabled: true,
      lateFeeType: LateFeeType.FIXED,
      lateFeeAmount: 50,
      graceDays: 5,
      status: ClassStatus.ACTIVE,
    },
  });
  console.log('✅ 4 Classes created (Class 5, Class 6, Class 7, Class 8)');

  // 5. Seed Students
  console.log('🎓 Seeding Students...');
  // Student 1: Rahul Sharma (Class 8, DEFAULT fee mode, May 3 admission)
  const student1 = await prisma.student.create({
    data: {
      studentCode: 'DPR-2026-001',
      name: 'Rahul Sharma',
      fatherName: 'Alok Sharma',
      motherName: 'Sunita Sharma',
      guardianName: 'Alok Sharma',
      mobile: '9876511223',
      whatsappNumber: '919876511223',
      address: '12 Park Street, Kolkata',
      dob: new Date('2012-04-14'),
      gender: Gender.MALE,
      school: 'St. Xavier High School',
      classId: class8.id,
      admissionDate: new Date('2026-05-03'),
      joiningDate: new Date('2026-05-03'),
      feeMode: FeeMode.DEFAULT,
      admissionFee: 300,
      status: StudentStatus.ACTIVE,
    },
  });

  // Student 2: Priya Das (Class 7, CUSTOM fee mode ₹550, May 15 admission)
  const student2 = await prisma.student.create({
    data: {
      studentCode: 'DPR-2026-002',
      name: 'Priya Das',
      fatherName: 'Subhash Das',
      motherName: 'Anita Das',
      guardianName: 'Anita Das',
      mobile: '9832144556',
      whatsappNumber: '919832144556',
      address: '45 Station Road, Howrah',
      dob: new Date('2013-09-22'),
      gender: Gender.FEMALE,
      school: 'Modern Girls Academy',
      classId: class7.id,
      admissionDate: new Date('2026-05-15'),
      joiningDate: new Date('2026-05-15'),
      feeMode: FeeMode.CUSTOM,
      customMonthlyFee: 550,
      admissionFee: 250,
      status: StudentStatus.ACTIVE,
    },
  });

  // Student 3: Arjun Banerjee (Class 6, DEFAULT mode with 10% discount, Mar 31 month-end admission)
  const student3 = await prisma.student.create({
    data: {
      studentCode: 'DPR-2026-003',
      name: 'Arjun Banerjee',
      fatherName: 'Debasis Banerjee',
      motherName: 'Moumita Banerjee',
      guardianName: 'Debasis Banerjee',
      mobile: '9811223344',
      whatsappNumber: '919811223344',
      address: '88 Lake Gardens, Kolkata',
      dob: new Date('2014-01-10'),
      gender: Gender.MALE,
      school: 'South Point High School',
      classId: class6.id,
      admissionDate: new Date('2026-03-31'),
      joiningDate: new Date('2026-03-31'),
      feeMode: FeeMode.DEFAULT,
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      admissionFee: 200,
      status: StudentStatus.ACTIVE,
    },
  });

  // Student 4: Sneha Roy (Class 5, DEFAULT mode, Feb 28 short month admission)
  const student4 = await prisma.student.create({
    data: {
      studentCode: 'DPR-2026-004',
      name: 'Sneha Roy',
      fatherName: 'Bimal Roy',
      motherName: 'Kalyani Roy',
      guardianName: 'Bimal Roy',
      mobile: '9844556677',
      whatsappNumber: '919844556677',
      address: '21 Gariahat Road, Kolkata',
      dob: new Date('2015-11-05'),
      gender: Gender.FEMALE,
      school: 'DPS Ruby Park',
      classId: class5.id,
      admissionDate: new Date('2026-02-28'),
      joiningDate: new Date('2026-02-28'),
      feeMode: FeeMode.DEFAULT,
      admissionFee: 200,
      status: StudentStatus.ACTIVE,
    },
  });

  // Student 5: Amitav Ghosh (Class 8, CUSTOM mode ₹650 with ₹50 FIXED discount, Jun 1 admission)
  const student5 = await prisma.student.create({
    data: {
      studentCode: 'DPR-2026-005',
      name: 'Amitav Ghosh',
      fatherName: 'Pranab Ghosh',
      motherName: 'Sujata Ghosh',
      guardianName: 'Pranab Ghosh',
      mobile: '9877889900',
      whatsappNumber: '919877889900',
      address: '15 Salt Lake Sector 2, Kolkata',
      dob: new Date('2012-07-19'),
      gender: Gender.MALE,
      school: 'Don Bosco Park Circus',
      classId: class8.id,
      admissionDate: new Date('2026-06-01'),
      joiningDate: new Date('2026-06-01'),
      feeMode: FeeMode.CUSTOM,
      customMonthlyFee: 650,
      discountType: DiscountType.FIXED,
      discountValue: 50,
      admissionFee: 300,
      status: StudentStatus.ACTIVE,
    },
  });

  // Student 6: Ananya Sen (Class 6, DEFAULT mode, Apr 10 admission, INACTIVE status)
  const student6 = await prisma.student.create({
    data: {
      studentCode: 'DPR-2026-006',
      name: 'Ananya Sen',
      fatherName: 'Ranjit Sen',
      motherName: 'Rupa Sen',
      guardianName: 'Ranjit Sen',
      mobile: '9899001122',
      whatsappNumber: '919899001122',
      address: '33 Shyambazar, Kolkata',
      dob: new Date('2014-06-12'),
      gender: Gender.FEMALE,
      school: 'Bethune Collegiate School',
      classId: class6.id,
      admissionDate: new Date('2026-04-10'),
      joiningDate: new Date('2026-04-10'),
      feeMode: FeeMode.DEFAULT,
      admissionFee: 200,
      status: StudentStatus.INACTIVE,
    },
  });

  // Student 7: Sourav Mukherjee (Class 7, DEFAULT mode, Jan 15 admission)
  const student7 = await prisma.student.create({
    data: {
      studentCode: 'DPR-2026-007',
      name: 'Sourav Mukherjee',
      fatherName: 'Tarun Mukherjee',
      motherName: 'Gita Mukherjee',
      guardianName: 'Tarun Mukherjee',
      mobile: '9822334455',
      whatsappNumber: '919822334455',
      address: '7 Ballygunge Circular Rd, Kolkata',
      dob: new Date('2013-03-08'),
      gender: Gender.MALE,
      school: 'Calcutta Boys School',
      classId: class7.id,
      admissionDate: new Date('2026-01-15'),
      joiningDate: new Date('2026-01-15'),
      feeMode: FeeMode.DEFAULT,
      admissionFee: 250,
      status: StudentStatus.ACTIVE,
    },
  });
  console.log('✅ 7 Students created with varied admission dates and fee modes');

  // 6. Seed Fee Records & Payments
  console.log('💳 Seeding Fee Records & Payments...');

  // --- Student 1 (Rahul Sharma): Admitted May 3, 2026 ---
  // Cycle 0: May 3 – Jun 2, due Jun 3. Total ₹1100 (₹800 + ₹300 admission). PAID.
  const r1_c0 = await prisma.feeRecord.create({
    data: {
      studentId: student1.id,
      classId: class8.id,
      billingPeriodStart: new Date('2026-05-03'),
      billingPeriodEnd: new Date('2026-06-02'),
      dueDate: new Date('2026-06-03'),
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
      receiptNumber: 'DPR-RC-2026-0001',
      feeRecordId: r1_c0.id,
      studentId: student1.id,
      amount: 1100,
      paymentMethod: PaymentMethod.CASH,
      notes: 'Initial admission fee and 1st month tuition fee',
      paymentDate: new Date('2026-05-03T10:30:00Z'),
      recordedByUserId: adminUser.id,
    },
  });
  await prisma.document.create({
    data: {
      documentType: DocumentType.RECEIPT,
      referenceId: p1.id,
      studentId: student1.id,
      metadata: { receiptNumber: p1.receiptNumber, amount: p1.amount },
    },
  });

  // Cycle 1: Jun 3 – Jul 2, due Jul 3. Total ₹800. PAID.
  const r1_c1 = await prisma.feeRecord.create({
    data: {
      studentId: student1.id,
      classId: class8.id,
      billingPeriodStart: new Date('2026-06-03'),
      billingPeriodEnd: new Date('2026-07-02'),
      dueDate: new Date('2026-07-03'),
      baseAmount: 800,
      admissionFeeAmount: 0,
      discountAmount: 0,
      lateFeeAmount: 0,
      totalAmount: 800,
      paidAmount: 800,
      outstandingAmount: 0,
      status: FeeStatus.PAID,
      feeMode: FeeMode.DEFAULT,
    },
  });
  const p2 = await prisma.payment.create({
    data: {
      receiptNumber: 'DPR-RC-2026-0002',
      feeRecordId: r1_c1.id,
      studentId: student1.id,
      amount: 800,
      paymentMethod: PaymentMethod.UPI,
      transactionId: 'UTR49281093847',
      notes: 'June month tuition fee via Google Pay',
      paymentDate: new Date('2026-06-05T14:15:00Z'),
      recordedByUserId: adminUser.id,
    },
  });
  await prisma.document.create({
    data: {
      documentType: DocumentType.RECEIPT,
      referenceId: p2.id,
      studentId: student1.id,
      metadata: { receiptNumber: p2.receiptNumber, amount: p2.amount },
    },
  });

  // Cycle 2: Jul 3 – Aug 2, due Aug 3. Total ₹800. PARTIALLY_PAID (Paid ₹500, Due ₹300).
  const r1_c2 = await prisma.feeRecord.create({
    data: {
      studentId: student1.id,
      classId: class8.id,
      billingPeriodStart: new Date('2026-07-03'),
      billingPeriodEnd: new Date('2026-08-02'),
      dueDate: new Date('2026-08-03'),
      baseAmount: 800,
      admissionFeeAmount: 0,
      discountAmount: 0,
      lateFeeAmount: 0,
      totalAmount: 800,
      paidAmount: 500,
      outstandingAmount: 300,
      status: FeeStatus.PARTIALLY_PAID,
      feeMode: FeeMode.DEFAULT,
    },
  });
  const p3 = await prisma.payment.create({
    data: {
      receiptNumber: 'DPR-RC-2026-0003',
      feeRecordId: r1_c2.id,
      studentId: student1.id,
      amount: 500,
      paymentMethod: PaymentMethod.UPI,
      transactionId: 'UTR58291039482',
      notes: 'Partial payment of ₹500 via PhonePe',
      paymentDate: new Date('2026-07-10T16:00:00Z'),
      recordedByUserId: adminUser.id,
    },
  });
  await prisma.document.create({
    data: {
      documentType: DocumentType.RECEIPT,
      referenceId: p3.id,
      studentId: student1.id,
      metadata: { receiptNumber: p3.receiptNumber, amount: p3.amount },
    },
  });

  // Cycle 3: Aug 3 – Sep 2, due Sep 3. Total ₹800. UPCOMING.
  await prisma.feeRecord.create({
    data: {
      studentId: student1.id,
      classId: class8.id,
      billingPeriodStart: new Date('2026-08-03'),
      billingPeriodEnd: new Date('2026-09-02'),
      dueDate: new Date('2026-09-03'),
      baseAmount: 800,
      admissionFeeAmount: 0,
      discountAmount: 0,
      lateFeeAmount: 0,
      totalAmount: 800,
      paidAmount: 0,
      outstandingAmount: 800,
      status: FeeStatus.UPCOMING,
      feeMode: FeeMode.DEFAULT,
    },
  });

  // --- Student 2 (Priya Das): Admitted May 15, 2026, CUSTOM ₹550 ---
  // Cycle 0: May 15 – Jun 14, due Jun 15. Total ₹800 (₹550 + ₹250 admission). PAID.
  const r2_c0 = await prisma.feeRecord.create({
    data: {
      studentId: student2.id,
      classId: class7.id,
      billingPeriodStart: new Date('2026-05-15'),
      billingPeriodEnd: new Date('2026-06-14'),
      dueDate: new Date('2026-06-15'),
      baseAmount: 550,
      admissionFeeAmount: 250,
      discountAmount: 0,
      lateFeeAmount: 0,
      totalAmount: 800,
      paidAmount: 800,
      outstandingAmount: 0,
      status: FeeStatus.PAID,
      feeMode: FeeMode.CUSTOM,
    },
  });
  const p4 = await prisma.payment.create({
    data: {
      receiptNumber: 'DPR-RC-2026-0004',
      feeRecordId: r2_c0.id,
      studentId: student2.id,
      amount: 800,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      transactionId: 'IMPS99238472',
      notes: 'Admission fee + May tuition fee',
      paymentDate: new Date('2026-05-15T11:00:00Z'),
      recordedByUserId: adminUser.id,
    },
  });
  await prisma.document.create({
    data: {
      documentType: DocumentType.RECEIPT,
      referenceId: p4.id,
      studentId: student2.id,
      metadata: { receiptNumber: p4.receiptNumber, amount: p4.amount },
    },
  });

  // Cycle 1: Jun 15 – Jul 14, due Jul 15. Total ₹550. Paid in 2 installments (₹200 + ₹350 = ₹550). PAID.
  const r2_c1 = await prisma.feeRecord.create({
    data: {
      studentId: student2.id,
      classId: class7.id,
      billingPeriodStart: new Date('2026-06-15'),
      billingPeriodEnd: new Date('2026-07-14'),
      dueDate: new Date('2026-07-15'),
      baseAmount: 550,
      admissionFeeAmount: 0,
      discountAmount: 0,
      lateFeeAmount: 0,
      totalAmount: 550,
      paidAmount: 550,
      outstandingAmount: 0,
      status: FeeStatus.PAID,
      feeMode: FeeMode.CUSTOM,
    },
  });
  const p5 = await prisma.payment.create({
    data: {
      receiptNumber: 'DPR-RC-2026-0005',
      feeRecordId: r2_c1.id,
      studentId: student2.id,
      amount: 200,
      paymentMethod: PaymentMethod.CASH,
      notes: '1st installment of June fee',
      paymentDate: new Date('2026-06-20T17:30:00Z'),
      recordedByUserId: adminUser.id,
    },
  });
  const p6 = await prisma.payment.create({
    data: {
      receiptNumber: 'DPR-RC-2026-0006',
      feeRecordId: r2_c1.id,
      studentId: student2.id,
      amount: 350,
      paymentMethod: PaymentMethod.UPI,
      transactionId: 'UTR19283746501',
      notes: '2nd installment of June fee - fully paid',
      paymentDate: new Date('2026-07-01T12:45:00Z'),
      recordedByUserId: adminUser.id,
    },
  });
  await prisma.document.create({
    data: {
      documentType: DocumentType.RECEIPT,
      referenceId: p5.id,
      studentId: student2.id,
      metadata: { receiptNumber: p5.receiptNumber, amount: p5.amount },
    },
  });
  await prisma.document.create({
    data: {
      documentType: DocumentType.RECEIPT,
      referenceId: p6.id,
      studentId: student2.id,
      metadata: { receiptNumber: p6.receiptNumber, amount: p6.amount },
    },
  });

  // Cycle 2: Jul 15 – Aug 14, due Aug 15. Total ₹550. DUE today.
  const r2_c2 = await prisma.feeRecord.create({
    data: {
      studentId: student2.id,
      classId: class7.id,
      billingPeriodStart: new Date('2026-07-15'),
      billingPeriodEnd: new Date('2026-08-14'),
      dueDate: new Date('2026-08-15'),
      baseAmount: 550,
      admissionFeeAmount: 0,
      discountAmount: 0,
      lateFeeAmount: 0,
      totalAmount: 550,
      paidAmount: 0,
      outstandingAmount: 550,
      status: FeeStatus.DUE,
      feeMode: FeeMode.CUSTOM,
    },
  });
  await prisma.document.create({
    data: {
      documentType: DocumentType.REMINDER,
      referenceId: r2_c2.id,
      studentId: student2.id,
      metadata: { amountDue: 550, dueDate: '2026-08-15' },
    },
  });

  // Cycle 3: Aug 15 – Sep 14, due Sep 15. Total ₹550. UPCOMING.
  await prisma.feeRecord.create({
    data: {
      studentId: student2.id,
      classId: class7.id,
      billingPeriodStart: new Date('2026-08-15'),
      billingPeriodEnd: new Date('2026-09-14'),
      dueDate: new Date('2026-09-15'),
      baseAmount: 550,
      admissionFeeAmount: 0,
      discountAmount: 0,
      lateFeeAmount: 0,
      totalAmount: 550,
      paidAmount: 0,
      outstandingAmount: 550,
      status: FeeStatus.UPCOMING,
      feeMode: FeeMode.CUSTOM,
    },
  });

  // --- Student 3 (Arjun Banerjee): Admitted Mar 31, 2026 (Month-End Anchor) ---
  // Cycle 0: Mar 31 – Apr 29, due Apr 30. Base ₹600, 10% disc (₹60) = ₹540 + ₹200 admission = ₹740. PAID.
  const r3_c0 = await prisma.feeRecord.create({
    data: {
      studentId: student3.id,
      classId: class6.id,
      billingPeriodStart: new Date('2026-03-31'),
      billingPeriodEnd: new Date('2026-04-29'),
      dueDate: new Date('2026-04-30'),
      baseAmount: 600,
      admissionFeeAmount: 200,
      discountAmount: 60,
      lateFeeAmount: 0,
      totalAmount: 740,
      paidAmount: 740,
      outstandingAmount: 0,
      status: FeeStatus.PAID,
      feeMode: FeeMode.DEFAULT,
    },
  });
  const p7 = await prisma.payment.create({
    data: {
      receiptNumber: 'DPR-RC-2026-0007',
      feeRecordId: r3_c0.id,
      studentId: student3.id,
      amount: 740,
      paymentMethod: PaymentMethod.UPI,
      transactionId: 'UTR88392019482',
      notes: 'Admission + April cycle',
      paymentDate: new Date('2026-03-31T09:15:00Z'),
      recordedByUserId: adminUser.id,
    },
  });
  await prisma.document.create({
    data: {
      documentType: DocumentType.RECEIPT,
      referenceId: p7.id,
      studentId: student3.id,
      metadata: { receiptNumber: p7.receiptNumber, amount: p7.amount },
    },
  });

  // Cycle 1: Apr 30 – May 30, due May 31. Total ₹540. PAID.
  const r3_c1 = await prisma.feeRecord.create({
    data: {
      studentId: student3.id,
      classId: class6.id,
      billingPeriodStart: new Date('2026-04-30'),
      billingPeriodEnd: new Date('2026-05-30'),
      dueDate: new Date('2026-05-31'),
      baseAmount: 600,
      admissionFeeAmount: 0,
      discountAmount: 60,
      lateFeeAmount: 0,
      totalAmount: 540,
      paidAmount: 540,
      outstandingAmount: 0,
      status: FeeStatus.PAID,
      feeMode: FeeMode.DEFAULT,
    },
  });
  const p8 = await prisma.payment.create({
    data: {
      receiptNumber: 'DPR-RC-2026-0008',
      feeRecordId: r3_c1.id,
      studentId: student3.id,
      amount: 540,
      paymentMethod: PaymentMethod.CASH,
      paymentDate: new Date('2026-05-25T15:00:00Z'),
      recordedByUserId: adminUser.id,
    },
  });
  await prisma.document.create({
    data: {
      documentType: DocumentType.RECEIPT,
      referenceId: p8.id,
      studentId: student3.id,
      metadata: { receiptNumber: p8.receiptNumber, amount: p8.amount },
    },
  });

  // Cycle 2: May 31 – Jun 29, due Jun 30. Total ₹540. PAID.
  const r3_c2 = await prisma.feeRecord.create({
    data: {
      studentId: student3.id,
      classId: class6.id,
      billingPeriodStart: new Date('2026-05-31'),
      billingPeriodEnd: new Date('2026-06-29'),
      dueDate: new Date('2026-06-30'),
      baseAmount: 600,
      admissionFeeAmount: 0,
      discountAmount: 60,
      lateFeeAmount: 0,
      totalAmount: 540,
      paidAmount: 540,
      outstandingAmount: 0,
      status: FeeStatus.PAID,
      feeMode: FeeMode.DEFAULT,
    },
  });
  const p9 = await prisma.payment.create({
    data: {
      receiptNumber: 'DPR-RC-2026-0009',
      feeRecordId: r3_c2.id,
      studentId: student3.id,
      amount: 540,
      paymentMethod: PaymentMethod.CARD,
      transactionId: 'POS-TXN-88219',
      paymentDate: new Date('2026-06-28T18:00:00Z'),
      recordedByUserId: adminUser.id,
    },
  });
  await prisma.document.create({
    data: {
      documentType: DocumentType.RECEIPT,
      referenceId: p9.id,
      studentId: student3.id,
      metadata: { receiptNumber: p9.receiptNumber, amount: p9.amount },
    },
  });

  // Cycle 3: Jun 30 – Jul 30, due Jul 31. Total ₹540. OVERDUE.
  const r3_c3 = await prisma.feeRecord.create({
    data: {
      studentId: student3.id,
      classId: class6.id,
      billingPeriodStart: new Date('2026-06-30'),
      billingPeriodEnd: new Date('2026-07-30'),
      dueDate: new Date('2026-07-31'),
      baseAmount: 600,
      admissionFeeAmount: 0,
      discountAmount: 60,
      lateFeeAmount: 0,
      totalAmount: 540,
      paidAmount: 0,
      outstandingAmount: 540,
      status: FeeStatus.OVERDUE,
      feeMode: FeeMode.DEFAULT,
    },
  });
  await prisma.document.create({
    data: {
      documentType: DocumentType.REMINDER,
      referenceId: r3_c3.id,
      studentId: student3.id,
      metadata: { amountDue: 540, dueDate: '2026-07-31', isOverdue: true },
    },
  });

  // Cycle 4: Jul 31 – Aug 30, due Aug 31. Total ₹540. UPCOMING.
  await prisma.feeRecord.create({
    data: {
      studentId: student3.id,
      classId: class6.id,
      billingPeriodStart: new Date('2026-07-31'),
      billingPeriodEnd: new Date('2026-08-30'),
      dueDate: new Date('2026-08-31'),
      baseAmount: 600,
      admissionFeeAmount: 0,
      discountAmount: 60,
      lateFeeAmount: 0,
      totalAmount: 540,
      paidAmount: 0,
      outstandingAmount: 540,
      status: FeeStatus.UPCOMING,
      feeMode: FeeMode.DEFAULT,
    },
  });

  // --- Student 4 (Sneha Roy): Admitted Feb 28, 2026 ---
  // Cycle 0: Feb 28 – Mar 27, due Mar 28. Total ₹700 (₹500 + ₹200). PAID.
  const r4_c0 = await prisma.feeRecord.create({
    data: {
      studentId: student4.id,
      classId: class5.id,
      billingPeriodStart: new Date('2026-02-28'),
      billingPeriodEnd: new Date('2026-03-27'),
      dueDate: new Date('2026-03-28'),
      baseAmount: 500,
      admissionFeeAmount: 200,
      discountAmount: 0,
      lateFeeAmount: 0,
      totalAmount: 700,
      paidAmount: 700,
      outstandingAmount: 0,
      status: FeeStatus.PAID,
      feeMode: FeeMode.DEFAULT,
    },
  });
  const p10 = await prisma.payment.create({
    data: {
      receiptNumber: 'DPR-RC-2026-0010',
      feeRecordId: r4_c0.id,
      studentId: student4.id,
      amount: 700,
      paymentMethod: PaymentMethod.CASH,
      paymentDate: new Date('2026-02-28T10:00:00Z'),
      recordedByUserId: adminUser.id,
    },
  });
  await prisma.document.create({
    data: {
      documentType: DocumentType.RECEIPT,
      referenceId: p10.id,
      studentId: student4.id,
      metadata: { receiptNumber: p10.receiptNumber, amount: p10.amount },
    },
  });

  // Cycle 1: Mar 28 – Apr 27, due Apr 28. Total ₹500. PAID.
  const r4_c1 = await prisma.feeRecord.create({
    data: {
      studentId: student4.id,
      classId: class5.id,
      billingPeriodStart: new Date('2026-03-28'),
      billingPeriodEnd: new Date('2026-04-27'),
      dueDate: new Date('2026-04-28'),
      baseAmount: 500,
      admissionFeeAmount: 0,
      discountAmount: 0,
      lateFeeAmount: 0,
      totalAmount: 500,
      paidAmount: 500,
      outstandingAmount: 0,
      status: FeeStatus.PAID,
      feeMode: FeeMode.DEFAULT,
    },
  });
  const p11 = await prisma.payment.create({
    data: {
      receiptNumber: 'DPR-RC-2026-0011',
      feeRecordId: r4_c1.id,
      studentId: student4.id,
      amount: 500,
      paymentMethod: PaymentMethod.UPI,
      transactionId: 'UTR77281902834',
      paymentDate: new Date('2026-04-25T14:30:00Z'),
      recordedByUserId: adminUser.id,
    },
  });
  await prisma.document.create({
    data: {
      documentType: DocumentType.RECEIPT,
      referenceId: p11.id,
      studentId: student4.id,
      metadata: { receiptNumber: p11.receiptNumber, amount: p11.amount },
    },
  });

  // Cycle 2: Apr 28 – May 27, due May 28. Total ₹500. PAID.
  const r4_c2 = await prisma.feeRecord.create({
    data: {
      studentId: student4.id,
      classId: class5.id,
      billingPeriodStart: new Date('2026-04-28'),
      billingPeriodEnd: new Date('2026-05-27'),
      dueDate: new Date('2026-05-28'),
      baseAmount: 500,
      admissionFeeAmount: 0,
      discountAmount: 0,
      lateFeeAmount: 0,
      totalAmount: 500,
      paidAmount: 500,
      outstandingAmount: 0,
      status: FeeStatus.PAID,
      feeMode: FeeMode.DEFAULT,
    },
  });
  const p12 = await prisma.payment.create({
    data: {
      receiptNumber: 'DPR-RC-2026-0012',
      feeRecordId: r4_c2.id,
      studentId: student4.id,
      amount: 500,
      paymentMethod: PaymentMethod.CASH,
      paymentDate: new Date('2026-05-20T16:00:00Z'),
      recordedByUserId: adminUser.id,
    },
  });
  await prisma.document.create({
    data: {
      documentType: DocumentType.RECEIPT,
      referenceId: p12.id,
      studentId: student4.id,
      metadata: { receiptNumber: p12.receiptNumber, amount: p12.amount },
    },
  });

  // Cycle 3: May 28 – Jun 27, due Jun 28. Total ₹500. PARTIALLY_PAID (Paid ₹250, Outstanding ₹250).
  const r4_c3 = await prisma.feeRecord.create({
    data: {
      studentId: student4.id,
      classId: class5.id,
      billingPeriodStart: new Date('2026-05-28'),
      billingPeriodEnd: new Date('2026-06-27'),
      dueDate: new Date('2026-06-28'),
      baseAmount: 500,
      admissionFeeAmount: 0,
      discountAmount: 0,
      lateFeeAmount: 0,
      totalAmount: 500,
      paidAmount: 250,
      outstandingAmount: 250,
      status: FeeStatus.PARTIALLY_PAID,
      feeMode: FeeMode.DEFAULT,
    },
  });
  const p13 = await prisma.payment.create({
    data: {
      receiptNumber: 'DPR-RC-2026-0013',
      feeRecordId: r4_c3.id,
      studentId: student4.id,
      amount: 250,
      paymentMethod: PaymentMethod.UPI,
      transactionId: 'UTR66281900192',
      notes: 'Partial payment of ₹250',
      paymentDate: new Date('2026-06-15T11:20:00Z'),
      recordedByUserId: adminUser.id,
    },
  });
  await prisma.document.create({
    data: {
      documentType: DocumentType.RECEIPT,
      referenceId: p13.id,
      studentId: student4.id,
      metadata: { receiptNumber: p13.receiptNumber, amount: p13.amount },
    },
  });

  // 7. Seed Audit Logs
  console.log('📝 Seeding Audit Logs...');
  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        action: 'SYSTEM_INITIALIZATION',
        entity: 'SYSTEM',
        entityId: 'SYSTEM',
        details: { message: 'Database seeded with baseline classes, students, and billing cycles.' },
        ipAddress: '127.0.0.1',
      },
      {
        userId: adminUser.id,
        action: 'STUDENT_ENROLLED',
        entity: 'STUDENT',
        entityId: student1.id,
        details: { studentCode: student1.studentCode, name: student1.name, class: 'Class 8' },
        ipAddress: '127.0.0.1',
      },
      {
        userId: adminUser.id,
        action: 'PAYMENT_RECORDED',
        entity: 'PAYMENT',
        entityId: p1.id,
        details: { receiptNumber: p1.receiptNumber, amount: p1.amount, method: 'CASH' },
        ipAddress: '127.0.0.1',
      },
      {
        userId: adminUser.id,
        action: 'PAYMENT_RECORDED',
        entity: 'PAYMENT',
        entityId: p2.id,
        details: { receiptNumber: p2.receiptNumber, amount: p2.amount, method: 'UPI' },
        ipAddress: '127.0.0.1',
      },
    ],
  });
  console.log('✅ Audit logs seeded');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
