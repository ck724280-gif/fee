import prisma from '../src/lib/prisma';

async function dropLegacyUniqueConstraints() {
  console.log('🔄 Checking and dropping legacy single-column unique constraints...');

  const constraintsToDrop = [
    'classes_name_key',
    'students_student_code_key',
    'payments_receipt_number_key',
  ];

  for (const cName of constraintsToDrop) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "classes" DROP CONSTRAINT IF EXISTS "${cName}";`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "${cName}";`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "${cName}";`);
      console.log(`✓ Checked & dropped constraint if existed: ${cName}`);
    } catch (e: any) {
      console.log(`- Note for ${cName}: ${e.message}`);
    }
  }

  // Ensure multi-tenant composite unique constraints exist
  try {
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "classes_organization_id_name_key" ON "classes"("organization_id", "name");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "students_organization_id_student_code_key" ON "students"("organization_id", "student_code");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "payments_organization_id_receipt_number_key" ON "payments"("organization_id", "receipt_number");
    `);
    console.log('✓ Verified composite unique indexes: (organization_id, name), (organization_id, student_code), (organization_id, receipt_number)');
  } catch (e: any) {
    console.log(`- Index note: ${e.message}`);
  }

  console.log('✅ Legacy constraint cleanup complete.');
}

dropLegacyUniqueConstraints()
  .catch((err) => console.error(err))
  .finally(async () => await prisma.$disconnect());
