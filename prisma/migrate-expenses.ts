import prisma from '../src/lib/prisma';

async function main() {
  console.log('--- Migrating Expense Schema to Neon PostgreSQL ---');

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "ExpenseCategory" AS ENUM (
        'TEACHER_SALARY',
        'RENT',
        'ELECTRICITY_BILL',
        'STUDY_MATERIALS_PRINTING',
        'MARKETING_PROMOTION',
        'INTERNET_STATIONERY',
        'MAINTENANCE_REPAIRS',
        'OTHER'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log('✓ ExpenseCategory enum verified/created');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "expenses" (
      "id" TEXT PRIMARY KEY,
      "title" TEXT NOT NULL,
      "category" "ExpenseCategory" NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL,
      "expense_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
      "reference_number" TEXT,
      "payee_name" TEXT,
      "notes" TEXT,
      "receipt_url" TEXT,
      "recorded_by_user_id" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "expenses_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
  console.log('✓ expenses table verified/created');

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "expenses_category_idx" ON "expenses"("category");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "expenses_expense_date_idx" ON "expenses"("expense_date");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "expenses_payment_method_idx" ON "expenses"("payment_method");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "expenses_recorded_by_user_id_idx" ON "expenses"("recorded_by_user_id");`);
  console.log('✓ expenses indexes verified/created');

  console.log('✅ Expense schema migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
