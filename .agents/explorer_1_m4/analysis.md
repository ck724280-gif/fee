# DPR Fee Management System — Milestone 4 Architecture Analysis & Technical Blueprint

**Milestone**: Milestone 4 — UI Pages & Layout Architecture  
**Author**: Explorer 1 (Teamwork Explorer)  
**Date**: 2026-08-15  
**Integrity Mode**: Development / Production-Ready  
**Target Stack**: Next.js 15.2 (App Router), React 19.0, Tailwind CSS v4, Prisma ORM 6, Lucide React 0.475, Recharts 2.15, Zod 3.24, date-fns 4.1  

---

## 1. Executive Summary & Objective

Milestone 4 is responsible for delivering the entire frontend user experience and administrative interface of the DPR Fee Management System. It builds directly upon the foundational database schema (M1), the admission-date anchored billing cycle engine (M2), and the atomic payment & secure PDF document generation engine (M3).

This document establishes the file-by-file technical blueprint and interface specifications for the 5 core deliverables:
1. **Dashboard Layout Shell** (`src/app/(dashboard)/layout.tsx`): Desktop sidebar, responsive mobile collapsible drawer, dynamic breadcrumbs, notification badge, and admin user menu.
2. **SaaS Dashboard Main View** (`src/app/(dashboard)/page.tsx`): Real-time KPI metrics grid, High-Priority Overdue Alert Banner, Quick Action control bar, interactive Recharts analytics (Monthly trend, Class distribution, Fee status donut), and Recent Payments ledger.
3. **Class Management Hub** (`src/app/(dashboard)/classes/page.tsx`): Interactive classes table, class fee metrics, and `ClassModal` form supporting default monthly fee, admission fee, and configurable late fee surcharge policies.
4. **Student Management Hub** (`src/app/(dashboard)/students/page.tsx`): Student directory with search, multi-filter toolbar (Class, Status, Fee Mode), pagination, and `StudentModal` supporting dynamic fee mode resolution (`DEFAULT` vs `CUSTOM`), class default fee auto-population, discount previews, and admission anchor setup.
5. **Student 360° Profile View** (`src/app/(dashboard)/students/[id]/page.tsx`): Comprehensive single-student cockpit featuring lifetime billing statistics, personal details, fee mode comparison (Class vs Actual Rate), chronological billing cycles timeline with color-coded status badges, payment ledger with on-demand PDF receipts, and WhatsApp click-to-chat triggers.

---

## 2. Codebase Audit & System Invariants

### 2.1 Existing Backend Contracts & Engine Review
- **Prisma Schema (`prisma/schema.prisma`)**:
  - `Class`: `id`, `name`, `defaultMonthlyFee`, `defaultAdmissionFee`, `lateFeeEnabled`, `lateFeeType` (FIXED/PER_DAY), `lateFeeAmount`, `graceDays`, `status` (ACTIVE/INACTIVE).
  - `Student`: `id`, `studentCode` (`DPR-YYYY-SEQ`), `name`, `fatherName`, `motherName`, `guardianName`, `mobile`, `whatsappNumber`, `address`, `dob`, `gender`, `school`, `classId`, `admissionDate`, `joiningDate`, `feeMode` (`DEFAULT`/`CUSTOM`), `customMonthlyFee`, `admissionFee`, `discountType` (`NONE`/`FIXED`/`PERCENTAGE`), `discountValue`, `status` (`ACTIVE`/`INACTIVE`/`LEFT`/`COMPLETED`).
  - `FeeRecord`: `id`, `studentId`, `classId`, `billingPeriodStart`, `billingPeriodEnd`, `dueDate`, `baseAmount`, `admissionFeeAmount`, `discountAmount`, `lateFeeAmount`, `totalAmount`, `paidAmount`, `outstandingAmount`, `status` (`UPCOMING`, `DUE`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `WAIVED`, `CANCELLED`), `feeMode`. Unique on `(studentId, billingPeriodStart, billingPeriodEnd)`.
  - `Payment`: `id`, `receiptNumber` (`DPR-RC-YYYY-SEQ`), `feeRecordId`, `studentId`, `amount`, `paymentMethod` (`CASH`, `UPI`, `BANK_TRANSFER`, `CARD`, `OTHER`), `transactionId`, `notes`, `paymentDate`, `recordedByUserId`.
  - `Document`: `id`, `token` (crypto UUID), `documentType` (`RECEIPT`, `REMINDER`, `STATEMENT`, `REPORT`), `referenceId`, `studentId`, `metadata`, `expiresAt`.
  - `InstituteSetting`: `instituteName`, `tagline`, `address`, `phone`, `whatsapp`, `email`, `currencySymbol`, `defaultGraceDays`.

- **Existing APIs**:
  - `/api/fees` (GET with multi-filter, pagination, summaries)
  - `/api/fees/[id]` (GET single fee record, PATCH notes/status)
  - `/api/fees/generate` (POST batch or single student billing generation)
  - `/api/payments` (GET filtered list, POST atomic payment creation with overpayment guard)
  - `/api/payments/[id]` (GET single payment)
  - `/api/documents/route.ts` (POST create document token)
  - `/api/documents/reminders/route.ts` (POST create reminder document token)
  - `/api/documents/[token]/route.ts` (GET stream PDF inline)
  - `/api/documents/download/[token]/route.ts` (GET stream PDF as attachment)

- **Frontend & Styling Stack**:
  - **Tailwind v4**: Uses `@import "tailwindcss";` and `@theme` variables.
  - **Lucide Icons**: `lucide-react` with icons for all actions and navigation.
  - **Recharts**: `recharts` for Donut, Bar, and Pie analytics.
  - **React 19 / Next.js 15**: Support for Client and Server components, standard `useParams()` / `useSearchParams()` hooks.

---

## 3. Component Architecture & File Topology

The following files will be introduced and structured for Milestone 4:

```
tuition_manager/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                 # [Deliverable 1] Dashboard Shell (Sidebar, MobileNav, Header)
│   │   │   ├── page.tsx                   # [Deliverable 2] SaaS Dashboard (KPIs, Charts, Alerts, Quick Actions)
│   │   │   ├── classes/
│   │   │   │   └── page.tsx               # [Deliverable 3] Class Management UI & Data Table
│   │   │   └── students/
│   │   │       ├── page.tsx               # [Deliverable 4] Student Directory, Filters & Pagination
│   │   │       └── [id]/
│   │   │           └── page.tsx           # [Deliverable 5] Student 360° Profile, Fee Timeline & Payments
│   │   └── api/
│   │       ├── classes/
│   │       │   ├── route.ts               # GET (list all) / POST (create class)
│   │       │   └── [id]/
│   │       │       └── route.ts           # GET / PUT / DELETE
│   │       ├── students/
│   │       │   ├── route.ts               # GET (filtered list) / POST (create student + DPR-YYYY-SEQ)
│   │       │   └── [id]/
│   │       │       └── route.ts           # GET (360° data) / PUT (update student) / DELETE
│   │       └── dashboard/
│   │           └── stats/
│   │               └── route.ts           # GET (aggregated KPIs, chart datasets, overdue alerts)
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx                 # Button primitive (primary, secondary, outline, danger, ghost, loading)
│   │   │   ├── Card.tsx                   # Card, CardHeader, CardTitle, CardContent primitives
│   │   │   ├── Modal.tsx                  # Accessible Dialog/Modal with backdrop and ESC support
│   │   │   ├── Badge.tsx                  # Status & Fee Mode pill badges (PAID, DUE, OVERDUE, etc.)
│   │   │   ├── Input.tsx                  # Form text, number, date inputs with labels & error states
│   │   │   ├── Select.tsx                 # Dropdown select primitive
│   │   │   ├── Textarea.tsx               # Textarea primitive
│   │   │   ├── Alert.tsx                  # Alert banners (warning, info, danger, success)
│   │   │   ├── Pagination.tsx             # Table pagination bar (items per page, prev, next, page numbers)
│   │   │   └── Tabs.tsx                   # Tabbed navigation container for profile views
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx                # Desktop fixed navigation sidebar
│   │   │   ├── MobileNav.tsx              # Mobile drawer overlay navigation
│   │   │   ├── Header.tsx                 # Top app bar (mobile toggle, breadcrumbs, user profile, notifications)
│   │   │   ├── Breadcrumbs.tsx            # Dynamic breadcrumb trail builder
│   │   │   └── UserDropdown.tsx           # Admin user profile & logout dropdown
│   │   ├── dashboard/
│   │   │   ├── KPICards.tsx               # High-density responsive KPI grid
│   │   │   ├── OverdueAlertBanner.tsx     # High-priority overdue alert banner
│   │   │   ├── QuickActions.tsx           # Primary action buttons (Add Student, Collect Fee, Gen Fees)
│   │   │   ├── MonthlyTrendChart.tsx      # Recharts monthly collection bar chart (SSR-safe)
│   │   │   ├── FeeStatusDonutChart.tsx    # Recharts fee status breakdown donut chart (SSR-safe)
│   │   │   ├── ClassDistributionChart.tsx # Recharts class distribution chart (SSR-safe)
│   │   │   └── RecentPaymentsTable.tsx    # Recent 5-10 payment ledger rows
│   │   ├── classes/
│   │   │   └── ClassModal.tsx             # Add / Edit Class modal with fee & late fee rules
│   │   ├── students/
│   │   │   └── StudentModal.tsx           # Add / Edit Student modal (DEFAULT/CUSTOM fee mode toggle)
│   │   ├── payments/
│   │   │   └── CollectFeeModal.tsx        # Quick fee collection modal calling /api/payments
│   │   └── whatsapp/
│   │       └── WhatsAppButton.tsx         # Click-to-chat action button with wa.me deep links
│   └── lib/
│       ├── whatsapp.ts                    # WhatsApp message formatting and phone sanitization utilities
│       └── validations/
│           ├── class.ts                   # Zod schemas for Class CRUD
│           └── student.ts                 # Zod schemas for Student CRUD & filters
```

---

## 4. Technical Blueprint by Deliverable

### 4.1 Deliverable 1: Dashboard Layout Shell (`src/app/(dashboard)/layout.tsx`)

#### Layout Architecture
The dashboard shell provides a unified container for all administrative workflows. It consists of:
1. **Desktop Sidebar** (`w-64` fixed, visible on `lg:` breakpoints):
   - **Institute Branding Header**: DPR Tuition logo emblem, "DPR Tuition", subtitle "Fee Management System".
   - **Navigation Navigation List** with active path indicator (blue border / background accent):
     - Dashboard (`/`): `LayoutDashboard`
     - Students (`/students`): `Users`
     - Classes (`/classes`): `GraduationCap`
     - Fee Records (`/fees`): `CreditCard`
     - Payment History (`/payments`): `Receipt`
     - Reports & Exports (`/reports`): `BarChart3`
     - Settings (`/settings`): `Settings`
     - Audit Logs (`/audit-logs`): `ShieldCheck`
   - **Sidebar Footer**: User profile summary ("DPR Admin", "admin@dprtuition.com") and Logout button with `LogOut` icon.
2. **Mobile Drawer (`MobileNav.tsx`)**:
   - Slide-in from left (`w-72`), smooth CSS transition (`translate-x-0` vs `-translate-x-full`).
   - Dark backdrop overlay (`bg-slate-900/60 backdrop-blur-xs`) closing on backdrop tap or route change.
   - Close button (X) at top right.
3. **Top Navigation Header (`Header.tsx`)**:
   - Hamburger menu toggle button (`Menu` icon) for small viewports (`lg:hidden`).
   - Dynamic **Breadcrumbs** (e.g. `Home` > `Students` > `Rahul Sharma (DPR-2026-001)`).
   - Quick **System Status Badge** (Current academic year / active database connection indicator).
   - User dropdown / Quick Logout trigger.
4. **Main Scrollable Content Canvas**:
   - `flex-1 flex flex-col min-w-0 bg-slate-50 min-h-screen`.
   - Inner container `max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8`.

---

### 4.2 Deliverable 2: SaaS Dashboard Main Page (`src/app/(dashboard)/page.tsx`)

#### Functional Requirements & Layout Structure
1. **High-Priority Overdue Alert Banner (`OverdueAlertBanner.tsx`)**:
   - Rendered at top if `overdueCount > 0` or `totalOverdueAmount > 0`.
   - High-contrast warning banner (amber/red border and soft red background).
   - Displays: "⚠️ Action Required: **[N] Students** have overdue fees totaling **₹[Amount]**".
   - One-click action button: "Review Overdue Accounts" (navigates to `/fees?status=OVERDUE`).
2. **KPI Metrics Grid (`KPICards.tsx`)** — 8 Core Metrics across responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6`):
   - **Total Students**: Total enrolled students + Active vs Inactive breakdown.
   - **Active Students**: Count of active students + percentage rate.
   - **Monthly Collection**: Total ₹ collected in current calendar month.
   - **Today's Collection**: Total ₹ collected on today's date.
   - **Pending & Due Fees**: Total outstanding balance on `DUE` and `PARTIALLY_PAID` records.
   - **Overdue Fees**: Total outstanding balance on `OVERDUE` records (red highlighted).
   - **Partial Payment Accounts**: Count of students currently paying in installments.
   - **New Admissions (This Month)**: Count of students admitted in the current month.
3. **Quick Action Control Bar (`QuickActions.tsx`)**:
   - `Add Student` (Primary blue button, opens `StudentModal`).
   - `Collect Fee` (Green button, opens `CollectFeeModal`).
   - `Generate Monthly Cycles` (Outline button with `RefreshCw` icon, triggers `/api/fees/generate`).
   - `View Due Fees` (Filter shortcut to `/fees?status=DUE`).
   - `Download Reports` (Navigates to `/reports`).
4. **Interactive Recharts Analytics Grid (`grid-cols-1 lg:grid-cols-3 gap-6`)**:
   - **Monthly Collection Trend** (`lg:col-span-2`): Responsive Bar/Area chart showing month-by-month collection over 12 months with tooltip in INR currency format.
   - **Fee Status Breakdown** (`lg:col-span-1`): Donut chart showing distribution across `PAID` (#10b981), `PARTIALLY_PAID` (#f59e0b), `DUE` (#3b82f6), `OVERDUE` (#ef4444), and `UPCOMING` (#8b5cf6).
   - **Class-wise Enrollment & Revenue**: Bar/Pie chart showing distribution across Class 5, Class 6, Class 7, Class 8, etc.
   - *SSR Safety Note*: All Recharts components are isolated inside `"use client"` wrappers with `mounted` state guards to eliminate hydration mismatches.
5. **Recent Payment Ledger (`RecentPaymentsTable.tsx`)**:
   - Displays latest 5-10 payments with Receipt Number, Student Name, Class, Amount, Payment Method badge, Payment Date, and quick actions ("View PDF Receipt", "WhatsApp Share").

---

### 4.3 Deliverable 3: Class Management UI (`src/app/(dashboard)/classes/page.tsx`)

#### Functional Requirements & Modals
1. **Class Listing Data Table & Metric Cards**:
   - Metric summaries: Total Classes, Active Classes, Total Students Across Classes, Average Monthly Fee.
   - Table columns:
     - **Class Name** (e.g. "Class 5", "Class 8")
     - **Default Monthly Fee** (e.g. ₹800.00 / month)
     - **Default Admission Fee** (e.g. ₹300.00)
     - **Late Fee Configuration**:
       - If disabled: `Disabled` gray badge.
       - If enabled: Badge showing `₹50 Fixed` or `₹5/day` (Grace: `5 days`).
     - **Enrolled Students**: Count of students currently enrolled in this class.
     - **Status**: `ACTIVE` (green badge) or `INACTIVE` (gray badge).
     - **Actions**:
       - `Edit Class` (Opens `ClassModal` pre-populated with class data).
       - `View Students` (Navigates to `/students?classId=[id]`).
       - `Toggle Status` (Active / Archive).
2. **Add / Edit Class Modal (`ClassModal.tsx`)**:
   - Form fields validated with Zod:
     - `name` (text, e.g. "Class 9", required)
     - `defaultMonthlyFee` (number, required, min 0)
     - `defaultAdmissionFee` (number, min 0, default 0)
     - `lateFeeEnabled` (switch toggle: Enabled/Disabled)
     - *Conditional Late Fee Section* (visible when enabled):
       - `lateFeeType` (Select: `FIXED` | `PER_DAY`)
       - `lateFeeAmount` (number, e.g. 50 or 5)
       - `graceDays` (number, e.g. 5 days after due date)
     - `status` (Select: `ACTIVE` | `INACTIVE`)
   - **Dynamic Impact Warning Note**: Prominently notes that updating the Class Default Fee immediately affects future billing cycles for students on `fee_mode = DEFAULT`, while all students on `fee_mode = CUSTOM` and existing historical fee records remain unchanged.

---

### 4.4 Deliverable 4: Student Management UI (`src/app/(dashboard)/students/page.tsx`)

#### Functional Requirements & Modals
1. **Directory Header & Filter Toolbar**:
   - **Search Input**: Live debounce or submit search for student name, student code (`DPR-2026-001`), mobile number, or WhatsApp number.
   - **Class Filter**: Select dropdown populated from active classes (`All Classes`, `Class 5`, `Class 6`, etc.).
   - **Status Filter**: `All Statuses`, `ACTIVE`, `INACTIVE`, `LEFT`, `COMPLETED`.
   - **Fee Mode Filter**: `All Modes`, `DEFAULT` (Class Rate), `CUSTOM` (Custom Student Rate).
   - **Clear Filters Button**: Resets all filters.
   - **"Add Student" Button**: Primary CTA opening `StudentModal`.
2. **Comprehensive Student Data Table**:
   - Table columns:
     - **Student Code** (`DPR-2026-001`, bold monospace font)
     - **Student Name & Guardian** (Name, avatar initial, and Father's/Guardian's name)
     - **Class** (Class name badge)
     - **Contact** (Mobile number with `tel:` link and quick WhatsApp icon)
     - **Admission Date** (DD MMM YYYY — permanent billing cycle anchor)
     - **Fee Configuration**:
       - Mode badge: `DEFAULT` (blue) or `CUSTOM` (purple)
       - Class Default Fee (e.g. ₹800)
       - Actual Monthly Rate (e.g. ₹800 or custom ₹650)
       - Discount tag if applicable (e.g. `10% Off` or `₹50 Off`)
     - **Status Badge**: `ACTIVE` (green), `INACTIVE` (gray), `LEFT` (amber), `COMPLETED` (blue)
     - **Actions**:
       - `View 360° Profile` (`Eye` icon -> `/students/[id]`)
       - `Edit Details` (`Pencil` icon -> opens `StudentModal`)
       - `Collect Fee` (`CreditCard` icon -> opens `CollectFeeModal`)
       - `WhatsApp Chat` (`MessageCircle` icon -> wa.me link)
3. **Pagination & Page Size Controls**:
   - Page info: "Showing 1 to 20 of 45 students".
   - Page buttons: Previous, 1, 2, 3..., Next.
   - Page size dropdown: 10, 20, 50, 100 records per page.
4. **Add / Edit Student Modal (`StudentModal.tsx`)**:
   - Multi-section grouped form:
     - **Section 1: Academic & Admission Setup**:
       - `classId` select: Selecting a class **auto-populates** suggested monthly fee and default admission fee.
       - `admissionDate`: Date input (default today) — establishes the anchor day (e.g. 3rd, 15th, 31st).
       - `joiningDate`: Optional Date input.
       - `status`: Select (`ACTIVE`, `INACTIVE`, `LEFT`, `COMPLETED`).
     - **Section 2: Fee Mode & Discount Engine**:
       - `feeMode` toggle: `DEFAULT (Class Standard Rate)` vs `CUSTOM (Personalized Rate)`.
       - When `DEFAULT`: Shows class rate (e.g. "Class Standard Fee: ₹800/mo").
       - When `CUSTOM`: Displays `customMonthlyFee` input (e.g. ₹650/mo) with explanation: "Locked fee rate for this student. Unaffected by future class fee changes."
       - `admissionFee`: Input pre-filled with class default admission fee, editable.
       - `discountType`: `NONE` | `FIXED` | `PERCENTAGE`.
       - `discountValue`: Input (₹ or %).
       - **Live Pricing Preview Calculation**:
         - *Base*: ₹800 - *Discount*: ₹80 (10%) = **Net Monthly Fee: ₹720/mo**.
     - **Section 3: Personal & Contact Details**:
       - `name` (required), `fatherName` (required), `motherName`, `guardianName`.
       - `mobile` (10-digit phone number, required).
       - `whatsappNumber` (optional, checkbox to sync with mobile).
       - `dob`, `gender` (`MALE`, `FEMALE`, `OTHER`), `school`, `address`.
   - Form submission automatically revalidates student table and displays toast notification.

---

### 4.5 Deliverable 5: Student 360° Profile View (`src/app/(dashboard)/students/[id]/page.tsx`)

#### Functional Requirements & Layout Structure
1. **Student Profile Header Banner**:
   - Avatar / Initials badge, Student Full Name, Student Code (`DPR-2026-001`), Class badge, Status badge.
   - Action Bar:
     - `Collect Fee` (Primary button, opens `CollectFeeModal` for current outstanding record).
     - `Generate Next Cycles` (Triggers billing engine up to current date).
     - `Send WhatsApp Notice` (Opens WhatsApp modal/link with reminder).
     - `Edit Student` (Opens `StudentModal`).
     - `Back to Students` (Navigates to `/students`).
2. **Student Lifetime Financial Summary Grid (4 Cards)**:
   - **Total Billed to Date**: ₹ Sum of all generated cycles.
   - **Total Paid to Date**: ₹ Sum of all completed payments.
   - **Current Outstanding Due**: ₹ Remaining unpaid balance (highlighted in red if >0, green if ₹0).
   - **Active Billing Status**: Current cycle status (`PAID`, `DUE`, `OVERDUE`, `UPCOMING`).
3. **Tabbed Information Architecture (`Tabs.tsx`)**:
   - **Tab 1: Fee History Timeline & Billing Cycles**:
     - Chronological list / table of all generated billing cycles:
       - Cycle Index (Cycle 1, Cycle 2, Cycle 3...)
       - Billing Period (e.g. `03 May 2026 – 02 Jun 2026`)
       - Due Date (e.g. `03 Jun 2026`)
       - Breakdown: Base Fee + Admission Fee - Discount + Late Fee = Total Fee
       - Paid Amount vs Remaining Outstanding
       - Fee Status badge (`PAID`, `PARTIALLY_PAID`, `DUE`, `OVERDUE`, `UPCOMING`)
       - **Cycle Actions**:
         - `Collect Payment` (if `outstandingAmount > 0`).
         - `Download Reminder Notice` (`FileText` icon -> generates UUID token & opens `/api/documents/[token]`).
         - `WhatsApp Reminder` (`MessageCircle` icon -> wa.me link with reminder text & document link).
   - **Tab 2: Payment History & Receipts**:
     - Complete ledger of all payments recorded for this student:
       - Receipt Number (`DPR-RC-2026-0001`, bold)
       - Payment Date (DD MMM YYYY, HH:mm)
       - Amount Paid (₹)
       - Payment Method badge (`CASH`, `UPI`, `BANK_TRANSFER`, `CARD`)
       - Transaction Reference ID (if UPI/Bank)
       - Notes & Recorded By
       - **Payment Actions**:
         - `View / Download PDF Receipt` (`Download` icon -> opens `/api/documents/[token]`).
         - `WhatsApp Receipt` (`Share2` icon -> wa.me link with receipt confirmation & PDF link).
   - **Tab 3: Personal & Contact Information**:
     - Guardian Details: Father's Name, Mother's Name, Guardian Name.
     - Contact Numbers: Mobile (`tel:` link), WhatsApp (`wa.me` link).
     - Demographics: Date of Birth, Gender, School, Full Residential Address.
     - Admission Anchor Info: "Admission Date: 03 May 2026 (Anchor: 3rd of each month)".
   - **Tab 4: Fee Configuration Snapshot**:
     - Detailed side-by-side comparison:
       - Fee Mode: `DEFAULT (Inheriting from Class)` vs `CUSTOM (Student-Specific)`
       - Class Standard Rate: ₹800.00 / month
       - Student Base Rate: ₹800.00 / month (or ₹650.00 if CUSTOM)
       - Active Discount: 10% (Fixed ₹80.00 discount)
       - Net Effective Monthly Charge: ₹720.00 / month
       - Initial Admission Fee: ₹300.00

---

## 5. Supporting APIs & Backend Specifications

To support the UI seamlessly, the following API endpoints and validation schemas must be implemented:

### 5.1 Class Management APIs
- `GET /api/classes`:
  - Query params: `search`, `status` (`ACTIVE`/`INACTIVE`).
  - Response: `{ success: true, data: { classes: Class[], total: number } }`.
  - Includes `_count: { students: true }`.
- `POST /api/classes`:
  - Validates `createClassSchema`.
  - Creates class record and records audit log.
- `GET /api/classes/[id]`:
  - Returns class details with student count and enrolled students summary.
- `PUT /api/classes/[id]`:
  - Validates `updateClassSchema`.
  - Updates class fee and late fee policies.
- `DELETE /api/classes/[id]`:
  - Guards against deleting classes with enrolled students. Returns 400 if students exist, or sets status to `INACTIVE`.

### 5.2 Student Management APIs
- `GET /api/students`:
  - Query params: `search`, `classId`, `status`, `feeMode`, `page`, `limit`, `sortBy`, `sortOrder`.
  - Response: `{ success: true, data: { students: Student[], pagination: PaginationInfo } }`.
  - Includes relation `class: { select: { id: true, name: true, defaultMonthlyFee: true } }` and `_count: { feeRecords: true, payments: true }`.
- `POST /api/students`:
  - Validates `createStudentSchema`.
  - Generates sequential student code `DPR-{YEAR}-{SEQ}` via `BillingEngine.generateStudentCode`.
  - Atomically creates Student record, optionally triggers first cycle generation, and creates audit log.
- `GET /api/students/[id]`:
  - Fetches complete 360° profile:
    - Student details with `class`.
    - `feeRecords` ordered by `billingPeriodStart asc`.
    - `payments` ordered by `paymentDate desc`.
    - Financial aggregates: `totalBilled`, `totalPaid`, `totalOutstanding`.
- `PUT /api/students/[id]`:
  - Validates `updateStudentSchema`.
  - Updates student profile, fee mode, discount, or status.
- `DELETE /api/students/[id]`:
  - Transitions student status to `LEFT` or `INACTIVE`.

### 5.3 Dashboard Analytics API (`GET /api/dashboard/stats`)
- Calculates real-time metrics:
  - `totalStudents`, `activeStudents`, `inactiveStudents`.
  - `todayCollection`, `monthlyCollection`, `allTimeCollection`.
  - `pendingFees`, `overdueFees`, `partialCount`, `newAdmissionsCount`.
  - `monthlyTrend`: 12-month array `[{ month: 'Jan 2026', collection: 12000 }, ...]`.
  - `classDistribution`: Array `[{ className: 'Class 8', students: 15, revenue: 12000 }, ...]`.
  - `feeStatusDistribution`: Array `[{ name: 'Paid', value: 45, color: '#10b981' }, ...]`.
  - `recentPayments`: Top 5 recent payments with student and class relation.
  - `overdueAlerts`: Array of overdue accounts for high-priority alert banner.

### 5.4 Zod Validation Schemas

```typescript
// src/lib/validations/class.ts
import { z } from 'zod';
import { ClassStatus, LateFeeType } from '@prisma/client';

export const createClassSchema = z.object({
  name: z.string().trim().min(1, 'Class name is required').max(100),
  defaultMonthlyFee: z.number().min(0, 'Monthly fee must be >= 0'),
  defaultAdmissionFee: z.number().min(0, 'Admission fee must be >= 0').default(0),
  lateFeeEnabled: z.boolean().default(false),
  lateFeeType: z.nativeEnum(LateFeeType).default(LateFeeType.FIXED),
  lateFeeAmount: z.number().min(0).default(0),
  graceDays: z.number().int().min(0).default(0),
  status: z.nativeEnum(ClassStatus).default(ClassStatus.ACTIVE),
});

export const updateClassSchema = createClassSchema.partial();
```

```typescript
// src/lib/validations/student.ts
import { z } from 'zod';
import { FeeMode, DiscountType, StudentStatus, Gender } from '@prisma/client';

export const createStudentSchema = z.object({
  name: z.string().trim().min(1, 'Student name is required').max(100),
  fatherName: z.string().trim().min(1, "Father's name is required").max(100),
  motherName: z.string().trim().max(100).optional().nullable(),
  guardianName: z.string().trim().max(100).optional().nullable(),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
  whatsappNumber: z.string().trim().optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  dob: z.union([z.string(), z.date()]).optional().nullable(),
  gender: z.nativeEnum(Gender).default(Gender.MALE),
  school: z.string().trim().max(150).optional().nullable(),
  classId: z.string().min(1, 'Class selection is required'),
  admissionDate: z.union([z.string(), z.date()], { required_error: 'Admission date is required' }),
  joiningDate: z.union([z.string(), z.date()]).optional().nullable(),
  feeMode: z.nativeEnum(FeeMode).default(FeeMode.DEFAULT),
  customMonthlyFee: z.number().min(0).optional().nullable(),
  admissionFee: z.number().min(0).default(0),
  discountType: z.nativeEnum(DiscountType).default(DiscountType.NONE),
  discountValue: z.number().min(0).default(0),
  status: z.nativeEnum(StudentStatus).default(StudentStatus.ACTIVE),
});

export const updateStudentSchema = createStudentSchema.partial();
```

---

## 6. WhatsApp Click-to-Chat Integration Engine (`src/lib/whatsapp.ts`)

WhatsApp integration operates strictly via client-side deep links (`https://wa.me/...`) without third-party API keys or auto-sending:
1. **Phone Number Sanitizer**: Strips non-digits, leading zeroes, spaces, and ensures `91` country code.
2. **Receipt Message Builder**: Pre-fills student name, class, amount paid, receipt number, balance due, and official document URL (`https://.../api/documents/[token]`).
3. **Fee Reminder Message Builder**: Pre-fills student name, class, amount due, due date, and reminder document URL.
4. **WhatsAppButton Component**: Provides one-click action buttons with copy-to-clipboard backup and direct WhatsApp Web / mobile app launch.

---

## 7. Responsiveness, Mobile Touch Targets & Design Standards

To ensure a first-class SaaS user experience on mobile, tablet, and desktop:
- **Collapsible Drawer**: Header hamburger button opens an accessible mobile drawer on screens `< 1024px` (`lg:`).
- **Horizontal Table Scrolling**: All data tables are wrapped in `<div className="overflow-x-auto w-full">` to enable smooth horizontal touch scrolling without page blowout.
- **Touch Target Sizing**: All interactive buttons, action icons, and form controls have a minimum touch target size of `44px x 44px`.
- **Responsive Form Modals**: Modals render full-width with scrollable bodies on mobile (`w-full max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto`).
- **Color Palette & Contrast**:
  - Primary Brand: Indigo/Blue (`#2563eb`, `#1d4ed8`, `#eff6ff`)
  - Accent / Highlights: Teal/Emerald (`#0f766e`, `#10b981`)
  - Warnings & Due: Amber (`#f59e0b`, `#d97706`, `#fffbeb`)
  - Overdue / Danger: Red (`#ef4444`, `#dc2626`, `#fee2e2`)
  - Background & Slate: `#f8fafc`, `#f1f5f9`, `#334155`, `#0f172a`

---

## 8. State Management, Data Flow & Edge Cases

| Scenario / Edge Case | Handled Behavior |
|---|---|
| **Empty Database / First Run** | Dashboard, Class, and Student pages render clean empty state illustrations with "Add First Class" or "Add First Student" CTA without divide-by-zero or undefined errors. |
| **Changing Class Default Fee** | Explanatory banner informs admin that existing fee records and CUSTOM students are unaffected; only future cycles for DEFAULT students inherit new rate. |
| **CUSTOM Fee Mode without customMonthlyFee** | Client and server validation requires `customMonthlyFee >= 0` when `feeMode === 'CUSTOM'`. |
| **Month-end Admission Date (28th, 29th, 30th, 31st)** | Displayed accurately on profile timeline; next cycles respect anchor clamping and recovery. |
| **Fee Collection exceeding Outstanding** | Overpayment guard rejects collection amounts greater than remaining balance with inline error message. |
| **Recharts Hydration Mismatch** | `mounted` guard (`useEffect(() => setMounted(true), [])`) prevents server/client mismatch during Next.js SSR. |
| **Mobile Screen Navigation** | Drawer automatically closes on navigation route changes. |

---

## 9. Implementation Roadmap for Implementer

1. **Step 1 — Foundation Primitives & Layout**:
   - Create UI primitives: `Button.tsx`, `Card.tsx`, `Modal.tsx`, `Badge.tsx`, `Input.tsx`, `Select.tsx`, `Textarea.tsx`, `Alert.tsx`, `Pagination.tsx`, `Tabs.tsx`.
   - Implement `Sidebar.tsx`, `MobileNav.tsx`, `Header.tsx`, `Breadcrumbs.tsx`, `UserDropdown.tsx`.
   - Assemble `src/app/(dashboard)/layout.tsx`.
2. **Step 2 — Backend API Routes & Validations**:
   - Create `src/lib/validations/class.ts` and `src/lib/validations/student.ts`.
   - Create `src/app/api/classes/route.ts` & `src/app/api/classes/[id]/route.ts`.
   - Create `src/app/api/students/route.ts` & `src/app/api/students/[id]/route.ts`.
   - Create `src/app/api/dashboard/stats/route.ts`.
3. **Step 3 — WhatsApp Utility & Component**:
   - Create `src/lib/whatsapp.ts` and `src/components/whatsapp/WhatsAppButton.tsx`.
4. **Step 4 — Class Management UI**:
   - Build `ClassModal.tsx`.
   - Assemble `src/app/(dashboard)/classes/page.tsx`.
5. **Step 5 — Student Management UI**:
   - Build `StudentModal.tsx` (DEFAULT vs CUSTOM toggle, class auto-populate, discount preview).
   - Build `CollectFeeModal.tsx`.
   - Assemble `src/app/(dashboard)/students/page.tsx`.
6. **Step 6 — Student 360° Profile View**:
   - Assemble `src/app/(dashboard)/students/[id]/page.tsx` with all 4 tabs, fee timeline, and payment receipt actions.
7. **Step 7 — SaaS Dashboard Main Page**:
   - Build `KPICards.tsx`, `OverdueAlertBanner.tsx`, `QuickActions.tsx`, `MonthlyTrendChart.tsx`, `FeeStatusDonutChart.tsx`, `ClassDistributionChart.tsx`, `RecentPaymentsTable.tsx`.
   - Assemble `src/app/(dashboard)/page.tsx`.
8. **Step 8 — Verification & Build**:
   - Verify all routes, run `npm run build` and `npx tsc --noEmit`.
