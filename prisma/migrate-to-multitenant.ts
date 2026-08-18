import prisma from '../src/lib/prisma';

export const DPR_ORG_ID = 'e0000000-0000-4000-a000-000000000001';
export const DPR_PUBLIC_ID = 'dpr-tuition-pub-000000000001';

async function exec(sql: string, description?: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
    if (description) console.log(`   ✓ ${description}`);
  } catch (err: any) {
    console.error(`   ⚠️ Failed on: ${description || sql.slice(0, 40)}`, err?.message || err);
    throw err;
  }
}

async function main() {
  console.log('🚀 --- Starting Multi-Tenant Database Migration --- 🚀\n');

  // 1. Create Enums
  console.log('1. Verifying and creating required Enums...');
  await exec(`
    DO $$ BEGIN
      CREATE TYPE "OrganizationType" AS ENUM ('PRIVATE_TUITION', 'SCHOOL', 'COACHING', 'TUTORIAL', 'EDUCATIONAL_INSTITUTE');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `, 'OrganizationType enum');

  await exec(`
    DO $$ BEGIN
      CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED', 'EXPIRED', 'CANCELLED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `, 'OrganizationStatus enum');

  await exec(`
    DO $$ BEGIN
      CREATE TYPE "MemberRole" AS ENUM ('SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'ACCOUNTANT', 'TEACHER', 'STAFF');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `, 'MemberRole enum');

  await exec(`
    DO $$ BEGIN
      CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INVITED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `, 'MemberStatus enum');

  await exec(`
    DO $$ BEGIN
      CREATE TYPE "SubscriptionPlan" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM', 'CUSTOM');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `, 'SubscriptionPlan enum');

  await exec(`
    DO $$ BEGIN
      CREATE TYPE "SubscriptionCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `, 'SubscriptionCycle enum');

  await exec(`
    DO $$ BEGIN
      CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED', 'EXPIRED', 'CANCELLED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `, 'SubscriptionStatus enum');

  console.log('   ✓ Enums verified.\n');

  // 2. Create organizations table
  console.log('2. Creating organizations table...');
  await exec(`
    CREATE TABLE IF NOT EXISTS "organizations" (
      "id" TEXT PRIMARY KEY,
      "public_id" TEXT UNIQUE NOT NULL,
      "name" TEXT NOT NULL,
      "slug" TEXT UNIQUE NOT NULL,
      "organization_type" "OrganizationType" NOT NULL DEFAULT 'PRIVATE_TUITION',
      "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `, 'organizations table created');

  await exec(`
    INSERT INTO "organizations" ("id", "public_id", "name", "slug", "organization_type", "status", "created_at", "updated_at")
    VALUES ('${DPR_ORG_ID}', '${DPR_PUBLIC_ID}', 'DPR Private Tuition', 'dpr-tuition', 'PRIVATE_TUITION', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("id") DO NOTHING;
  `, 'DPR organization seeded');

  // 3. User table changes
  console.log('3. Updating users table...');
  await exec(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_super_admin" BOOLEAN NOT NULL DEFAULT FALSE;`, 'is_super_admin column');
  await exec(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mobile" TEXT;`, 'mobile column');
  await exec(`UPDATE "users" SET "is_super_admin" = TRUE WHERE "role" = 'ADMIN';`, 'Admin users elevated to super admin');

  // 4. Create organization_members table
  console.log('4. Creating organization_members table...');
  await exec(`
    CREATE TABLE IF NOT EXISTS "organization_members" (
      "id" TEXT PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "organization_id" TEXT NOT NULL,
      "role" "MemberRole" NOT NULL DEFAULT 'ORGANIZATION_ADMIN',
      "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "organization_members_user_org_uq" UNIQUE ("user_id", "organization_id")
    );
  `, 'organization_members table created');

  await exec(`
    INSERT INTO "organization_members" ("id", "user_id", "organization_id", "role", "status", "created_at", "updated_at")
    SELECT
      'dpr-mem-' || u."id",
      u."id",
      '${DPR_ORG_ID}',
      CASE WHEN u."is_super_admin" THEN 'SUPER_ADMIN'::"MemberRole" ELSE 'ORGANIZATION_ADMIN'::"MemberRole" END,
      'ACTIVE'::"MemberStatus",
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM "users" u
    ON CONFLICT ("user_id", "organization_id") DO NOTHING;
  `, 'Linked existing users to DPR organization membership');

  // 5. Create organization_settings table
  console.log('5. Creating organization_settings table...');
  await exec(`
    CREATE TABLE IF NOT EXISTS "organization_settings" (
      "id" TEXT PRIMARY KEY,
      "organization_id" TEXT UNIQUE NOT NULL,
      "institute_name" TEXT NOT NULL,
      "tagline" TEXT,
      "address" TEXT,
      "phone" TEXT,
      "whatsapp" TEXT,
      "email" TEXT,
      "logo_url" TEXT,
      "receipt_prefix" TEXT NOT NULL DEFAULT 'RC',
      "fee_prefix" TEXT NOT NULL DEFAULT 'FEE',
      "currency_symbol" TEXT NOT NULL DEFAULT '₹',
      "default_grace_days" INTEGER NOT NULL DEFAULT 0,
      "upi_id" TEXT,
      "upi_payee_name" TEXT,
      "upi_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "custom_qr_url" TEXT,
      "reminder_message" TEXT,
      "receipt_message" TEXT,
      "footer_text" TEXT,
      "signature_url" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "organization_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `, 'organization_settings table created');

  await exec(`
    INSERT INTO "organization_settings" (
      "id", "organization_id", "institute_name", "tagline", "address", "phone", "whatsapp",
      "email", "logo_url", "receipt_prefix", "fee_prefix", "currency_symbol", "default_grace_days",
      "upi_id", "upi_payee_name", "upi_enabled", "custom_qr_url", "created_at", "updated_at"
    )
    SELECT
      'dpr-settings-0001',
      '${DPR_ORG_ID}',
      COALESCE((SELECT "institute_name" FROM "institute_settings" LIMIT 1), 'DPR Private Tuition'),
      COALESCE((SELECT "tagline" FROM "institute_settings" LIMIT 1), 'Excellence in Academic Coaching & Guidance'),
      COALESCE((SELECT "address" FROM "institute_settings" LIMIT 1), 'Station Road, Near City Center, West Bengal'),
      COALESCE((SELECT "phone" FROM "institute_settings" LIMIT 1), '+91 98765 43210'),
      COALESCE((SELECT "whatsapp" FROM "institute_settings" LIMIT 1), '+91 98765 43210'),
      COALESCE((SELECT "email" FROM "institute_settings" LIMIT 1), 'info@dprtuition.com'),
      (SELECT "logo_url" FROM "institute_settings" LIMIT 1),
      COALESCE((SELECT "receipt_prefix" FROM "institute_settings" LIMIT 1), 'DPR-RC'),
      'DPR-FEE',
      COALESCE((SELECT "currency_symbol" FROM "institute_settings" LIMIT 1), '₹'),
      COALESCE((SELECT "default_grace_days" FROM "institute_settings" LIMIT 1), 0),
      COALESCE((SELECT "upi_id" FROM "institute_settings" LIMIT 1), 'dprtuition@upi'),
      COALESCE((SELECT "upi_payee_name" FROM "institute_settings" LIMIT 1), 'DPR Private Tuition'),
      COALESCE((SELECT "upi_enabled" FROM "institute_settings" LIMIT 1), true),
      (SELECT "custom_qr_url" FROM "institute_settings" LIMIT 1),
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    ON CONFLICT ("organization_id") DO NOTHING;
  `, 'Seeded DPR organization settings');

  // 6. Subscriptions
  console.log('6. Creating subscriptions tables...');
  await exec(`
    CREATE TABLE IF NOT EXISTS "subscriptions" (
      "id" TEXT PRIMARY KEY,
      "organization_id" TEXT NOT NULL,
      "plan" "SubscriptionPlan" NOT NULL DEFAULT 'BASIC',
      "price_per_cycle" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "billing_cycle" "SubscriptionCycle" NOT NULL DEFAULT 'MONTHLY',
      "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiry_date" TIMESTAMP(3) NOT NULL,
      "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
      "notes" TEXT,
      "created_by_user_id" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `, 'subscriptions table created');

  await exec(`
    CREATE TABLE IF NOT EXISTS "subscription_payments" (
      "id" TEXT PRIMARY KEY,
      "subscription_id" TEXT NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL,
      "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "payment_method" "PaymentMethod" NOT NULL DEFAULT 'UPI',
      "reference_number" TEXT,
      "notes" TEXT,
      "recorded_by_user_id" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `, 'subscription_payments table created');

  await exec(`
    INSERT INTO "subscriptions" (
      "id", "organization_id", "plan", "price_per_cycle", "billing_cycle",
      "start_date", "expiry_date", "status", "notes", "created_at", "updated_at"
    )
    VALUES (
      'dpr-sub-0001',
      '${DPR_ORG_ID}',
      'CUSTOM',
      0,
      'YEARLY',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP + INTERVAL '10 years',
      'ACTIVE',
      'Platform Owner Organization (DPR Tuition)',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("id") DO NOTHING;
  `, 'Seeded DPR subscription');

  // 7. TOTP secrets
  console.log('7. Creating totp_secrets table...');
  await exec(`
    CREATE TABLE IF NOT EXISTS "totp_secrets" (
      "id" TEXT PRIMARY KEY,
      "user_id" TEXT UNIQUE NOT NULL,
      "secret_encrypted" TEXT NOT NULL,
      "recovery_codes_encrypted" TEXT NOT NULL,
      "is_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
      "verified_at" TIMESTAMP(3),
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "totp_secrets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `, 'totp_secrets table created');

  // 8. Add organization_id to all resource tables
  console.log('8. Adding organization_id to all resource tables...');
  const tables = [
    'classes',
    'students',
    'fee_records',
    'payments',
    'documents',
    'expenses',
    'upi_submissions',
    'audit_logs',
  ];

  for (const table of tables) {
    await exec(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "organization_id" TEXT;`, `Added organization_id to ${table}`);
    await exec(`UPDATE "${table}" SET "organization_id" = '${DPR_ORG_ID}' WHERE "organization_id" IS NULL;`, `Assigned DPR org ID to ${table}`);
  }

  // Public IDs for students and payments
  await exec(`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "public_id" TEXT;`, 'Added public_id to students');
  await exec(`UPDATE "students" SET "public_id" = "id" WHERE "public_id" IS NULL;`, 'Set public_id to students');
  await exec(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "public_id" TEXT;`, 'Added public_id to payments');
  await exec(`UPDATE "payments" SET "public_id" = "id" WHERE "public_id" IS NULL;`, 'Set public_id to payments');

  // 9. Drop old single-tenant unique constraints and recreate tenant-scoped unique constraints
  console.log('9. Rebuilding unique constraints with tenant scope...');
  await exec(`ALTER TABLE "classes" DROP CONSTRAINT IF EXISTS "classes_name_key";`, 'Dropped classes_name_key');
  await exec(`ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "students_student_code_key";`, 'Dropped students_student_code_key');
  await exec(`ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_receipt_number_key";`, 'Dropped payments_receipt_number_key');
  await exec(`ALTER TABLE "fee_records" DROP CONSTRAINT IF EXISTS "fee_records_student_id_billing_period_start_billing_period_end_key";`, 'Dropped old fee_records uq 1');
  await exec(`ALTER TABLE "fee_records" DROP CONSTRAINT IF EXISTS "uq_student_billing_period";`, 'Dropped old fee_records uq 2');

  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "classes_organization_id_name_uq" ON "classes"("organization_id", "name");`, 'Created classes tenant index');
  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "students_organization_id_student_code_uq" ON "students"("organization_id", "student_code");`, 'Created students tenant index');
  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "students_public_id_uq" ON "students"("public_id");`, 'Created students public_id index');
  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "payments_organization_id_receipt_number_uq" ON "payments"("organization_id", "receipt_number");`, 'Created payments tenant index');
  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "payments_public_id_uq" ON "payments"("public_id");`, 'Created payments public_id index');
  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_org_student_billing_period" ON "fee_records"("organization_id", "student_id", "billing_period_start", "billing_period_end");`, 'Created fee_records tenant index');

  console.log('\n🎉 --- Multi-Tenant Migration Completed Successfully! --- 🎉');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
