# Milestone 4 Technical Analysis & Architectural Blueprint
## Recharts Analytics, Reports Engine & WhatsApp Deep Linking

**System**: DPR Fee Management System ("DPR Private Tuition")  
**Milestone**: Milestone 4 (Analytics, Reports & WhatsApp Integration)  
**Author**: Explorer 3  
**Status**: COMPLETE / READY FOR IMPLEMENTATION  
**Date**: 2026-08-15  

---

## 1. Executive Summary & Problem Boundary

Milestone 4 delivers the analytical, reporting, and parental communication core of the DPR Fee Management System. It transforms raw database records (classes, students, billing cycles, payments, documents) into actionable visual intelligence, auditable financial ledgers, RFC 4180 CSV exports, print-ready reports, and friction-free WhatsApp click-to-chat communication.

### Scope of Milestone 4 Deliverables:
1. **Interactive Recharts Dashboard Analytics (`src/components/dashboard/*`, `src/app/(dashboard)/page.tsx`, `src/app/api/dashboard/stats/route.ts`)**:
   - Monthly Collection Trend (last 6-12 months) with Composed/Bar/Area visualizations.
   - Class-Wise Student Enrollment & Revenue Distribution Chart.
   - Fee Status Breakdown Donut Chart (Paid, Partial, Due, Overdue, Upcoming).
   - High-Density KPI Cards (Total Students, Active Students, Today's Collection, Monthly Collection, Pending Fees, Overdue Arrears, Partial Count, New Admissions).
   - Real-Time Actionable Alerts (Due Today, Overdue Delinquencies) and Recent Activity Feed.
   - Guaranteed SSR Hydration Safety (zero layout shift, zero hydration mismatch in Next.js 15 App Router & React 19).

2. **Reports Engine (`src/app/(dashboard)/reports/page.tsx`, `src/lib/reports-service.ts`, `src/lib/csv-export.ts`, `src/app/api/reports/route.ts`)**:
   - 8 Multi-Dimension Financial and Operational Views:
     1. `MONTHLY_COLLECTION` — Monthly billing vs collections, outstanding, collection rate.
     2. `OVERDUE_FEES` — Defaulters aging ledger with overdue days, base/late fee breakdown, WhatsApp reminders.
     3. `CLASS_WISE_REVENUE` — Class-level enrollment, invoiced vs collected revenue, collection efficiency.
     4. `PAYMENT_METHOD_DISTRIBUTION` — Cash vs UPI vs Bank Transfer vs Card revenue share.
     5. `STUDENT_STATEMENT` — Chronological debit/credit running balance ledger for individual students.
     6. `ADMISSIONS_REPORT` — Student admissions timeline, one-time admission fee collection.
     7. `DISCOUNT_REPORT` — Concession/scholarship audit, fixed vs percentage discount analysis.
     8. `DAILY_COLLECTION` — Itemized daily cashier register of all payments and transactions.
   - RFC 4180 Compliant CSV Exporter with UTF-8 BOM encoding for seamless Microsoft Excel compatibility.
   - Browser Print Layout (`@media print`) stripping UI chrome, navigation, and rendering high-contrast tabular sheets.
   - Quick Summary PDF generation integration.

3. **WhatsApp Deep Linking Engine (`src/lib/whatsapp.ts`, `src/components/whatsapp/*`)**:
   - Indian Phone Sanitizer (+91 normalization, 10-digit validation, stripping leading 0s, spaces, hyphens).
   - Click-to-chat URL Generator (`https://wa.me/{phone}?text={encodedMessage}`).
   - Dynamic Templates: Fee Reminder, Payment Receipt, Overdue Notice with secure tokenized PDF links.
   - Interactive WhatsApp Preview Modal and Action Buttons.

4. **Supporting UI Shell & 360° Student Profile Views**:
   - Responsive Dashboard Layout Shell (`Sidebar.tsx`, `Header.tsx`, `MobileNav.tsx`).
   - Classes CRUD UI (`src/app/(dashboard)/classes/page.tsx`).
   - Students CRUD UI (`src/app/(dashboard)/students/page.tsx`).
   - Student 360° Profile View (`src/app/(dashboard)/students/[id]/page.tsx`) with fee comparison, lifetime totals, fee timeline, and payment history.

---

## 2. Interactive Recharts Dashboard Analytics

### 2.1 SSR Hydration Safety & React 19 / Next.js 15 App Router Strategy
Recharts calculates container dimensions using client DOM properties (`getBoundingClientRect`, `clientWidth`). In Next.js 15 server rendering:
- Directly rendering `<ResponsiveContainer>` during SSR triggers hydration mismatch errors or produces zero-width containers until window resize.
- **Architectural Solution**:
  1. All chart components marked with `'use client';` directive.
  2. Implement client mount state guard:
     ```tsx
     const [isMounted, setIsMounted] = useState(false);
     useEffect(() => {
       setIsMounted(true);
     }, []);
     ```
  3. Pre-mount fallback: Render a responsive skeleton placeholder matching exact chart height (`min-h-[300px]`) with smooth pulse animation.
  4. Empty-state handling: When datasets are empty or all zero, render an informative visual placeholder ("No transaction records found for this period") rather than broken chart artifacts.

```
┌───────────────────────────────────────────────────────────┐
│              Client Mount Lifecycle Guard                 │
├─────────────────────────────┬─────────────────────────────┤
│      SSR / Pre-Mount        │       Client Mounted        │
│   (isMounted === false)     │    (isMounted === true)     │
│                             │                             │
│  ┌───────────────────────┐  │  ┌───────────────────────┐  │
│  │   Skeleton Loading    │  │  │  ResponsiveContainer  │  │
│  │   Placeholder (h-72)  │  │  │  Recharts Visuals     │  │
│  │   Pulse Animation     │  │  │  Tooltips & Legends   │  │
│  └───────────────────────┘  │  └───────────────────────┘  │
└─────────────────────────────┴─────────────────────────────┘
```

### 2.2 Chart Component Specifications

#### 1. Monthly Collection Trend Chart (`src/components/dashboard/MonthlyCollectionChart.tsx`)
- **Visual Representation**: Composed Bar & Area chart showing Monthly Billed vs Monthly Collected revenue.
- **Features**:
  - Time Horizon Toggle: 6 Months vs 12 Months.
  - Primary Bar: Total Collected (`#2563eb` with gradient fill and rounded tops `radius={[4, 4, 0, 0]}`).
  - Comparison Area: Total Invoiced (`#93c5fd` with dashed border and 15% opacity fill).
  - Custom Tooltip (`CustomMonthlyTooltip`): Formats currency in Indian numbering (`₹XX,XXX`), shows collection percentage, and highlights variance.
  - XAxis: Month name (e.g. "Jan 2026", "Feb 2026").
  - YAxis: Formatted in thousands (`₹0`, `₹10k`, `₹20k`, `₹50k`).

#### 2. Class-Wise Student & Revenue Distribution Chart (`src/components/dashboard/ClassDistributionChart.tsx`)
- **Visual Representation**: Dual-axis Composed Chart (Bar for Revenue, Line for Student Count).
- **Features**:
  - Left Y-Axis: Revenue in ₹ (`₹5k`, `₹10k`, `₹20k`).
  - Right Y-Axis: Student Count integer scale (`0, 5, 10, 15, 20`).
  - Bar: Invoiced Revenue vs Collected Revenue by Class (Class 5, Class 6, Class 7, Class 8).
  - Line: Active Student Count across classes (`#0f766e`, dot size 4).
  - Tooltip: Shows Class Name, Student Count, Total Billed, Total Collected, and Collection Rate %.

#### 3. Fee Status Breakdown Donut Chart (`src/components/dashboard/FeeStatusDonutChart.tsx`)
- **Visual Representation**: Donut Pie Chart (`innerRadius={65}`, `outerRadius={92}`, `paddingAngle={4}`).
- **Strict Color Mapping**:
  - `PAID`: Emerald `#10b981` (Green)
  - `PARTIALLY_PAID`: Amber `#f59e0b` (Orange/Yellow)
  - `DUE`: Blue `#3b82f6` (Blue)
  - `OVERDUE`: Rose/Red `#ef4444` (Red)
  - `UPCOMING`: Violet/Indigo `#8b5cf6` (Purple)
- **Center Stat Badge**: Renders the overall collection rate or total active fee records inside the donut hole.
- **Legend & Tooltip**: Displays status name, record count, and total monetary value.

### 2.3 Dashboard KPI Cards & Alerts Architecture
- **Component**: `src/components/dashboard/KPICards.tsx`
- **8 Core Metrics**:
  1. **Total Students**: Total enrollment count + status breakdown tooltip.
  2. **Active Students**: Currently enrolled active students.
  3. **Today's Collection**: Payments received on current calendar day.
  4. **Monthly Collection**: Payments received during current calendar month + % comparison vs prior month.
  5. **Pending Fees**: Total outstanding balance across `DUE` and `PARTIALLY_PAID` records.
  6. **Overdue Arrears**: Total outstanding balance across `OVERDUE` records (>0 days past due).
  7. **Partial Payments**: Total number of fee records currently partially settled.
  8. **New Admissions**: Students admitted in current calendar month.
- **Alerts Component (`src/components/dashboard/AlertsBanner.tsx`)**:
  - Overdue Notice Banner: Highlights number of defaulters and total overdue sum with direct "View Defaulters" link.
  - Due Today Banner: Highlights fees due today with one-click collection modal trigger.
- **Recent Activity Feed (`src/components/dashboard/RecentActivityFeed.tsx`)**:
  - Displays latest 5-10 payment receipts with student name, class, receipt number, payment method, amount, and timestamp.

---

## 3. Reports Engine Architecture

### 3.1 The 8 Multi-Dimension Report Types

| # | Report Type Enum | Title | Core Purpose & Dimensions | Filter Options | Primary Summary Metrics |
|---|---|---|---|---|---|
| 1 | `MONTHLY_COLLECTION` | Monthly Collection Report | Analyzes monthly fee generation, collections, and recovery efficiency | Start Date, End Date, Class | Total Invoiced, Total Collected, Outstanding, Overall Collection Rate |
| 2 | `OVERDUE_FEES` | Defaulters & Overdue Ledger | Identifies delinquent accounts, aging buckets (<15d, 15-30d, >30d), late fees | Class, Overdue Age Bracket, Min Amount | Defaulters Count, Total Overdue Arrears, Accrued Late Fees |
| 3 | `CLASS_WISE_REVENUE` | Class Summary & Revenue | Academic cohort breakdown of enrollments, revenue, and collection rates | Academic Month/Year, Class Status | Total Students, Invoiced Revenue, Collected Revenue, Rate % |
| 4 | `PAYMENT_METHOD_DISTRIBUTION` | Payment Mode Breakdown | Financial breakdown across Cash, UPI, Bank Transfer, Card, Other | Start Date, End Date, Class | Cash Total, Digital Total (UPI/Card/Bank), Total Collected |
| 5 | `STUDENT_STATEMENT` | Student Statement / Ledger | Chronological debit/credit running balance statement for a specific student | Student ID (Required), Date Range | Total Invoiced, Total Paid, Net Running Balance Due |
| 6 | `ADMISSIONS_REPORT` | Admission Fee Register | Student intake audit and one-time admission fee collection tracker | Date Range, Class, Fee Status | Total Admissions, Admission Fees Billed, Collected, Outstanding |
| 7 | `DISCOUNT_REPORT` | Discount & Concessions | Audit of institutional scholarships, fixed and percentage concessions | Class, Discount Type (Fixed/%) | Total Monthly Concessions, Students on Discount, Annual Cost |
| 8 | `DAILY_COLLECTION` | Daily Collection Daybook | Itemized cashier register of every receipt issued on a selected date/range | Specific Date, Date Range, Method, Class | Cash-in-Hand, Digital Collections, Total Day Collection |

### 3.2 Detailed Dimension Schemas & Data Contracts

#### 1. Monthly Collection Report (`MONTHLY_COLLECTION`)
```typescript
export interface MonthlyCollectionReportRow {
  monthKey: string;          // "2026-05"
  monthLabel: string;        // "May 2026"
  totalBilled: number;       // ₹ Total fees generated
  totalCollected: number;    // ₹ Payments received
  outstandingAmount: number; // ₹ Pending/Overdue
  collectionRate: number;    // % (collected / billed * 100)
  transactionCount: number;  // Number of receipts issued
}
```

#### 2. Defaulters / Overdue Report (`OVERDUE_FEES`)
```typescript
export interface OverdueFeeReportRow {
  feeRecordId: string;
  studentId: string;
  studentCode: string;       // "DPR-2026-001"
  studentName: string;
  fatherName: string;
  mobile: string;
  whatsappNumber: string | null;
  className: string;
  billingPeriod: string;     // "03 May 2026 to 02 Jun 2026"
  dueDate: string;           // "03 Jun 2026"
  overdueDays: number;       // e.g. 14
  baseFee: number;
  lateFee: number;
  paidAmount: number;
  outstandingAmount: number; // Net amount due
  status: 'DUE' | 'OVERDUE';
}
```

#### 3. Class-Wise Revenue Report (`CLASS_WISE_REVENUE`)
```typescript
export interface ClassWiseRevenueReportRow {
  classId: string;
  className: string;
  totalStudents: number;
  activeStudents: number;
  defaultMonthlyFee: number;
  totalBilled: number;
  totalCollected: number;
  outstandingAmount: number;
  collectionRate: number;
}
```

#### 4. Payment Mode Breakdown Report (`PAYMENT_METHOD_DISTRIBUTION`)
```typescript
export interface PaymentMethodReportRow {
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
  methodLabel: string;
  transactionCount: number;
  totalAmount: number;
  percentageShare: number;   // % of total revenue
  averageTransaction: number;
}
```

#### 5. Student Statement / Ledger (`STUDENT_STATEMENT`)
```typescript
export interface StudentStatementReportRow {
  id: string;
  date: string;              // "2026-05-03"
  transactionType: 'FEE_INVOICE' | 'PAYMENT_RECEIPT';
  referenceNumber: string;   // Fee Cycle index or Receipt No "DPR-RC-2026-0001"
  description: string;       // "Monthly Tuition Fee (May 3 - Jun 2)" or "Fee Payment via UPI"
  debit: number;             // Fee amount added to balance
  credit: number;            // Payment amount subtracted
  runningBalance: number;    // Cumulative balance after this row
  paymentMethod?: string;
  status: string;
}
```

#### 6. Admission Fee Report (`ADMISSIONS_REPORT`)
```typescript
export interface AdmissionFeeReportRow {
  studentId: string;
  studentCode: string;
  studentName: string;
  admissionDate: string;
  className: string;
  feeMode: 'DEFAULT' | 'CUSTOM';
  admissionFeeBilled: number;
  admissionFeePaid: number;
  outstandingAdmissionFee: number;
  status: string;
}
```

#### 7. Discount Report (`DISCOUNT_REPORT`)
```typescript
export interface DiscountReportRow {
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string;
  classDefaultFee: number;
  feeMode: 'DEFAULT' | 'CUSTOM';
  discountType: 'NONE' | 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  monthlyDiscountAmount: number;
  netMonthlyFee: number;
  annualConcession: number;  // monthlyDiscountAmount * 12
}
```

#### 8. Daily Collection Register (`DAILY_COLLECTION`)
```typescript
export interface DailyCollectionReportRow {
  paymentId: string;
  paymentDate: string;       // "2026-05-15 14:30"
  receiptNumber: string;     // "DPR-RC-2026-0001"
  studentCode: string;
  studentName: string;
  className: string;
  paymentMethod: string;
  transactionId: string | null;
  amount: number;
  recordedBy: string;
  feePeriod: string;
}
```

### 3.3 RFC 4180 Compliant CSV Export Architecture (`src/lib/csv-export.ts`)
1. **RFC 4180 Principles**:
   - Each record on a separate line (`\r\n` or `\n`).
   - Fields containing commas (`,`), double quotes (`"`), or line breaks (`\n`) must be enclosed in double quotes.
   - Any embedded double quote within a field must be escaped by prefixing it with another double quote (`"` -> `""`).
   - Header row contains human-readable column titles.
2. **UTF-8 Byte Order Mark (BOM)**:
   - Prepend `\uFEFF` to the generated CSV string.
   - Prevents Microsoft Excel (on Windows in India) from corrupting the Rupee currency symbol `₹` or Indian student names.
3. **Implementation Interface**:
   ```typescript
   export interface CSVColumn<T> {
     key: keyof T | string;
     label: string;
     formatter?: (val: any, row: T) => string | number;
   }

   export function generateRFC4180CSV<T extends Record<string, any>>(
     data: T[],
     columns: CSVColumn<T>[]
   ): string {
     const BOM = '\uFEFF';
     const escapeField = (val: any): string => {
       if (val === null || val === undefined) return '""';
       const str = String(val);
       const escaped = str.replace(/"/g, '""');
       return `"${escaped}"`;
     };

     const headerLine = columns.map(c => escapeField(c.label)).join(',');
     const rows = data.map(row =>
       columns.map(col => {
         const rawVal = col.formatter ? col.formatter(row[col.key], row) : row[col.key];
         return escapeField(rawVal);
       }).join(',')
     );

     return BOM + [headerLine, ...rows].join('\r\n') + '\r\n';
   }

   export function downloadCSVFile(filename: string, csvContent: string): void {
     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.setAttribute('href', url);
     link.setAttribute('download', filename);
     link.style.visibility = 'hidden';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     URL.revokeObjectURL(url);
   }
   ```

### 3.4 Print-Friendly CSS Layout Architecture (`@media print`)
When the administrator clicks "Print Report" (`window.print()`):
1. **Element Stripping via `.no-print`**:
   - Navigation sidebar, dashboard topbar, tab selectors, filter forms, pagination controls, search bars, and action buttons have the `.no-print` utility class.
   - `@media print { .no-print { display: none !important; } }`.
2. **Branded Printable Header**:
   - Injected into DOM:
     ```html
     <div className="hidden print:block print:mb-6 print:border-b print:pb-4">
       <div className="flex justify-between items-start">
         <div>
           <h1 className="text-xl font-bold text-black">DPR Private Tuition</h1>
           <p className="text-xs text-gray-600">Station Road, Near City Center, West Bengal | +91 98765 43210</p>
         </div>
         <div className="text-right text-xs text-gray-600">
           <p className="font-semibold text-black">{reportTitle}</p>
           <p>Generated: {currentDateFormatted}</p>
           <p>Filter: {filterSummary}</p>
         </div>
       </div>
     </div>
     ```
3. **Table Formatting & Page Breaks**:
   - `table { width: 100%; border-collapse: collapse; page-break-inside: auto; }`
   - `tr { page-break-inside: avoid; page-break-after: auto; }`
   - `thead { display: table-header-group; }` (repeats table header on every printed page)
   - `tfoot { display: table-footer-group; }`
   - `th, td { border: 1px solid #94a3b8; padding: 6px 8px; font-size: 9pt; color: #000; }`
   - `th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; }`

---

## 4. WhatsApp Deep Linking Architecture

### 4.1 Phone Number Sanitization Engine (`src/lib/whatsapp.ts`)
Tuition managers enter phone numbers in various formats. The WhatsApp API requires pure international format (`91XXXXXXXXXX` for India).

#### Sanitization Rules:
1. Strip all non-digit characters (`/[^\d]/g`).
2. Strip leading `0` if present (e.g. `09876543210` -> `9876543210`).
3. If length is 10 digits: Prepend country code `91` (e.g. `9876543210` -> `919876543210`).
4. If length is 12 digits and starts with `91`: Retain as is.
5. If invalid length or empty: Return empty string.

```typescript
export function sanitizeIndianPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
}

export function isValidIndianPhone(phone: string | null | undefined): boolean {
  const sanitized = sanitizeIndianPhone(phone);
  return /^91[6-9]\d{9}$/.test(sanitized);
}
```

### 4.2 Click-to-Chat URL Generator
- WhatsApp deep linking URL specification: `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(messageBody)}`.
- Zero automated messaging: opens WhatsApp Web (on PC) or WhatsApp mobile client with pre-filled message, allowing the tuition manager to review, edit, and click Send.

```typescript
export function buildWhatsAppUrl(phone: string, message: string): string {
  const sanitized = sanitizeIndianPhone(phone);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${sanitized}?text=${encoded}`;
}
```

### 4.3 Dynamic WhatsApp Message Templates

#### Template 1: Fee Reminder (`generateFeeReminderMessage`)
```typescript
export function generateFeeReminderMessage(data: {
  studentName: string;
  className: string;
  dueAmount: number;
  dueDateStr: string;
  billingPeriodStr?: string;
  documentUrl: string;
  instituteName?: string;
  contactPhone?: string;
}): string {
  const institute = data.instituteName || 'DPR Private Tuition';
  const phone = data.contactPhone || '+91 98765 43210';
  
  return [
    `Dear Parent/Student,`,
    ``,
    `This is a gentle fee reminder from *${institute}* for *${data.studentName}* (${data.className}).`,
    ``,
    data.billingPeriodStr ? `📌 *Billing Period*: ${data.billingPeriodStr}` : null,
    `💰 *Amount Due*: *₹${data.dueAmount.toLocaleString('en-IN')}*`,
    `📅 *Due Date*: *${data.dueDateStr}*`,
    ``,
    `📄 *View / Download Fee Notice*:`,
    `${data.documentUrl}`,
    ``,
    `💳 *Payment Modes*: Cash, UPI (dprtuition@upi), Bank Transfer.`,
    `_Please ignore this notice if payment has already been made._`,
    ``,
    `Thank you,`,
    `*${institute}*`,
    `📞 ${phone}`
  ].filter(Boolean).join('\n');
}
```

#### Template 2: Payment Receipt (`generatePaymentReceiptMessage`)
```typescript
export function generatePaymentReceiptMessage(data: {
  studentName: string;
  className: string;
  paidAmount: number;
  receiptNumber: string;
  paymentMethod?: string;
  outstandingAmount: number;
  documentUrl: string;
  instituteName?: string;
  contactPhone?: string;
}): string {
  const institute = data.instituteName || 'DPR Private Tuition';
  const phone = data.contactPhone || '+91 98765 43210';
  
  return [
    `Dear Parent/Student,`,
    ``,
    `We have received your fee payment for *${data.studentName}* (${data.className}) at *${institute}*.`,
    ``,
    `🧾 *Receipt No*: *${data.receiptNumber}*`,
    `💵 *Amount Paid*: *₹${data.paidAmount.toLocaleString('en-IN')}*`,
    data.paymentMethod ? `💳 *Payment Method*: ${data.paymentMethod}` : null,
    `📊 *Remaining Balance*: *₹${data.outstandingAmount.toLocaleString('en-IN')}*`,
    ``,
    `📄 *Download Official Receipt PDF*:`,
    `${data.documentUrl}`,
    ``,
    `Thank you for your prompt payment and cooperation.`,
    ``,
    `Warm regards,`,
    `*${institute}*`,
    `📞 ${phone}`
  ].filter(Boolean).join('\n');
}
```

#### Template 3: Overdue Notice (`generateOverdueNoticeMessage`)
```typescript
export function generateOverdueNoticeMessage(data: {
  studentName: string;
  className: string;
  overdueAmount: number;
  dueDateStr: string;
  overdueDays: number;
  documentUrl: string;
  instituteName?: string;
  contactPhone?: string;
}): string {
  const institute = data.instituteName || 'DPR Private Tuition';
  const phone = data.contactPhone || '+91 98765 43210';
  
  return [
    `⚠️ *URGENT FEE NOTICE — ${institute.toUpperCase()}*`,
    ``,
    `Dear Parent/Student,`,
    ``,
    `Our records indicate an overdue fee balance for *${data.studentName}* (${data.className}).`,
    ``,
    `📌 *Overdue Amount*: *₹${data.overdueAmount.toLocaleString('en-IN')}*`,
    `📅 *Originally Due Date*: *${data.dueDateStr}*`,
    `⏳ *Days Overdue*: *${data.overdueDays} days*`,
    ``,
    `📄 *View Official Notice*:`,
    `${data.documentUrl}`,
    ``,
    `Please clear the outstanding dues at your earliest convenience. If you have already paid, kindly share the receipt transaction reference.`,
    ``,
    `Thank you,`,
    `*${institute}*`,
    `📞 ${phone}`
  ].filter(Boolean).join('\n');
}
```

### 4.4 WhatsApp UI Components
1. **`WhatsAppShareButton.tsx`**:
   - Green WhatsApp branding (`bg-[#25D366] hover:bg-[#1ebd5a] text-white`).
   - Renders MessageSquare / WhatsApp icon.
   - Click opens `WhatsAppPreviewModal`.
2. **`WhatsAppPreviewModal.tsx`**:
   - Preview of pre-formatted message.
   - Recipient number selector (Student Mobile vs Parent WhatsApp).
   - "Open in WhatsApp" button (triggers `window.open(waUrl, '_blank')`).
   - "Copy Message" button (copies to system clipboard with visual toast feedback).

---

## 5. Supporting CRUD & Student 360° Profile View

### 5.1 Student Management & Fee Mode Integration (`src/app/(dashboard)/students/page.tsx`)
- **Add Student Modal / Form Workflow**:
  1. Selecting a Class immediately fetches and displays that Class's Default Monthly Fee and Default Admission Fee.
  2. The Admin selects Fee Mode:
     - **`DEFAULT`**: Monthly fee is dynamically linked to the class default fee. Custom fee input is disabled.
     - **`CUSTOM`**: Custom monthly fee input field unlocks, allowing the admin to set a student-specific rate (e.g. ₹650 instead of ₹700).
  3. Discount Configuration:
     - Discount Type: `NONE`, `FIXED` (₹ deduction), or `PERCENTAGE` (% concession).
     - Discount Value: Numeric input (validated <= base fee or 0-100%).
  4. Admission Fee: Pre-populated with class default admission fee, editable by admin.
  5. Automatic Student Code: On submission, the backend generates unique `DPR-{YEAR}-{SEQ}` (e.g. `DPR-2026-001`).

### 5.2 Student 360° Profile View (`src/app/(dashboard)/students/[id]/page.tsx`)
A comprehensive single-page command center for any student:
1. **Identity & Academic Card**:
   - Student Code, Full Name, Father's Name, Mother's Name, Guardian Name.
   - Contact Mobile, WhatsApp, Residential Address, School Name, Date of Birth, Gender.
   - Admission Date, Joining Date, Active Status Badge.
2. **Fee Configuration Comparison Card**:
   - Class Default Fee (₹) vs Student Fee Mode (`DEFAULT` or `CUSTOM`) vs Actual Base Fee (₹).
   - Discount Applied (₹ or %) -> Net Monthly Fee Payable (₹).
   - Admission Fee Assessed & Paid.
3. **Financial Lifetime Summary Cards**:
   - Total Lifetime Invoiced (₹)
   - Total Lifetime Paid (₹)
   - Total Outstanding Balance (₹)
4. **Chronological Fee Timeline**:
   - Table of all generated fee records across the student's admission cycles (Cycle 1, Cycle 2, etc.).
   - Displays Billing Period Start to End, Due Date, Base Fee, Discount, Late Fee, Total Fee, Paid Amount, Balance, Status Badge.
   - Direct Actions: "Collect Payment" button, "Download Reminder PDF", "Send WhatsApp Reminder".
5. **Payment History Ledger**:
   - Table of every payment recorded for this student.
   - Displays Payment Date, Receipt Number (`DPR-RC-2026-XXXX`), Payment Method, Transaction ID, Amount Paid, Recorded By.
   - Direct Actions: "Download Receipt PDF", "Share Receipt on WhatsApp".

---

## 6. End-to-End File Plan for Implementers

The following files are to be created or updated in Milestone 4:

### 6.1 Libraries & Utilities (`src/lib/*`)
1. **`src/lib/whatsapp.ts`**:
   - `sanitizeIndianPhone(phone: string): string`
   - `isValidIndianPhone(phone: string): boolean`
   - `buildWhatsAppUrl(phone: string, message: string): string`
   - `generateFeeReminderMessage(data: ...): string`
   - `generatePaymentReceiptMessage(data: ...): string`
   - `generateOverdueNoticeMessage(data: ...): string`

2. **`src/lib/csv-export.ts`**:
   - `generateRFC4180CSV<T>(data: T[], columns: CSVColumn<T>[]): string`
   - `downloadCSVFile(filename: string, csvContent: string): void`

3. **`src/lib/reports-service.ts`**:
   - `getMonthlyCollectionReport(prisma, filters)`
   - `getOverdueFeesReport(prisma, filters)`
   - `getClassWiseRevenueReport(prisma, filters)`
   - `getPaymentMethodDistributionReport(prisma, filters)`
   - `getStudentStatementReport(prisma, studentId, filters)`
   - `getAdmissionsReport(prisma, filters)`
   - `getDiscountReport(prisma, filters)`
   - `getDailyCollectionReport(prisma, filters)`

4. **`src/lib/dashboard-service.ts`**:
   - `getDashboardKPIMetrics(prisma, currentDate)`
   - `getMonthlyCollectionTrend(prisma, monthsCount)`
   - `getClassRevenueDistribution(prisma)`
   - `getFeeStatusDistribution(prisma)`
   - `getRecentActivities(prisma, limit)`
   - `getUrgentAlerts(prisma)`

### 6.2 API Routes (`src/app/api/*`)
1. **`src/app/api/dashboard/stats/route.ts`**:
   - `GET /api/dashboard/stats`: Returns aggregated KPIs, charts data, urgent alerts, and recent activities.
2. **`src/app/api/reports/route.ts`**:
   - `GET /api/reports`: Handles queries for the 8 report types with query parameter filtering.
3. **`src/app/api/classes/route.ts` & `[id]/route.ts`**:
   - Full CRUD for classes (Name, Default Monthly Fee, Default Admission Fee, Late Fee rules).
4. **`src/app/api/students/route.ts` & `[id]/route.ts`**:
   - Full CRUD for students (Code generator, DEFAULT vs CUSTOM fee mode, discounts, admission date).

### 6.3 UI Components (`src/components/*`)
1. **Dashboard (`src/components/dashboard/*`)**:
   - `KPICards.tsx`: High-density metric cards with delta indicators.
   - `MonthlyCollectionChart.tsx`: SSR-safe Recharts Bar/Area monthly trend.
   - `ClassDistributionChart.tsx`: SSR-safe Recharts Composed class distribution.
   - `FeeStatusDonutChart.tsx`: SSR-safe Recharts Donut status breakdown.
   - `AlertsBanner.tsx`: Defaulter and Due Today warning banner.
   - `RecentActivityFeed.tsx`: Live transaction feed.
   - `QuickActions.tsx`: Action buttons.
2. **WhatsApp (`src/components/whatsapp/*`)**:
   - `WhatsAppShareButton.tsx`: Button trigger.
   - `WhatsAppPreviewModal.tsx`: Interactive preview & customization modal.
3. **Layout & Shell (`src/components/layout/*`)**:
   - `Sidebar.tsx`: Desktop navigation with active links.
   - `Header.tsx`: Breadcrumbs, institute title, user badge.
   - `MobileNav.tsx`: Collapsible mobile drawer.

### 6.4 Dashboard Pages (`src/app/(dashboard)/*`)
1. **`src/app/(dashboard)/layout.tsx`**: Shell wrapper with Sidebar, Header, MobileNav, and print layout overrides.
2. **`src/app/(dashboard)/page.tsx`**: Main SaaS Dashboard.
3. **`src/app/(dashboard)/reports/page.tsx`**: Full Reports Engine with 8 tab/dimension selector, filter bar, CSV export button, Print button, and responsive table.
4. **`src/app/(dashboard)/classes/page.tsx`**: Classes CRUD list & modal.
5. **`src/app/(dashboard)/students/page.tsx`**: Students CRUD table & modal.
6. **`src/app/(dashboard)/students/[id]/page.tsx`**: Student 360° Profile View.

---

## 7. Verification Method & Quality Gate Criteria

### 7.1 Automated Test Invariants
1. `WhatsAppService.sanitizePhone` must convert `+91 98765-43210`, `09876543210`, and `9876543210` to `919876543210`.
2. `WhatsAppService.buildClickToChatUrl` must create a valid `https://wa.me/919876543210?text=...` URI with URL encoding.
3. `ReportsService.exportToCSV` must strictly adhere to RFC 4180 (escape double quotes with `""`, enclose commas and newlines).
4. All 8 report types must return exact rupee-level reconciled sums matching individual payment and fee records.
5. Running `npx tsx tests/run-all.ts` must maintain 100% pass rate (395/395 tests).
6. Next.js build (`npm run build` / `npx tsc --noEmit`) must complete with 0 errors.

---

## 8. Conclusion
The technical architecture for Milestone 4 is fully specified with exact mathematical models, database queries, interface contracts, React component trees, RFC 4180 CSV escaping, print CSS rules, and WhatsApp deep linking workflows. Implementers can proceed immediately to build and integrate Milestone 4 components.
