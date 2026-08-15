# DPR Fee Management System

> Production-grade, high-reliability Full-Stack Fee Management & Institutional Accounting Web Application for **DPR Private Tuition**.

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.0-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4.1-2d3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-00e599?logo=postgresql)](https://neon.tech/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![JWT](https://img.shields.io/badge/jose-Edge%20Auth-f59e0b)](https://github.com/panva/jose)
[![Test Suite](https://img.shields.io/badge/Tests-395%20Passed-10b981)]()

---

## 1. Overview & System Architecture

The **DPR Fee Management System** is a mission-critical web application specifically engineered for educational institutes and private tutoring centers. It automates individual student billing cycles tied to their exact admission date, manages partial and cumulative payments with atomic concurrency guards, streams branded PDF receipts and fee reminders on demand without disk storage, triggers WhatsApp payment receipts and reminders via pre-filled `wa.me` deep links, and provides comprehensive multi-dimensional analytical reports.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 15 App Router (Edge & Node.js)          │
├────────────────────────────────┬───────────────────────────────────────┤
│        Frontend (React 19)     │             Backend API               │
│  - Modern Dashboard (Recharts) │  - Edge Middleware Auth (jose JWT)    │
│  - Student & Class CRUD        │  - Single Admin Auth (/api/auth/*)    │
│  - Fee Generator & Collector   │  - Billing Engine (/api/fees/*)       │
│  - Report Engine & CSV Export  │  - Atomic Payments (/api/payments/*)  │
│  - WhatsApp Click-to-Chat      │  - Tokenized PDFs (/api/documents/*)  │
│  - Responsive Mobile Shell     │  - Immutable Audit (/api/audit-logs/*)│
├────────────────────────────────┴───────────────────────────────────────┤
│                         Prisma ORM 6 Engine                            │
│  - Neon Serverless Adapter (@prisma/adapter-neon + WebSocket pool)     │
│  - Dual Connection: DATABASE_URL (Pooled) & DIRECT_URL (Migrations)    │
│  - Compound Idempotent Constraints & ACID Transactions                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Features

### 📅 Individual Admission-Date Billing Cycle Engine
- **Anchor Day Preservation**: Billing cycles are anchored to each student's specific admission day (e.g., admission on May 3 yields cycles May 3–June 2, June 3–July 2, etc.).
- **Calendar Edge-Case Date Math**: Seamless handling of short months (Feb 28/29, 30-day months) with automatic anchor recovery in subsequent 31-day months.
- **DEFAULT vs CUSTOM Fee Modes**: Inherits dynamic class defaults or locks custom monthly rates with snapshot immutability for past cycles.
- **Idempotency Guarantee**: Compound unique database constraint `(studentId, billingPeriodStart, billingPeriodEnd)` prevents duplicate fee generation.

### 💳 Atomic Payment Processing & Receipts
- **Partial & Full Payments**: Full multi-part installment support (e.g., ₹300 paid on ₹800 fee updates outstanding balance to ₹500 and status to `PARTIALLY_PAID`).
- **Overpayment Guard**: Strict validation preventing payment amounts exceeding current outstanding fees.
- **Monotonic Sequential Receipts**: Unique formatted sequential receipt numbering `DPR-RC-{YEAR}-{SEQ}` (e.g., `DPR-RC-2026-0001`).
- **Multi-Method Support**: Accepts `CASH`, `UPI`, `BANK_TRANSFER`, `CARD`, and `OTHER` with optional transaction ID tracking.

### 📄 Zero-Disk On-Demand PDF Streaming
- **Serverless PDF Generation**: High-performance `@react-pdf/renderer` in-memory streaming compatible with Vercel's read-only file system (no `EROFS` errors).
- **Secure Crypto UUID Tokens**: Unguessable UUID v4 document tokens (`/api/documents/[uuid]`) for public access without authentication.
- **Token Expiry**: Optional configurable expiry dates on temporary reminder links (returning HTTP 410 Gone when expired).

### 💬 WhatsApp Click-to-Chat Integration
- **Pre-filled Templates**: Formatted receipt confirmations, upcoming fee reminders, and urgent overdue notices.
- **URL Phone Sanitization**: Automatically normalizes Indian phone numbers (+91, leading 0, dashes, spaces) to international format `91XXXXXXXXXX`.
- **Manual Send Enforcement**: Generates native `https://wa.me/` deep links for review and transmission via WhatsApp Web/App (zero bot fees).

### 🔒 Enterprise Security & Audit Logging
- **Edge Middleware Route Guard**: Next.js Edge runtime JWT verification protects all `/api/*` endpoints and dashboard routes.
- **jose + BcryptJS Authentication**: HS256 signed JWT session cookies with `httpOnly`, `secure`, `sameSite=lax`, and salted bcrypt password hashing (cost factor 10).
- **Tamper-Evident Audit Trail**: Automatic immutable logging of user logins, logouts, student/class modifications, fee generations, and payment transactions.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Framework** | [Next.js 15.2](https://nextjs.org/) (App Router, Server & Client Components, Edge Middleware) |
| **UI & Styling** | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React Icons](https://lucide.dev/) |
| **Database & ORM** | [Prisma ORM 6.4](https://www.prisma.io/), [Neon PostgreSQL](https://neon.tech/) Serverless Adapter (`@prisma/adapter-neon`, `ws`) |
| **Authentication & Security** | [jose](https://github.com/panva/jose) (Edge HS256 JWT), [bcryptjs](https://www.npmjs.com/package/bcryptjs), [Zod v3.24](https://zod.dev/) |
| **Document Generation** | [@react-pdf/renderer](https://react-pdf.org/) (In-memory streaming) |
| **Analytics & Charts** | [Recharts](https://recharts.org/) |
| **Testing & Quality** | [tsx](https://github.com/privatenumber/tsx), 4-Tier Automated Master Test Suite (395 Tests) |

---

## 4. Local Setup & Installation

### Prerequisites
- Node.js 20+ installed
- npm or pnpm or yarn
- PostgreSQL database (Local or [Neon Serverless PostgreSQL](https://neon.tech))

### Step-by-Step Setup

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd tuition_manager
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (refer to [Environment Variables Reference](#5-environment-variables-reference)).

4. **Initialize Database & Run Migrations**:
   ```bash
   # Generate Prisma Client
   npm run db:generate

   # Push schema to database
   npm run db:push
   ```

5. **Seed Database with Initial Fixtures**:
   ```bash
   npm run db:seed
   ```

6. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Environment Variables Reference

Create a `.env` file with the following keys:

```ini
# PostgreSQL Connection Strings (Neon Serverless or Standard PostgreSQL)
DATABASE_URL="postgresql://user:password@ep-sample-pooler.region.neon.tech/neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:password@ep-sample.region.neon.tech/neondb?sslmode=require"

# JWT Authentication Secret (HS256)
JWT_SECRET="dpr-tuition-super-secure-jwt-secret-key-2026-edge"

# Default Admin Credentials for Database Seeding
ADMIN_EMAIL="admin@dprtuition.com"
ADMIN_PASSWORD="Admin@123"
ADMIN_NAME="DPR Admin"

# Application Base URL (for document URL generation and WhatsApp links)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 6. Seed Credentials

When database seeding completes (`npm run db:seed`), use these default credentials to sign in:

| Field | Value |
|---|---|
| **Portal URL** | `/login` |
| **Admin Email** | `admin@dprtuition.com` |
| **Password** | `Admin@123` |
| **Role** | `ADMIN` (Full System Access) |

*Note: The login page includes a convenient "Auto-Fill" demo pill to populate these credentials with one click.*

---

## 7. Automated Test Suite Execution

The repository features an exhaustive, zero-network 4-tier automated test suite covering 395 verification test cases across unit, boundary, combination, workload, and security dimensions.

Run the test suite with:

```bash
# Execute master test suite (395 test cases)
npx tsx tests/run-all.ts

# Execute Security & Edge Middleware feature tests
npx tsx tests/tier1_features/08_security_audit.test.ts

# Execute Cryptography & Security boundary tests
npx tsx tests/tier2_boundaries/03_security_boundaries.test.ts
```

### Test Suite Structure
- **Tier 1 (Feature Coverage)**: 35 Features × 5 Tests = 175 Tests
- **Tier 2 (Boundary Value Analysis)**: 35 Subsystems × 5 Tests = 175 Tests
- **Tier 3 (Cross-Feature Combinations)**: 5 Workflows × 5 Tests = 25 Tests
- **Tier 4 (Real-World Workloads)**: 4 Large Simulations × 5 Tests = 20 Tests
- **Total**: **395 / 395 Passing**

---

## 8. Deployment on Vercel

The project is fully pre-configured for one-click deployment on [Vercel](https://vercel.com).

### Deployment Steps:
1. Push your repository to GitHub / GitLab / Bitbucket.
2. Import the repository into your Vercel Dashboard.
3. Select **Next.js** framework preset.
4. Set Environment Variables in Project Settings:
   - `DATABASE_URL` (Neon pooled connection string)
   - `DIRECT_URL` (Neon direct connection string)
   - `JWT_SECRET` (Strong random 64-character secret)
   - `NEXT_PUBLIC_APP_URL` (`https://your-app.vercel.app`)
5. Deploy! Vercel will automatically run `prisma generate && next build`.

---

## 9. Security & Compliance Notes

- **Zero Passwords in Plaintext**: All passwords hashed with salted bcrypt (cost factor 10).
- **HttpOnly Cookies**: Session tokens are isolated from client-side JavaScript to eliminate XSS token theft.
- **Edge Route Shield**: Protected API routes immediately return HTTP 401 JSON on missing or invalid tokens; protected pages redirect to `/login`.
- **Stateless PDF Generation**: Documents rendered directly in RAM buffer with streaming responses, eliminating server filesystem disk write vulnerabilities.
- **SQL Injection Immune**: All database access executes through parameterized queries via Prisma ORM 6.

---

## 10. License & Copyright

© 2026 DPR Private Tuition. All rights reserved.
Developed for excellence in educational administration.
