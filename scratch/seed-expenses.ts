import prisma from '../src/lib/prisma';

async function seedSampleExpenses() {
  console.log('--- Seeding Realistic Institute Expenses ---');

  const admin = await prisma.user.findFirst();
  const userId = admin?.id;

  const sampleExpenses = [
    {
      title: 'Classroom & Office Premises Rent - August',
      category: 'RENT' as const,
      amount: 12000,
      expenseDate: new Date('2026-08-01'),
      paymentMethod: 'BANK_TRANSFER' as const,
      payeeName: 'Rajesh Mukherjee (Landlord)',
      referenceNumber: 'NEFT-8934201948',
      notes: 'Monthly rent for coaching center floor 1 & 2',
    },
    {
      title: 'Senior Physics & Mathematics Faculty Remuneration',
      category: 'TEACHER_SALARY' as const,
      amount: 18000,
      expenseDate: new Date('2026-08-05'),
      paymentMethod: 'UPI' as const,
      payeeName: 'Prof. Subir Chatterjee',
      referenceNumber: 'UPI-7849201940',
      notes: 'Honorarium for Class 10 & 12 Batch Coaching',
    },
    {
      title: 'WBSEDCL Electricity & AC Power Utility Bill',
      category: 'ELECTRICITY_BILL' as const,
      amount: 3450,
      expenseDate: new Date('2026-08-10'),
      paymentMethod: 'UPI' as const,
      payeeName: 'WBSEDCL State Power',
      referenceNumber: 'CON-ID-8834920',
      notes: 'Electricity bill for July cooling & lighting',
    },
    {
      title: 'Half-Yearly Test Question Papers & Study Material Xerox',
      category: 'STUDY_MATERIALS_PRINTING' as const,
      amount: 2200,
      expenseDate: new Date('2026-08-12'),
      paymentMethod: 'CASH' as const,
      payeeName: 'City Xerox & Color Printers',
      referenceNumber: 'INV-402',
      notes: 'Printed mock question paper sets for Class 7-10',
    },
    {
      title: 'High-Speed Optical Fiber Internet & Office Stationery',
      category: 'INTERNET_STATIONERY' as const,
      amount: 1100,
      expenseDate: new Date('2026-08-14'),
      paymentMethod: 'UPI' as const,
      payeeName: 'Alliance Broadband & New Star Stationery',
      referenceNumber: 'UPI-3829104',
      notes: '100 Mbps Wi-Fi plan + whiteboard markers and attendance registers',
    },
  ];

  for (const exp of sampleExpenses) {
    const created = await prisma.expense.create({
      data: {
        ...exp,
        recordedByUserId: userId,
      },
    });
    console.log(`✓ Created expense: ${created.title} (₹${created.amount})`);
  }

  console.log('✅ 5 sample expense records seeded successfully!');
}

seedSampleExpenses()
  .catch((e) => {
    console.error('Failed to seed expenses:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
