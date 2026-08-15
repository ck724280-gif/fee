## 2026-08-15T06:09:23Z
You are Worker M1 (Foundation, Schema & Scaffolding Specialist).
Your working directory is: d:\antigravity programme\tuition_manager\.agents\worker_m1.
The authoritative requirements file is at: d:\antigravity programme\tuition_manager\.agents\ORIGINAL_REQUEST.md.
The project blueprint is at: d:\antigravity programme\tuition_manager\PROJECT.md.
Explorer & Miner reports available at:
- d:\antigravity programme\tuition_manager\.agents\explorer_survey_1\survey_report.md
- d:\antigravity programme\tuition_manager\.agents\miner_survey_2\domain_spec.md
- d:\antigravity programme\tuition_manager\.agents\miner_survey_3\features_spec.md
Workspace root: d:\antigravity programme\tuition_manager.

Task:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and the survey reports.
2. Scaffold the full Next.js 15 App Router project structure:
   - package.json with exact compatible dependencies: next (15.2.4 or 15.x), react (19.x), react-dom (19.x), @prisma/client (6.4.1), prisma (6.4.1), @prisma/adapter-neon, @neondatabase/serverless, ws, @types/ws, @react-pdf/renderer, jose, bcryptjs, @types/bcryptjs, zod, date-fns, lucide-react, recharts, clsx, tailwind-merge, tailwindcss, typescript, tsx, @types/node, @types/react, @types/react-dom.
   - tsconfig.json with path aliases `@/*` -> `./src/*`.
   - next.config.ts / next.config.mjs with serverExternalPackages for `@react-pdf/renderer` and `bcryptjs`.
   - Tailwind CSS setup (v4 or standard Next.js PostCSS setup).
   - `.env.example` and `.env` with DATABASE_URL, DIRECT_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD. (Use standard PostgreSQL connection strings or local neon compatible SQLite/Postgres fallback for tests if offline, ensuring schema is 100% Neon serverless PostgreSQL ready).
3. Create `prisma/schema.prisma` with all models:
   - User (id, email, passwordHash, name, role, createdAt, updatedAt)
   - Class (id, name, defaultMonthlyFee, defaultAdmissionFee, lateFeeEnabled, lateFeeType, lateFeeAmount, graceDays, status, createdAt, updatedAt, relations)
   - Student (id, studentCode [unique], name, fatherName, motherName, guardianName, mobile, whatsappNumber, address, dob, gender, school, classId, admissionDate, joiningDate, feeMode [DEFAULT/CUSTOM], customMonthlyFee, admissionFee, discountType [NONE/FIXED/PERCENTAGE], discountValue, status [ACTIVE/INACTIVE/LEFT/COMPLETED], createdAt, updatedAt, relations)
   - FeeRecord (id, studentId, classId, billingPeriodStart, billingPeriodEnd, dueDate, baseAmount, admissionFeeAmount, discountAmount, lateFeeAmount, totalAmount, paidAmount, outstandingAmount, status [UPCOMING/DUE/PARTIALLY_PAID/PAID/OVERDUE/WAIVED/CANCELLED], feeMode, generatedAt, updatedAt, @@unique([studentId, billingPeriodStart, billingPeriodEnd]))
   - Payment (id, receiptNumber [unique], feeRecordId, studentId, amount, paymentMethod [CASH/UPI/BANK_TRANSFER/CARD/OTHER], transactionId, notes, paymentDate, recordedByUserId, createdAt, relations)
   - Document (id, token [unique UUID], documentType [RECEIPT/REMINDER/STATEMENT], referenceId, studentId, expiresAt, createdAt, relations)
   - InstituteSetting (id, instituteName, tagline, address, phone, whatsapp, email, logoUrl, receiptPrefix, currencySymbol, defaultGraceDays, createdAt, updatedAt)
   - AuditLog (id, userId, action, entity, entityId, details [JSON], ipAddress, timestamp)
4. Implement `src/lib/prisma.ts` singleton handling Neon adapter or direct PG connection gracefully.
5. Implement `prisma/seed.ts` populating:
   - Admin user (admin@dprtuition.com / Admin@12345)
   - Institute settings (DPR Private Tuition)
   - 4 classes (Class 5 ₹500, Class 6 ₹600, Class 7 ₹700, Class 8 ₹800)
   - 6+ sample students with a realistic mix of DEFAULT and CUSTOM fee modes, varied admission dates (e.g. May 3, May 15, May 31, Feb 28)
   - Generated fee records for multiple historical & current billing periods showing UPCOMING, DUE, PARTIALLY_PAID, PAID, OVERDUE statuses
   - Multiple sample payments (including partial payments) with receipt numbers `DPR-RC-2026-0001` etc.
6. Install dependencies (`npm install`) and execute:
   - `npx prisma validate`
   - `npx prisma db push` or migrations
   - `npx prisma db seed` or `npm run db:seed`
   - `npx tsc --noEmit`
7. Document all commands, execution logs, and verify everything passes in your `handoff.md`.
