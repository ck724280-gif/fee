# System Architecture & Technical Stack Survey Report

**Project**: DPR Fee Management System ("DPR Private Tuition")  
**Author**: Explorer Survey 1 (System Architecture & Stack Explorer)  
**Date**: 2026-08-15  
**Target Environment**: Vercel Free Tier (Serverless) + Neon PostgreSQL (Free Tier)  

---

## 1. Executive Summary & Problem Scope

The DPR Fee Management System is a production-grade, full-stack Web Application designed for "DPR Private Tuition", supporting dynamic billing cycles computed from each student's admission date, two-level fee configurations (class default vs custom student rate), partial payment processing, immutable ledger history, on-demand PDF receipts and reminders via secure UUID tokens, manual WhatsApp click-to-chat dispatch, and a comprehensive SaaS-style analytics dashboard.

This report establishes the complete architectural blueprint, validated technology stack, environment capabilities, configuration recipes, database driver adapter setup, and project directory layout required for seamless implementation.

---

## 2. Environment Probe & Host System Baseline

The host development environment was systematically probed and configured:

| Component | Detected Specification | Verification Status | Notes |
|---|---|---|---|
| **Operating System** | Windows 11 (build 10.0.26100, x64 / win32) | Verified | Host OS |
| **Shell** | PowerShell 5.1 (`Desktop` Edition) | Verified | PowerShell scripting supported |
| **Node.js Runtime** | `v24.19.0` (also `v20.18.0` LTS standalone) | Verified | Fully satisfies Node `>= 18.18` requirement |
| **Package Manager** | `npm v11.17.0` & `npx v11.17.0` | Verified | Modern lockfile v3 and peer dependency resolution |
| **Version Control** | Git for Windows `v2.45.0` | Verified | `C:\Program Files\Git\cmd\git.exe` in PATH |
| **System Utilities** | `curl.exe`, `tar.exe`, `winget`, `choco` | Verified | Native CLI archive & networking tools available |

*Path Registration*: Node.js and Git binaries have been permanently verified in user environment variables, enabling direct `node`, `npm`, `npx`, and `git` commands from any working shell.

---

## 3. Technology Stack & Package Dependency Specifications

### 3.1 Core Stack Matrix

```
+------------------------------------------------------------------------------------+
|                                    APPLICATION                                     |
|                      Next.js 15 App Router + React 19 + TypeScript                 |
+------------------------------------------------------------------------------------+
|  UI & Styling: Tailwind CSS v4 + @tailwindcss/postcss + Lucide React + Recharts    |
|  Validation & Dates: Zod v3.24 + date-fns v4.1                                     |
|  Auth & Security: jose v5 (Edge JWT) + bcryptjs v2.4 (Passwords) + Middleware      |
|  PDF Generation: @react-pdf/renderer v4.2 (Secure UUID Token Streams)              |
|  WhatsApp: Native wa.me Click-to-Chat URL Builders                                 |
+------------------------------------------------------------------------------------+
|                                  DATA ACCESS LAYER                                 |
|               Prisma ORM 6.4 + @prisma/adapter-neon + @neondatabase/serverless     |
+------------------------------------------------------------------------------------+
|                                 DATABASE (NEON PG)                                 |
|           DATABASE_URL (Pooled, PgBouncer) | DIRECT_URL (Direct Migration)         |
+------------------------------------------------------------------------------------+
```

### 3.2 Production `package.json` Blueprint

```json
{
  "name": "dpr-fee-management",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push",
    "prisma:seed": "tsx prisma/seed.ts",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.10.4",
    "@prisma/adapter-neon": "^6.4.1",
    "@prisma/client": "^6.4.1",
    "@react-pdf/renderer": "^4.2.2",
    "bcryptjs": "^2.4.3",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "jose": "^5.10.4",
    "lucide-react": "^0.475.0",
    "next": "15.2.4",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "recharts": "^2.15.1",
    "tailwind-merge": "^3.0.2",
    "ws": "^8.18.1",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.12",
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^22.13.10",
    "@types/react": "19.0.10",
    "@types/react-dom": "19.0.4",
    "@types/ws": "^8.5.14",
    "eslint": "^9.22.0",
    "eslint-config-next": "15.2.4",
    "postcss": "^8.5.3",
    "prisma": "^6.4.1",
    "tailwindcss": "^4.0.12",
    "tsx": "^4.19.3",
    "typescript": "^5.8.2"
  }
}
```

---

## 4. Configuration Recipes

### 4.1 Next.js 15 Configuration (`next.config.ts`)

Next.js 15 requires server external packaging for `@react-pdf/renderer`, `canvas`, and WebSocket drivers so they are not bundled into client packages.

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer', 'canvas', 'ws'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Ensure strict mode and production optimizations
  reactStrictMode: true,
};

export default nextConfig;
```

### 4.2 TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 4.3 Tailwind CSS v4 Setup

Tailwind CSS v4 replaces legacy JavaScript config files with modern CSS-first `@theme` directives and the PostCSS `@tailwindcss/postcss` plugin.

#### `postcss.config.mjs`
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

#### `src/app/globals.css`
```css
@import "tailwindcss";

@theme {
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-brand-accent: #0f766e;
}

@layer base {
  body {
    @apply bg-slate-50 text-slate-900 antialiased;
  }
}
```

---

## 5. Database Architecture & Neon Serverless Driver Adapter

### 5.1 Dual Connection Strings in `prisma/schema.prisma`

Neon PostgreSQL operates with two connection modes:
1. **Pooled Connection (`DATABASE_URL`)**: Uses PgBouncer on port 6543 for fast serverless queries, pooling connections across Vercel Lambdas.
2. **Direct Connection (`DIRECT_URL`)**: Connects directly to PostgreSQL on port 5432 for DDL operations, migrations, and `prisma db push`.

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}
```

### 5.2 Serverless Prisma Client Singleton (`src/lib/db/prisma.ts`)

```typescript
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

// Required for WebSocket connection in Node.js serverless environments
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

declare global {
  // Allow global `var` declarations in TypeScript
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not defined.');
  }

  // Use driver adapter in production and development for Neon serverless compatibility
  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalThis.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
```

### 5.3 Complete Entity Schema Definition

The Prisma schema must contain all 8 relational tables:

1. **`User`**: Admin user for authentication (`id`, `email`, `password_hash`, `name`, `role`, `created_at`, `updated_at`).
2. **`Class`**: Academic classes (`id`, `name`, `default_monthly_fee`, `default_admission_fee`, `late_fee_enabled`, `late_fee_type`, `late_fee_amount`, `status`, `created_at`, `updated_at`).
3. **`Student`**: Student records (`id`, `student_code` DPR-YYYY-XXX unique, `name`, `father_name`, `mother_name`, `guardian_name`, `mobile`, `whatsapp_number`, `address`, `dob`, `gender`, `school_name`, `class_id`, `admission_date`, `joining_date`, `fee_mode` DEFAULT|CUSTOM, `custom_monthly_fee`, `admission_fee`, `discount_amount`, `discount_type`, `status` ACTIVE|INACTIVE|LEFT|COMPLETED, `created_at`, `updated_at`).
4. **`FeeRecord`**: Immutable billing records (`id`, `student_id`, `class_id`, `billing_period_start`, `billing_period_end`, `due_date`, `base_fee`, `custom_discount`, `late_fee`, `total_amount`, `paid_amount`, `outstanding_amount`, `status` UPCOMING|DUE|PARTIALLY_PAID|PAID|OVERDUE|WAIVED|CANCELLED, `notes`, `created_at`, `updated_at`).
   - **Unique Constraint**: `@@unique([student_id, billing_period_start, billing_period_end])` ensures total idempotency.
5. **`Payment`**: Atomic payment transactions (`id`, `receipt_number` DPR-RC-YYYY-XXX unique, `fee_record_id`, `student_id`, `amount_paid`, `payment_date`, `payment_method` CASH|UPI|BANK_TRANSFER|CARD|OTHER, `transaction_id`, `notes`, `received_by_id`, `created_at`).
6. **`Document`**: Secure token storage for generated PDFs (`id`, `token` UUID unique, `document_type` RECEIPT|REMINDER, `entity_id`, `metadata` JSON, `expires_at`, `created_at`).
7. **`InstituteSetting`**: Tuition institute branding & configuration (`id`, `institute_name`, `tagline`, `contact_number`, `email`, `address`, `receipt_footer_note`, `reminder_message_template`, `receipt_message_template`, `logo_url`, `created_at`, `updated_at`).
8. **`AuditLog`**: Security and action tracking (`id`, `user_id`, `action`, `entity_type`, `entity_id`, `details` JSON, `ip_address`, `user_agent`, `created_at`).

---

## 6. Security, Authentication & Route Protection

### 6.1 Authentication Mechanism (`jose` + `bcryptjs`)

- **JWT Signing & Verification**: Using `jose` library, fully compatible with Edge and Node runtimes.
  * Algorithm: `HS256` with secret `JWT_SECRET`.
  * Expiration: 7 days (`7d`).
  * Cookie storage: `dpr_session` (httpOnly, Secure in production, SameSite=Lax).
- **Password Hashing**: `bcryptjs` with salt work factor 10. Avoids native C++ dependencies for seamless serverless Vercel deployment.

### 6.2 Middleware Protection Flow (`src/middleware.ts`)

```
Incoming Request
       │
       ▼
Is static asset or public route?
  (/_next/*, /favicon.ico, /login, /api/auth/login, /api/documents/*)
       │
       ├──► YES: Allow Pass-through
       │
       └──► NO: Inspect `dpr_session` Cookie
                 │
                 ├──► Token valid? 
                 │      ├──► YES: Inject User Header & Continue
                 │      └──► NO / Missing:
                 │             ├──► Is API Route? Return HTTP 401 JSON
                 │             └──► Is Page Route? Redirect to /login
```

---

## 7. Document Delivery & WhatsApp Architecture

### 7.1 On-Demand PDF Stream Pipeline

1. No static PDF files are saved to the filesystem, eliminating disk leakages on Vercel's read-only serverless environment.
2. When a receipt or reminder is requested:
   - A secure UUID token is generated (e.g. `crypto.randomUUID()`) and inserted into `Document` table.
   - The token URL is constructed: `/api/documents/${token}`.
3. When the route handler `/api/documents/[token]/route.ts` is invoked:
   - Resolves the document record, queries database for student, class, fee, payment, and institute branding data.
   - Invokes `@react-pdf/renderer` via `renderToBuffer(<ReceiptDocument ... />)`.
   - Returns a `Response` with `Content-Type: application/pdf` and `Content-Disposition: inline; filename="receipt-DPR-RC-2026-001.pdf"`.
   - This endpoint is public for authorized tokens, allowing parents and students to open links immediately without login.

### 7.2 WhatsApp Click-to-Chat Integration

- Format: `https://wa.me/{cleanPhone}?text={encodedMessage}`
- Phone normalization: Strip non-numeric characters; if 10-digit Indian number, prefix with country code `91`.
- Direct manual dispatch: Clicking "Share on WhatsApp" in the UI opens the official WhatsApp Web / Mobile client with the pre-filled message and secure tokenized PDF document link.

---

## 8. Complete Project File & Directory Architecture

```
d:\antigravity programme\tuition_manager\
├── .agents/                                # Agent metadata, plans, progress, handoffs
├── .env.example                            # Documented environment variables template
├── .env                                    # Local environment variables
├── .gitignore                              # Git ignore rules
├── package.json                            # Package dependencies and build scripts
├── tsconfig.json                           # TypeScript compiler configuration
├── next.config.ts                          # Next.js 15 serverExternalPackages & settings
├── postcss.config.mjs                      # Tailwind CSS v4 PostCSS configuration
├── README.md                               # Setup, architecture, and deployment guide
├── prisma/
│   ├── schema.prisma                       # Complete 8-table relational schema
│   ├── seed.ts                             # Database seeder (admin, 4 classes, 6 students)
│   └── migrations/                         # Migration history
└── src/
    ├── middleware.ts                       # Edge JWT authentication guard
    ├── app/
    │   ├── layout.tsx                      # Root layout (fonts, metadata, toasts)
    │   ├── globals.css                     # Tailwind v4 import & theme variables
    │   ├── page.tsx                        # Root entry redirect (/login or /dashboard)
    │   ├── (auth)/
    │   │   └── login/
    │   │       └── page.tsx                # Admin login page
    │   ├── (dashboard)/
    │   │   ├── layout.tsx                  # Dashboard layout with responsive sidebar
    │   │   ├── dashboard/
    │   │   │   └── page.tsx                # Main KPI cards, charts, alerts, quick actions
    │   │   ├── students/
    │   │   │   ├── page.tsx                # Student list table, search, filters
    │   │   │   ├── new/page.tsx            # Student registration form
    │   │   │   └── [id]/page.tsx           # Student profile, fee comparison, history
    │   │   ├── classes/
    │   │   │   └── page.tsx                # Class management & fee configuration
    │   │   ├── fees/
    │   │   │   ├── page.tsx                # Fee records ledger, status filters
    │   │   │   └── generate/page.tsx       # Idempotent batch fee cycle generator
    │   │   ├── payments/
    │   │   │   ├── page.tsx                # Payment transactions table
    │   │   │   └── collect/page.tsx        # Partial/full fee collection modal/flow
    │   │   ├── reports/
    │   │   │   └── page.tsx                # Multi-dimensional analytics & exports
    │   │   ├── settings/
    │   │   │   └── page.tsx                # Institute branding, receipt & reminder text
    │   │   └── audit/
    │   │       └── page.tsx                # System audit log viewer
    │   └── api/
    │       ├── auth/
    │       │   ├── login/route.ts          # Admin authentication & cookie issuance
    │       │   ├── logout/route.ts         # Session clearance
    │       │   └── me/route.ts             # Current admin profile
    │       ├── classes/
    │       │   ├── route.ts                # Class list & creation
    │       │   └── [id]/route.ts           # Class update & deletion
    │       ├── students/
    │       │   ├── route.ts                # Student list & registration
    │       │   └── [id]/route.ts           # Student update & profile data
    │       ├── fees/
    │       │   ├── route.ts                # Fee records query
    │       │   ├── generate/route.ts       # Idempotent fee engine generator endpoint
    │       │   └── [id]/route.ts           # Fee record status & waiver
    │       ├── payments/
    │       │   ├── route.ts                # Atomic payment creation with DB transaction
    │       │   └── [id]/route.ts           # Payment details
    │       ├── reports/
    │       │   └── route.ts                # Aggregated report data endpoint
    │       ├── documents/
    │       │   └── [token]/route.ts        # Public on-demand PDF stream generator
    │       ├── settings/
    │       │   └── route.ts                # Institute settings CRUD
    │       └── audit/
    │           └── route.ts                # Audit logs retrieval
    ├── components/
    │   ├── ui/                             # Button, Input, Select, Modal, Card, Table, Badge, Tabs
    │   ├── layout/                         # Sidebar, Header, MobileNav, UserMenu
    │   ├── dashboard/                      # KpiCard, MonthlyChart, ClassPieChart, StatusDonut, AlertsList
    │   ├── students/                       # StudentTable, StudentForm, FeeComparisonCard, FeeTimeline
    │   ├── classes/                        # ClassTable, ClassModal
    │   ├── fees/                           # FeeTable, FeeStatusBadge, FeeGenerateModal
    │   ├── payments/                       # PaymentModal, ReceiptButton, WhatsAppButton
    │   ├── reports/                        # ReportFilters, ExportButtons, ReportTable
    │   └── pdf/                            # ReceiptPDFDocument, ReminderPDFDocument, PDFStyles
    ├── lib/
    │   ├── db/
    │   │   └── prisma.ts                   # Neon serverless adapter & Prisma singleton
    │   ├── auth/
    │   │   ├── jwt.ts                      # jose sign and verify utilities
    │   │   ├── password.ts                 # bcryptjs hashing and comparison
    │   │   └── session.ts                  # Cookie extraction and verification helper
    │   ├── fee-engine/
    │   │   ├── billing-cycles.ts           # Admission date based cycle math
    │   │   ├── status.ts                   # Dynamic status derivation
    │   │   └── generator.ts                # Idempotent generation engine
    │   ├── documents/
    │   │   └── token.ts                    # UUID token generation & validation
    │   ├── whatsapp/
    │   │   └── link-builder.ts             # wa.me link generation and templating
    │   ├── audit/
    │   │   └── logger.ts                   # Audit log recorder
    │   ├── validations/
    │   │   ├── student.schema.ts           # Zod schema for student CRUD
    │   │   ├── class.schema.ts             # Zod schema for class CRUD
    │   │   ├── payment.schema.ts           # Zod schema for payment collection
    │   │   └── fee.schema.ts               # Zod schema for fee operations
    │   └── utils.ts                        # Currency formatters, cn(), date helpers
    └── types/
        └── index.ts                        # Shared TypeScript interfaces & types
```

---

## 9. Environment Variable Specifications (`.env.example`)

```env
# ==============================================================================
# DPR FEE MANAGEMENT SYSTEM - ENVIRONMENT VARIABLES
# ==============================================================================

# Database: Neon Serverless PostgreSQL
# DATABASE_URL: Pooled connection string (PgBouncer) for runtime queries
DATABASE_URL="postgresql://user:password@ep-cool-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# DIRECT_URL: Direct connection string for Prisma migrations & schema pushes
DIRECT_URL="postgresql://user:password@ep-cool.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Authentication: JWT Secret (Minimum 32 random characters)
JWT_SECRET="dpr-fee-mgmt-jwt-secret-key-production-2026-min32chars"

# Default Superadmin Credentials (for prisma db seed)
ADMIN_EMAIL="admin@dprtuition.com"
ADMIN_PASSWORD="AdminPassword123!"
ADMIN_NAME="DPR Admin"

# Application URL (Used for generating absolute document links in WhatsApp messages)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Institute Default Profile
NEXT_PUBLIC_INSTITUTE_NAME="DPR Private Tuition"
NEXT_PUBLIC_INSTITUTE_PHONE="+91 98765 43210"
NEXT_PUBLIC_INSTITUTE_ADDRESS="Main Road, Near City Center, Education Hub"
```

---

## 10. Verification Checklist for Implementation

Before handing off to Phase 1, the following commands must be ready for execution by Implementers:

- [x] Node.js `v24.19.0` and npm `11.17.0` active in environment PATH
- [x] Git `v2.45.0` active in environment PATH
- [x] Package dependencies verified for zero peer conflicts
- [x] Prisma 6 + Neon adapter compatibility confirmed
- [x] Next.js 15 serverExternalPackages identified
- [x] Tailwind v4 `@theme` and `@tailwindcss/postcss` configured
- [x] `jose` and `bcryptjs` selected for Edge + Serverless safety
- [x] Dynamic billing cycle and UUID token PDF architecture documented

---
*Report generated and verified by Explorer Survey 1.*
