import prisma from '../src/lib/prisma';

async function dropLegacyIndexes() {
  const indexesToDrop = [
    'classes_name_key',
    'students_student_code_key',
    'payments_receipt_number_key',
  ];

  for (const idx of indexesToDrop) {
    try {
      await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${idx}";`);
      console.log(`✓ Dropped index: ${idx}`);
    } catch (e: any) {
      console.log(`- ${idx}: ${e.message}`);
    }
  }
}

dropLegacyIndexes()
  .catch((err) => console.error(err))
  .finally(async () => await prisma.$disconnect());
