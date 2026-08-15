# DPR Fee Management System — Feature Specification & Technical Architecture
**Domain Focus**: Payment Processing, PDF Document Generation, WhatsApp Integration, SaaS Dashboard & Analytics, Reports Engine, Authentication & Edge Security.
**Authoritative Source**: `ORIGINAL_REQUEST.md` (Requirements R3, R4, R5, Acceptance Criteria).

---

## 1. Executive Summary & Domain Scope

This specification provides the exhaustive technical blueprint for the financial transaction processing, document rendering, analytical dashboard, reporting infrastructure, and security architecture of the **DPR Fee Management System** ("DPR Private Tuition").

The system is designed for **Next.js 15 App Router**, **React 19**, **Tailwind CSS v4**, **Prisma ORM 6**, **Neon PostgreSQL** (serverless pooled & direct connections), **`jose`** (Edge-compatible JWT), **`bcryptjs`**, **`@react-pdf/renderer`**, **`recharts`**, and **`zod`**.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Payment | Partial Payment Support | Allows paying a fraction of the outstanding fee (e.g. ₹200 against ₹500 fee), leaving outstanding balance | Fee Record ID, Amount (₹), Payment Method, Transaction ID (opt), Notes (opt), Date | Payment Record, Updated Fee Record (status: `PARTIALLY_PAID`, paid: ₹200, outstanding: ₹300), Audit Log, Receipt Document | Amount <= 0 or Amount > Outstanding triggers 422 validation error; nonexistent fee triggers 404 | R3, AC Payment System |
| 2 | Payment | Full Payment Support | Settles the entire remaining outstanding balance in a single transaction | Fee Record ID, Full Outstanding Amount, Payment Method, Transaction ID (opt), Notes | Payment Record, Updated Fee Record (status: `PAID`, paid: total, outstanding: ₹0), Audit Log, Receipt Document | Overpayment rejected with exact outstanding balance notice | R3, AC Payment System |
| 3 | Payment | Cumulative Multi-Payment | Handles sequential payments against one fee record (e.g. ₹200 + ₹200 + ₹100 = ₹500) accumulating paid amounts | Multiple sequential payment calls on same Fee Record ID | Each payment updates `paid_amount` += amount, decreases `outstanding_amount`, updates status from `PARTIALLY_PAID` to `PAID` upon reaching 0 | Reject any installment where `installment_amount > current_outstanding` | R3, AC Payment System |
| 4 | Payment | Atomic Transaction Execution | Guarantees ACID atomicity across Payment creation, Fee Record balance update, Receipt generation, and Audit logging | Prisma transaction client (`prisma.$transaction`) | Atomic commit of all 4 records or complete rollback | If any step fails (e.g. unique receipt collision or DB disconnect), whole transaction rolls back with 500 error | R3, R5 |
| 5 | Payment | Payment Methods Support | Captures payment method type across 5 standard channels: `CASH`, `UPI`, `BANK_TRANSFER`, `CARD`, `OTHER` | Method enum, optional Transaction/Reference ID | Persisted payment method enum and transaction ID | Invalid method enum rejected by Zod schema; non-cash methods validate string format | R3 |
| 6 | Payment | Receipt Code Generator | Generates unique formatted sequential receipt number: `DPR-RC-{YEAR}-{SEQ}` (e.g. `DPR-RC-2026-0001`) | Current calendar year, atomic sequence counter or max existing sequence | Formatted receipt string | Concurrent generation handled safely via database transaction or sequence lookup | R3, AC Payment System |
| 7 | Payment | Overpayment Guard | Strict validation check preventing payment amount greater than `fee_record.outstanding_amount` | Requested payment amount, current fee record outstanding | Approved if `amount <= outstanding` | HTTP 400/422 with message: "Payment amount (₹X) cannot exceed outstanding balance (₹Y)" | R3, AC Payment System |
| 8 | Documents | On-Demand Receipt PDF | Renders branded PDF receipt on-the-fly using `@react-pdf/renderer` without saving files to disk | Receipt Document UUID Token | `application/pdf` binary stream with DPR branding, student info, period, payment details, balance, signature | Invalid or expired token returns 404 / 410; rendering failure returns 500 | R3, AC PDF & Documents |
| 9 | Documents | On-Demand Fee Reminder PDF | Renders branded payment reminder letter/notice PDF on-the-fly with fee details, due date, institute bank/UPI details | Reminder Document UUID Token | `application/pdf` binary stream with DPR branding, student info, due amount, due date, payment instructions | Invalid or expired token returns 404 / 410 | R3, AC PDF & Documents |
| 10 | Documents | Secure UUID Document Tokens | Generates crypto-random UUID v4 access tokens stored in `documents` table, avoiding sequential ID enumeration | Document Type, Entity ID (Payment ID or Fee Record ID), Expiry Date (opt) | Secure public URL: `/api/documents/[uuid]` | Attempting to access non-UUID or non-existent token yields 404 | R3, AC PDF & Documents |
| 11 | Documents | Zero Disk Storage (Serverless) | All PDFs generated dynamically in memory via stream/buffer for full compatibility with Vercel serverless read-only filesystem | Document generation request | Direct stream response with `Content-Disposition: inline/attachment` | No filesystem write attempted, preventing Vercel EROFS errors | R3, R5 |
| 12 | Documents | Token Expiry Support | Optional expiration timestamp (`expires_at`) for temporary shared document links | Timestamp in `documents.expires_at` | Valid PDF if `now <= expires_at` | If `now > expires_at`, returns HTTP 410 Gone with descriptive notice | R3 |
| 13 | WhatsApp | Click-to-Chat Link Generation | Formats wa.me deep-link URLs (`https://wa.me/{number}?text={encoded_message}`) for one-click chat dispatch | Guardian/Student WhatsApp number, Pre-filled message text | URL string formatted for web/mobile WhatsApp launch | Invalid phone numbers sanitized; missing number disables button with tooltip | R4, AC WhatsApp Integration |
| 14 | WhatsApp | Pre-filled Receipt Message | Pre-composes template with student name, class, amount paid, remaining balance, receipt number, and PDF token link | Student Name, Class, Paid Amount, Balance, Receipt No, Document URL | URL-encoded message text for WhatsApp | Missing parameters fallback to default safe text strings | R4 |
| 15 | WhatsApp | Pre-filled Reminder Message | Pre-composes template with student name, class, amount due, due date, billing period, and reminder PDF token link | Student Name, Class, Due Amount, Due Date, Billing Period, Document URL | URL-encoded reminder message text for WhatsApp | Sanitizes dates to Indian human-readable format (e.g. "03 June 2026") | R4 |
| 16 | WhatsApp | Pre-filled Overdue Notice | Pre-composes urgent overdue notice for fees past due date with total arrears and immediate payment request | Student Name, Class, Overdue Amount, Days Overdue, Document URL | URL-encoded urgent alert message | Validates overdue status before template generation | R4 |
| 17 | WhatsApp | Manual Send Enforcement | Strictly enforces click-to-chat (`window.open` / anchor tag) so admin reviews before sending; NO auto-send bots | User click event on WhatsApp action button | Opens browser WhatsApp Web / App client | Prevents automated spam and external API gateway recurring costs | R4, AC WhatsApp Integration |
| 18 | Dashboard | KPI Cards Engine | Real-time calculation of 8 core institute metrics: Total Students, Active Students, Today's Collection, Monthly Collection, Pending Fees, Overdue Fees, Partial Payments Count, New Admissions | Current date, active academic/billing cycle | Array of 8 KPI data objects with value, currency format, trend indicator, and comparison badge | Empty database returns 0s without throwing null pointer exceptions | R4, AC UI & Navigation |
| 19 | Dashboard | Monthly Collection Trend Chart | Recharts Bar/Area visualization of fee collection aggregated month-by-month over the past 6-12 months | Aggregated monthly payment sums | JSON dataset: `[{ month: 'Jan 2026', total: 45000 }, ...]` for Recharts | Months with zero collections explicitly filled with 0 | R4 |
| 20 | Dashboard | Class Distribution Chart | Recharts Horizontal Bar / Pie chart showing student counts and revenue share across all active classes | Class enrollment and fee totals | JSON dataset: `[{ className: 'Class 8', students: 24, revenue: 19200 }, ...]` | Classes with 0 students display correctly without dividing by zero | R4 |
| 21 | Dashboard | Fee Status Donut Chart | Recharts Donut chart visualizing fee record breakdown: Paid, Partially Paid, Due, Overdue | Status counts from active fee records | JSON dataset: `[{ name: 'Paid', value: 45, color: '#10B981' }, ...]` | Handles 100% single status or 0 total records cleanly | R4 |
| 22 | Dashboard | Quick Actions Toolbar | Instant access buttons for primary administrative tasks: Add Student, Collect Fee, View Due Fees, View Overdue Fees, Generate Reminder, Search Receipt | User click events | Modal triggers, slide-over drawers, or direct router navigation | Disabled state for unpermitted roles or offline state | R4 |
| 23 | Dashboard | Real-Time Alerts Banner | Dynamic notification widgets alerting admin of critical items: Fees Due Today, Overdue Fees > 7 days, Inactive Student follow-ups | Queries for `due_date = today` and `due_date < today AND status = OVERDUE` | Alert counts, total risk amount, and one-click filtered table view links | Dismissible or sticky until resolved | R4 |
| 24 | Dashboard | Recent Activity Feed | Chronological audit stream displaying latest 10-20 system actions with user, action type, entity, and relative timestamp | `audit_logs` table query (ordered by `created_at DESC`, limit 15) | Activity list items with contextual icons, user badge, and relative time (e.g. "5 mins ago") | Empty activity log renders clean placeholder | R4 |
| 25 | Reports | Daily Collection Report | Filterable ledger of all payments received on a specific date or date range | `startDate`, `endDate`, optional `paymentMethod`, optional `classId` | Tabular collection records, total sum, method breakdown | Returns empty dataset if no payments on date | R4 |
| 26 | Reports | Monthly Collection Report | Aggregated financial collection report broken down by month and class | `year`, optional `month`, optional `classId` | Monthly totals, class sub-totals, payment method distribution | Handles leap years and fiscal year boundaries | R4 |
| 27 | Reports | Outstanding Fees Report | Comprehensive list of all pending receivables where `outstanding_amount > 0` | Optional `classId`, optional `status` (DUE/PARTIAL) | Student details, fee period, due date, billed, paid, outstanding balance, contact numbers | Returns empty if all fees are collected | R4 |
| 28 | Reports | Overdue Fees Report | Focused aging report of delinquent accounts where `due_date < today` and `outstanding > 0` | Aging buckets (<15 days, 15-30 days, 30+ days), `classId` | Overdue student list sorted by overdue days/amount with WhatsApp quick action | Empty if zero overdue accounts | R4 |
| 29 | Reports | Class-wise Revenue Report | Comprehensive class-level performance: Enrolled students, Total billed, Total collected, Outstanding, Collection Rate % | Academic term / date range, `classId` | Class revenue summary table with % realization KPIs | Classes with 0 billed fee show 0.0% collection rate without NaN | R4 |
| 30 | Reports | Student Fee Statement Ledger | Complete financial statement for an individual student: all fee cycles, payments made, receipts, discounts, current ledger balance | `studentId`, optional date range | Chronological ledger table with running balance, PDF download button | 404 if student ID invalid | R4 |
| 31 | Reports | Payment Method Distribution | Analytics report comparing revenue split across Cash, UPI, Bank Transfer, Card, Other | Date range, `classId` | Total volume, transaction count, percentage share per payment method | Method with 0 transactions displays 0 count / ₹0 | R4 |
| 32 | Reports | Admissions Report | Student enrollment report tracking new admissions, admission fees collected, and fee mode choices (DEFAULT vs CUSTOM) | Date range, `classId`, `feeMode` | Student admission records, fee mode distribution, total admission fee revenue | Empty if no admissions in period | R4 |
| 33 | Reports | CSV Export Engine | Streams raw or aggregated tabular report data formatted as standard CSV (RFC 4180) with headers and escaped commas | Report type, filter parameters | `text/csv` download stream with filename e.g. `dpr-collection-report-2026-08.csv` | Special characters and commas in student names sanitized | R4 |
| 34 | Reports | Branded PDF Export Engine | Generates clean, printable multi-page PDF reports with institute header, filter summary, tabular data, and page numbers | Report type, filter parameters | `application/pdf` binary stream with professional DPR header and summary footer | Large datasets paginated cleanly without text clipping | R4 |
| 35 | Reports | Browser Print Layout | CSS `@media print` optimized styling for instant browser printing without sidebar, topbar, or action buttons | Browser print trigger (`window.print()`) | Clean monochrome/grayscale printer-friendly document layout | Prevents header/footer duplication and table cut-offs across pages | R4 |
| 36 | Security | Single-Admin JWT Auth | Single administrator authentication system utilizing JWT signed and verified with Edge-compatible `jose` library | Admin Email, Password | JWT token with session claims (`sub`, `email`, `role`), signed with `HS256` | Invalid credentials return 401 Unauthorized with generic error message | R5, AC Security |
| 37 | Security | Bcrypt Password Hashing | Secure one-way salted password hashing using `bcryptjs` for admin credential storage and verification | Plaintext password (min 8 chars) | Bcrypt hash string (cost factor 10-12) | Plaintext passwords never stored or logged | R5 |
| 38 | Security | HttpOnly Secure Cookies | Stores JWT session in `httpOnly`, `secure`, `sameSite=lax` cookie to eliminate XSS token theft vulnerability | JWT string | `Set-Cookie` response header with `Max-Age=604800` (7 days), `Path=/`, `HttpOnly`, `SameSite=Lax` | Browser JavaScript cannot read `document.cookie` for auth token | R5 |
| 39 | Security | Edge Middleware Route Guard | Next.js Edge Middleware intercepting all dashboard (`/dashboard/*`) and protected API (`/api/*`) routes | Request cookies / headers | Allows request if JWT valid; redirects to `/login` if page request; returns JSON 401 if API request | Bypasses public assets and public document token endpoint `/api/documents/*` | R5, AC Security |
| 40 | Security | Zod Schema Request Validation | Comprehensive strict input validation for all API route handlers and React Hook Forms using Zod schemas | Request payload / query parameters | Validated type-safe data passed to controller/service | Returns HTTP 422 Unprocessable Entity with structured field error messages | R5 |
| 41 | Security | Dual PostgreSQL Connection Architecture | Supports Neon serverless connection pooling via `DATABASE_URL` (pooled) for runtime queries and `DIRECT_URL` for migrations | Connection strings in `.env` | Optimized Prisma client with `@prisma/adapter-neon` driver | Prevents serverless connection exhaustion and migration lock timeouts | R5 |
| 42 | Security | Audit Logging Engine | Comprehensive tamper-evident audit logging recording all critical mutations: logins, payments, fee generation, student edits, settings | `userId`, `action`, `entityType`, `entityId`, `details` JSON, `ipAddress`, `userAgent` | Persistent row in `audit_logs` table | Audit logging failure caught and logged without aborting core business transaction | R5 |

---

## 3. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Partial Payment | Payment amount = ₹0 or negative (e.g. -₹100) | Zod validator rejects immediately with "Payment amount must be greater than 0" (HTTP 422). Database transaction not initiated. |
| 2 | Overpayment Guard | Payment amount = ₹600 on fee record with outstanding = ₹500 | System rejects payment with HTTP 422 error: "Payment amount (₹600) exceeds outstanding balance of ₹500". Fee record balance remains unchanged. |
| 3 | Exact Balance Payment | Payment amount = ₹300 on fee record with outstanding = ₹300 | Transaction records ₹300 payment, sets `paid_amount` = `total_amount`, sets `outstanding_amount` = 0, updates status to `PAID`, generates receipt `DPR-RC-2026-XXXX`. |
| 4 | Consecutive Micro-Payments | 5 payments of ₹100 on a ₹500 fee record | Each payment atomically decreases outstanding by ₹100. First 4 payments maintain `PARTIALLY_PAID` status. 5th payment changes status to `PAID`. 5 separate receipt records and document tokens created. |
| 5 | Non-Cash Payment Details | Payment method = `UPI` with `transactionId = ""` (empty) | System allows optional transaction ID for UPI/Bank Transfer, but logs warning in audit metadata. If transaction ID provided (e.g. UTR 423984729384), it is saved and printed on receipt PDF. |
| 6 | Concurrent Payments on Same Fee | Two admin sessions submit payment of ₹400 simultaneously on a ₹500 fee | Prisma database transaction with atomic balance check (`WHERE id = fee_id AND outstanding_amount >= amount`) allows the first transaction to succeed and forces the second transaction to fail with overpayment rejection (`outstanding` is now ₹100, cannot accept ₹400). |
| 7 | Document Token Access | Public user opens `/api/documents/550e8400-e29b-41d4-a716-446655440000` | Edge middleware allows public access without admin login. Server validates UUID token, fetches document record, renders PDF in memory, and returns `application/pdf` stream. |
| 8 | Document Token Expiry | Public user opens expired token (`expires_at < now()`) | System returns HTTP 410 Gone with user-friendly HTML/JSON: "This document link has expired. Please contact DPR Private Tuition for an updated receipt/reminder link." |
| 9 | Invalid Document Token Format | User opens `/api/documents/123` or `/api/documents/receipt-1` | Zod UUID validator fails; returns HTTP 404 Not Found without hitting backend database query. |
| 10 | Nonexistent Document Token | Valid UUID format but token not found in `documents` table | Returns HTTP 404 Not Found with message: "Document not found or access revoked." |
| 11 | WhatsApp Phone Sanitization | Student WhatsApp number = `"+91 98765-43210"` or `"09876543210"` or `"9876543210"` | Sanitization helper strips all spaces, dashes, parentheses, removes leading 0 or +91, and normalizes to standard 12-digit Indian format `"919876543210"`. |
| 12 | Missing WhatsApp Number | Student has no WhatsApp number in profile | WhatsApp button renders in disabled state with tooltip: "No WhatsApp number registered for student/guardian". |
| 13 | WhatsApp Message Special Characters | Student name contains `&`, `%`, `#`, or emoji | Text encoded using `encodeURIComponent()` to ensure URL validity across all desktop and mobile browsers without truncating query parameters. |
| 14 | Zero Revenue Months in Charts | Institute closed in May (0 payments recorded) | Dashboard aggregation algorithm builds full 12-month calendar array and populates missing months with `{ month: 'May 2026', total: 0 }`, preventing broken or jagged Recharts axes. |
| 15 | Class with Zero Students in Pie Chart | "Class 12" created in settings but has 0 active students | Distribution query handles 0 count gracefully: either excludes empty classes from pie slices or displays 0% share without `NaN` or divide-by-zero crashes. |
| 16 | Fee Status Donut with All Paid | All students have paid fees (0 Due, 0 Overdue, 0 Partial) | Donut chart renders single solid 100% green circle labeled "100% Paid" without SVG coordinate glitches. |
| 17 | Report Multi-Filter Intersection | Filters set to: Date: 2026-08-01 to 2026-08-15, Class: "Class 8", Method: "UPI", Status: "PAID" | SQL/Prisma query applies `AND` conditions across all specified filters. If 0 records match, returns empty table with "No transactions match the selected filter criteria" message. |
| 18 | CSV Export with Commas in Names | Student name = `"Roy, Arindam"` or Address = `"Flat 4A, Park Street"` | CSV serializer encapsulates all text fields in standard RFC 4180 double quotes (`"Roy, Arindam"`) and escapes internal quotes (`""`) to prevent spreadsheet column misalignment. |
| 19 | Large PDF Report Pagination | Monthly report contains 300 student records | `@react-pdf/renderer` report template implements `wrap={true}` and dynamic page numbers (`Page X of Y`), repeating table headers on every page break without overlapping rows. |
| 20 | Browser Print on Mobile / Desktop | User presses `Ctrl+P` or clicks "Print" button | Media query `@media print` suppresses sidebar, top header navigation, filter inputs, pagination buttons, and forces white background with high-contrast text. |
| 21 | Unauthenticated Protected API Access | External script sends `GET /api/students` without auth cookie | Edge middleware catches missing/invalid cookie and immediately responds with HTTP 401 Unauthorized: `{ error: 'Unauthorized', code: 'AUTH_REQUIRED' }`. |
| 22 | Expired Admin Session | Admin token expired (older than 7 days) | Edge middleware `jwtVerify` throws `JWTExpired` error; deletes invalid cookie and redirects browser to `/login?redirect=/dashboard/payments` with notification "Session expired, please log in again". |
| 23 | SQL / Zod Injection in Filter Queries | Query parameter `classId = "'; DROP TABLE students; --"` | Prisma ORM uses parameterized queries; Zod schema validates `classId` as valid CUID/UUID string; request fails validation before touching database. |
| 24 | Concurrency Receipt Number Collision | Two payments processed in the exact same millisecond | Transaction uses atomic sequence increment or locked counter table for receipt sequencing, ensuring zero duplicate receipt numbers (`DPR-RC-2026-0012` and `DPR-RC-2026-0013`). |

---

## 4. Payment Processing Architecture & State Machine

### 4.1 Payment Lifecycle & Status Transitions

```
                    ┌────────────────────────┐
                    │  Fee Record Created    │
                    │  (status: UPCOMING)    │
                    └───────────┬────────────┘
                                │
                  Due Date Reached / Passed
                                │
                                ▼
                    ┌────────────────────────┐
                    │      status: DUE       │
                    │ (or OVERDUE if past)   │
                    └───────────┬────────────┘
                                │
                 Payment Received: Amount < Due
                                │
                                ▼
                    ┌────────────────────────┐
                    │ status: PARTIALLY_PAID │
                    │ (paid > 0, due > 0)    │
                    └───────────┬────────────┘
                                │
                 Payment Received: Amount == Due
                                │
                                ▼
                    ┌────────────────────────┐
                    │      status: PAID      │
                    │ (paid == total, due=0) │
                    └────────────────────────┘
```

### 4.2 Mathematical Formulas for Payment Balances

1. **Total Fee Amount ($F_{total}$)**:
   $$F_{total} = F_{base} + F_{admission} + F_{late} - D_{discount}$$
   *(Where $F_{base}$ is student custom fee or class default fee, $F_{admission}$ is one-time fee if 1st cycle, $F_{late}$ is calculated late fee, and $D_{discount}$ is fixed or percentage discount)*

2. **Current Outstanding Balance ($F_{outstanding}$)**:
   $$F_{outstanding} = F_{total} - \sum_{i=1}^{n} P_i$$
   *(Where $P_i$ represents all previous valid payments for this fee record)*

3. **Payment Acceptance Rule**:
   $$0 < P_{new} \le F_{outstanding}$$
   - If $P_{new} \le 0 \implies \text{REJECT (Invalid Amount)}$
   - If $P_{new} > F_{outstanding} \implies \text{REJECT (Overpayment)}$

4. **Post-Payment Balance Updates**:
   $$F_{paid\_new} = F_{paid\_old} + P_{new}$$
   $$F_{outstanding\_new} = F_{outstanding\_old} - P_{new}$$

5. **Post-Payment Status Determination**:
   $$\text{Status} = \begin{cases} 
   \text{PAID} & \text{if } F_{outstanding\_new} = 0 \\
   \text{PARTIALLY\_PAID} & \text{if } 0 < F_{outstanding\_new} < F_{total} \\
   \text{DUE} & \text{if } F_{paid\_new} = 0 \land \text{today} \le \text{due\_date} \\
   \text{OVERDUE} & \text{if } F_{paid\_new} = 0 \land \text{today} > \text{due\_date}
   \end{cases}$$

### 4.3 Atomic Payment Transaction Algorithm

```typescript
// Payment processing atomic transaction flow
await prisma.$transaction(async (tx) => {
  // 1. Fetch fee record with pessimistic lock or verified current balance
  const fee = await tx.feeRecord.findUnique({
    where: { id: feeRecordId },
    include: { student: { include: { class: true } } }
  });
  
  if (!fee) throw new NotFoundError("Fee record not found");
  if (paymentAmount <= 0) throw new ValidationError("Payment amount must be greater than zero");
  if (paymentAmount > fee.outstandingAmount) {
    throw new ValidationError(`Payment amount (₹${paymentAmount}) exceeds outstanding balance of ₹${fee.outstandingAmount}`);
  }

  // 2. Generate unique Receipt Number: DPR-RC-{YEAR}-{SEQ}
  const currentYear = new Date().getFullYear();
  const lastReceipt = await tx.payment.findFirst({
    where: { receiptNumber: { startsWith: `DPR-RC-${currentYear}-` } },
    orderBy: { receiptNumber: 'desc' }
  });
  
  let nextSeq = 1;
  if (lastReceipt) {
    const parts = lastReceipt.receiptNumber.split('-');
    const currentSeq = parseInt(parts[3] || '0', 10);
    nextSeq = currentSeq + 1;
  }
  const receiptNumber = `DPR-RC-${currentYear}-${String(nextSeq).padStart(4, '0')}`;

  // 3. Create Payment record
  const payment = await tx.payment.create({
    data: {
      feeRecordId: fee.id,
      studentId: fee.studentId,
      amount: paymentAmount,
      paymentMethod: method, // CASH, UPI, BANK_TRANSFER, CARD, OTHER
      transactionId: transactionId || null,
      receiptNumber: receiptNumber,
      paymentDate: paymentDate || new Date(),
      notes: notes || null,
      createdById: adminUserId
    }
  });

  // 4. Update Fee Record balances & status
  const newPaidAmount = fee.paidAmount + paymentAmount;
  const newOutstanding = fee.outstandingAmount - paymentAmount;
  const newStatus = newOutstanding === 0 ? 'PAID' : 'PARTIALLY_PAID';

  const updatedFee = await tx.feeRecord.update({
    where: { id: fee.id },
    data: {
      paidAmount: newPaidAmount,
      outstandingAmount: newOutstanding,
      status: newStatus
    }
  });

  // 5. Create secure document token for receipt PDF
  const documentToken = crypto.randomUUID();
  const document = await tx.document.create({
    data: {
      token: documentToken,
      documentType: 'RECEIPT',
      entityId: payment.id,
      metadata: {
        receiptNumber,
        studentId: fee.studentId,
        studentName: fee.student.name,
        amount: paymentAmount,
        billingPeriodStart: fee.billingPeriodStart,
        billingPeriodEnd: fee.billingPeriodEnd
      },
      expiresAt: null // Permanent or configurable expiry
    }
  });

  // 6. Record Audit Log
  await tx.auditLog.create({
    data: {
      userId: adminUserId,
      action: 'PAYMENT_RECORDED',
      entityType: 'PAYMENT',
      entityId: payment.id,
      details: {
        feeRecordId: fee.id,
        receiptNumber,
        amount: paymentAmount,
        method,
        newStatus,
        remainingOutstanding: newOutstanding
      },
      ipAddress,
      userAgent
    }
  });

  return { payment, fee: updatedFee, documentToken, receiptNumber };
});
```

---

## 5. PDF Document Generation & Visual Structure

### 5.1 Technology: `@react-pdf/renderer` Serverless Architecture

- **Execution Runtime**: Node.js runtime API Route Handlers (`/api/documents/[token]`, `/api/documents/download/[token]`).
- **Streaming Pipeline**: `renderToStream(<ReceiptDocument data={...} />)` piped directly into Next.js `Response` with `Content-Type: application/pdf`.
- **Memory Footprint**: Transient in-memory buffer, zero disk I/O, zero permanent storage on Vercel filesystem.

### 5.2 Receipt PDF Visual Blueprint

```
+-------------------------------------------------------------------------------+
|  [LOGO]  DPR PRIVATE TUITION                                                  |
|          Excellence in Academic Coaching & Guidance                           |
|          Station Road, Near City Center, West Bengal                          |
|          Phone: +91 98765 43210 | Email: info@dprtuition.com                  |
+-------------------------------------------------------------------------------+
|                             FEE PAYMENT RECEIPT                               |
+---------------------------------------+---------------------------------------+
| Receipt No  : DPR-RC-2026-0042        | Date of Issue : 15 Aug 2026           |
| Student Code: DPR-2026-008            | Payment Mode  : UPI                   |
| Student Name: Rahul Sharma            | Transaction ID: UTR49281093847       |
| Class       : Class 8                 | Payment Date  : 15 Aug 2026           |
| Guardian    : Mr. Alok Sharma         | Contact No    : +91 98765 11223       |
+---------------------------------------+---------------------------------------+
|                           FEE BREAKDOWN & PERIOD                              |
+-------------------------------------------------------------------------------+
| Billing Period : 03 Aug 2026 to 02 Sep 2026                                   |
| Description                             | Rate (INR) | Discount | Net Amount  |
| --------------------------------------- | ---------- | -------- | ----------- |
| Monthly Tuition Fee (Custom)            | ₹800.00    | ₹0.00    | ₹800.00     |
| Late Fee Charges                        | ₹0.00      | -        | ₹0.00       |
+-------------------------------------------------------------------------------+
| Total Billed Amount                     : ₹800.00                             |
| Previously Paid                         : ₹200.00                             |
| CURRENT AMOUNT PAID THIS RECEIPT        : ₹600.00  [PAID IN FULL]             |
| REMAINING OUTSTANDING BALANCE           : ₹0.00                               |
+-------------------------------------------------------------------------------+
| Amount in Words: Six Hundred Rupees Only                                      |
+-------------------------------------------------------------------------------+
| Terms & Notes:                                                                |
| 1. Fees once paid are non-refundable and non-transferable.                    |
| 2. This is a computer generated receipt, authorized signature not required.   |
|                                                     _________________________ |
|                                                       Authorized Signatory    |
|                                                       DPR Private Tuition     |
+-------------------------------------------------------------------------------+
```

### 5.3 Fee Reminder PDF Visual Blueprint

```
+-------------------------------------------------------------------------------+
|  [LOGO]  DPR PRIVATE TUITION                                                  |
|          Excellence in Academic Coaching & Guidance                           |
|          Station Road, Near City Center, West Bengal                          |
|          Phone: +91 98765 43210 | Email: info@dprtuition.com                  |
+-------------------------------------------------------------------------------+
|                           FEE PAYMENT NOTICE / REMINDER                       |
+---------------------------------------+---------------------------------------+
| Notice Ref  : DPR-REM-2026-0192       | Notice Date   : 15 Aug 2026           |
| Student Code: DPR-2026-014            | Due Date      : 18 Aug 2026           |
| Student Name: Priya Das               | Status        : PAYMENT DUE           |
| Class       : Class 7                 | Contact No    : +91 98321 44556       |
| Guardian    : Mrs. Anita Das          | WhatsApp      : +91 98321 44556       |
+---------------------------------------+---------------------------------------+
|                               FEE DUE DETAILS                                 |
+-------------------------------------------------------------------------------+
| Billing Period: 18 Jul 2026 to 17 Aug 2026                                    |
| Total Monthly Tuition Fee               : ₹700.00                             |
| Amount Paid So Far                      : ₹200.00 (Partial Payment)           |
| NET OUTSTANDING AMOUNT DUE              : ₹500.00                             |
+-------------------------------------------------------------------------------+
| Dear Guardian / Student,                                                      |
| This is a friendly reminder that the tuition fee for the above billing        |
| period is due on 18 Aug 2026. Kindly settle the outstanding balance of        |
| ₹500.00 at your earliest convenience to ensure uninterrupted classes.         |
|                                                                               |
| Payment Modes Accepted:                                                       |
| • UPI / QR Code: dprtuition@upi (Scan & pay at institute office)              |
| • Bank Transfer: DPR Tuition Account No: 91823749281, IFSC: SBIN0001234      |
| • Cash Payment at Institute Desk during working hours (4 PM - 8 PM).          |
|                                                     _________________________ |
|                                                       Accounts Office         |
|                                                       DPR Private Tuition     |
+-------------------------------------------------------------------------------+
```

---

## 6. WhatsApp Deep-Link Integration

### 6.1 Link Architecture & Manual Review Principle

- **Format**: `https://wa.me/{sanitized_phone}?text={encoded_message}`
- **Security & Ethics**: Click-to-chat deep links only. Admin reviews the message preview in the browser before pressing send. Zero external bot costs, zero WhatsApp Business API subscription hurdles.

### 6.2 Pre-filled Templates & URL Encoding

#### Template A: Payment Receipt Notification
```text
Dear Guardian/Student,
Thank you for your payment of ₹600 for Rahul Sharma (Class 8).
• Billing Period: 03 Aug 2026 to 02 Sep 2026
• Receipt No: DPR-RC-2026-0042
• Remaining Balance: ₹0.00 (Fully Paid)

Download your official PDF Receipt here:
https://dpr-tuition.vercel.app/api/documents/550e8400-e29b-41d4-a716-446655440000

Regards,
DPR Private Tuition
+91 98765 43210
```

#### Template B: Fee Due Reminder
```text
Dear Guardian/Student,
This is a gentle reminder that the tuition fee for Priya Das (Class 7) is due on 18 Aug 2026.
• Billing Period: 18 Jul 2026 to 17 Aug 2026
• Amount Due: ₹500.00

View your fee details & reminder letter:
https://dpr-tuition.vercel.app/api/documents/7b1c34a9-d3e2-45e0-9112-66a987110022

Please pay via UPI (dprtuition@upi) or at the institute office.
Regards,
DPR Private Tuition
```

#### Template C: Urgent Overdue Notice
```text
URGENT: Fee Overdue Notice
Dear Guardian,
Tuition fee for Rahul Sharma (Class 8) of ₹800.00 was due on 03 Aug 2026 and is now OVERDUE.

Please clear the pending arrears immediately:
https://dpr-tuition.vercel.app/api/documents/992a41f0-bc32-47d1-a201-998877665544

For queries, contact: +91 98765 43210
DPR Private Tuition
```

### 6.3 Phone Number Normalization Algorithm

```typescript
export function formatWhatsAppNumber(phone: string): string {
  if (!phone) return "";
  // Strip all non-digit characters
  let cleaned = phone.replace(/\D/g, "");
  
  // If 10 digits (standard Indian mobile), prepend country code 91
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  } 
  // If 11 digits starting with 0, replace leading 0 with 91
  else if (cleaned.length === 11 && cleaned.startsWith("0")) {
    cleaned = `91${cleaned.substring(1)}`;
  }
  // If already 12 digits starting with 91, keep as is
  return cleaned;
}

export function generateWhatsAppUrl(phone: string, message: string): string {
  const normalizedPhone = formatWhatsAppNumber(phone);
  if (!normalizedPhone) return "";
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
```

---

## 7. SaaS Dashboard Metrics & Analytics Architecture

### 7.1 Eight KPI Metric Engine

```typescript
export interface DashboardKPIs {
  totalStudents: number;        // All non-deleted student records
  activeStudents: number;       // status === 'ACTIVE'
  todayCollection: number;      // Sum(payment.amount) where paymentDate >= todayStart and < todayEnd
  monthlyCollection: number;    // Sum(payment.amount) where paymentDate >= monthStart and < monthEnd
  monthlyGrowthPercent: number; // ((currentMonth - prevMonth) / prevMonth) * 100
  pendingFees: number;          // Sum(feeRecord.outstandingAmount) where status in ('DUE', 'PARTIALLY_PAID')
  overdueFees: number;          // Sum(feeRecord.outstandingAmount) where status === 'OVERDUE'
  partialPaymentsCount: number; // Count(feeRecords) where status === 'PARTIALLY_PAID'
  newAdmissionsCount: number;   // Count(students) where admissionDate in currentMonth
}
```

### 7.2 Recharts Visual Analytics Specifications

1. **Monthly Revenue & Collection Trend** (`<BarChart>` / `<AreaChart>`):
   - **X-Axis**: Month string (e.g. `"Mar 2026"`, `"Apr 2026"`, `"May 2026"`).
   - **Y-Axis**: Currency amount (₹).
   - **Tooltips & Legends**: Custom currency formatter (`₹${value.toLocaleString('en-IN')}`).
   - **Data Schema**:
     ```typescript
     interface MonthlyTrendData {
       month: string;       // e.g. "Aug 2026"
       collected: number;   // Total ₹ received in payments
       billed: number;      // Total ₹ billed in fee records
     }
     ```

2. **Class-wise Enrollment & Collection Breakdown** (`<BarChart layout="horizontal">`):
   - **X-Axis**: Class Name (e.g. `"Class 5"`, `"Class 6"`, `"Class 7"`, `"Class 8"`).
   - **Bars**: 
     - Bar 1: Total Enrolled Students.
     - Bar 2: Total Revenue Collected (₹).
   - **Data Schema**:
     ```typescript
     interface ClassDistributionData {
       className: string;
       studentCount: number;
       totalCollected: number;
       totalOutstanding: number;
     }
     ```

3. **Fee Status Distribution Donut Chart** (`<PieChart>` with inner radius 60%, outer radius 80%):
   - **Segments**:
     - `PAID` (Emerald / `#10B981`)
     - `PARTIALLY_PAID` (Amber / `#F59E0B`)
     - `DUE` (Blue / `#3B82F6`)
     - `OVERDUE` (Rose / `#EF4444`)
   - **Data Schema**:
     ```typescript
     interface FeeStatusDonutData {
       name: string;
       value: number; // Count of fee records
       amount: number; // Aggregate ₹ in this status
       color: string;
     }
     ```

### 7.3 Quick Actions Toolbar & Alert Notifications

- **Quick Action Triggers**:
  1. `Collect Fee`: Opens instant slide-over drawer with student auto-complete, shows active fee record, calculates remaining balance, accepts payment method and issues receipt in 2 clicks.
  2. `Add Student`: Direct navigation to 3-step student onboarding wizard.
  3. `View Due Fees`: Navigates to Fee Ledger with pre-applied filter `status=DUE`.
  4. `View Overdue Fees`: Navigates to Fee Ledger with pre-applied filter `status=OVERDUE`.
  5. `Generate Cycle`: Triggers billing engine verification for upcoming dates.
- **Dynamic Alerts**:
  - Banner 1: **"⚡ X Fees Due Today (Total: ₹Y)"** — clickable to view list.
  - Banner 2: **"⚠️ Z Overdue Accounts requiring urgent attention (Total: ₹W)"** — with quick WhatsApp reminder dispatch button.

---

## 8. Reports Engine & Multi-Format Exports

### 8.1 Eight Specialized Report Dimensions

| Report Name | Primary Grouping | Available Filters | Aggregated Metrics |
|-------------|------------------|-------------------|--------------------|
| **1. Daily Collection** | Payment Date / Receipt No | Date Range, Class, Payment Method | Total Collected, Payment Count, Cash vs Digital Split |
| **2. Monthly Collection** | Calendar Month (Year-Month) | Year, Class, Fee Mode | Total Monthly Billed, Total Collected, Collection Efficiency % |
| **3. Outstanding Fees** | Student / Class | Class, Due Date Range, Outstanding Min/Max | Total Outstanding ₹, Total Impacted Students |
| **4. Overdue Fees (Aging)** | Aging Bucket (<15d, 15-30d, 30d+) | Class, Aging Days, Minimum Overdue Amount | Total Overdue ₹, Critical Accounts (>30 days), Arrears Rate |
| **5. Class-wise Revenue** | Class Name | Academic Year, Term, Class | Total Students, Potential Revenue, Realized Revenue, Realization % |
| **6. Student Fee Ledger** | Chronological Fee Cycles | Student ID, Academic Year | Total Billed, Total Paid, Total Discounts, Current Net Balance |
| **7. Payment Methods** | Payment Channel (UPI, Cash, etc.) | Date Range, Class | Volume (₹), Transaction Count, % of Total Receipts |
| **8. Admissions & Onboarding** | Admission Month / Class | Date Range, Class, Fee Mode | New Admissions Count, Admission Fee Total, Custom Fee Ratio % |

### 8.2 Multi-Filter Query Engine Schema

```typescript
export interface ReportFilterParams {
  reportType: 'DAILY' | 'MONTHLY' | 'OUTSTANDING' | 'OVERDUE' | 'CLASS_WISE' | 'STUDENT_LEDGER' | 'PAYMENT_METHOD' | 'ADMISSIONS';
  startDate?: string;       // ISO Date YYYY-MM-DD
  endDate?: string;         // ISO Date YYYY-MM-DD
  classId?: string;         // Class UUID or 'ALL'
  studentId?: string;       // Student UUID or 'ALL'
  status?: string;          // Fee Status or 'ALL'
  paymentMethod?: string;   // PaymentMethod Enum or 'ALL'
  feeMode?: string;         // 'DEFAULT' | 'CUSTOM' | 'ALL'
  sortBy?: string;          // Field name
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

### 8.3 Export Formats Specification

1. **CSV Export (`text/csv`)**:
   - RFC 4180 compliant.
   - Header row with clean title descriptors.
   - Escaped double-quotes for values with commas.
   - Example Header: `Receipt Number,Payment Date,Student Code,Student Name,Class,Payment Method,Transaction ID,Amount Paid (INR),Status`
2. **PDF Report Export (`application/pdf`)**:
   - Branded Institute Header with logo and contact info.
   - Filter metadata block (e.g. "Report Period: 01 Aug 2026 – 15 Aug 2026 | Class: All Classes").
   - Summary statistics cards at the top of the report.
   - Structured tabular ledger with alternating row colors.
   - Footer with generation timestamp, user badge, and dynamic page numbering (`Page X of Y`).
3. **Browser Print (`@media print`)**:
   - Print stylesheet stripping navigation, search bars, pagination controls, and dark theme backgrounds.
   - Table headers repeated on each printed page (`thead { display: table-header-group }`).

---

## 9. Authentication, Security Architecture & Edge Middleware

### 9.1 Single-Admin Authentication Flow

```
+---------------+                +-------------------+                +--------------------+
|  Admin User   |                |  Next.js Server   |                |  Neon PostgreSQL   |
| (Login Form)  |                |  (/api/auth/login)|                |    (users table)   |
+-------+-------+                +---------+---------+                +---------+----------+
        |                                  |                                    |
        | 1. POST { email, password }      |                                    |
        +--------------------------------->| 2. Find user by email              |
        |                                  +----------------------------------->|
        |                                  | 3. Return hashed user record       |
        |                                  |<-----------------------------------+
        |                                  |                                    |
        |                                  | 4. bcrypt.compare(pass, hash)      |
        |                                  | 5. Sign JWT with jose (HS256)      |
        |                                  | 6. Set-Cookie (httpOnly, secure)   |
        | 7. Return 200 OK + User Profile  | 7. Insert AuditLog(LOGIN_SUCCESS)  |
        |<---------------------------------+----------------------------------->|
```

### 9.2 JWT Session Configuration with `jose`

- **Algorithm**: `HS256` (HMAC SHA-256).
- **Secret**: `process.env.JWT_SECRET` (minimum 32 characters).
- **Payload Claims**:
  ```typescript
  interface SessionPayload {
    sub: string;         // Admin User ID
    email: string;       // Admin Email
    name: string;        // Admin Name
    role: string;        // 'ADMIN'
    iat: number;         // Issued at timestamp
    exp: number;         // Expiration timestamp (e.g. now + 7 days)
  }
  ```
- **Edge Middleware Compatibility**: Uses `jose` (`SignJWT`, `jwtVerify`) which runs natively on Vercel Edge Runtime without Node.js `crypto` polyfill issues.

### 9.3 Cookie Security Specification

| Cookie Attribute | Production Value | Development Value | Rationale |
|------------------|------------------|-------------------|-----------|
| **Name** | `dpr_session` | `dpr_session` | Standard session cookie name |
| **HttpOnly** | `true` | `true` | Prevents XSS scripts from reading the auth token |
| **Secure** | `true` | `false` | Requires HTTPS in production |
| **SameSite** | `Lax` | `Lax` | Protects against Cross-Site Request Forgery (CSRF) |
| **Path** | `/` | `/` | Accessible across all application routes |
| **Max-Age** | `604800` (7 days) | `604800` (7 days) | 7-day sliding session duration |

### 9.4 Next.js Edge Middleware Implementation Contract

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/documents',       // Public document viewing via UUID token
  '/_next',
  '/favicon.ico',
  '/images'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths without auth check
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('dpr_session')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    // Attach user payload to request headers for downstream API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.sub as string);
    requestHeaders.set('x-user-email', payload.email as string);

    return NextResponse.next({
      request: { headers: requestHeaders }
    });
  } catch (err) {
    // Token invalid or expired
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Session expired or invalid', code: 'TOKEN_INVALID' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));
    
    // Clear expired cookie
    response.cookies.delete('dpr_session');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
```

---

## 10. Database Entity Schemas (Prisma Models for Payments, Docs, Auth & Audit)

### 10.1 Prisma Schema Models

```prisma
// Users table (Admin Authentication)
model User {
  id           String     @id @default(cuid())
  email        String     @unique
  passwordHash String     @map("password_hash")
  name         String
  role         String     @default("ADMIN") // ADMIN
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  payments     Payment[]
  auditLogs    AuditLog[]

  @@map("users")
}

// Payment Methods Enum
enum PaymentMethod {
  CASH
  UPI
  BANK_TRANSFER
  CARD
  OTHER
}

// Payments Table
model Payment {
  id            String        @id @default(cuid())
  feeRecordId   String        @map("fee_record_id")
  studentId     String        @map("student_id")
  amount        Float
  paymentMethod PaymentMethod @default(CASH) @map("payment_method")
  transactionId String?       @map("transaction_id") // Optional UTR / Auth Code
  receiptNumber String        @unique @map("receipt_number") // DPR-RC-2026-0001
  paymentDate   DateTime      @default(now()) @map("payment_date")
  notes         String?
  createdById   String        @map("created_by_id")
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  feeRecord     FeeRecord     @relation(fields: [feeRecordId], references: [id], onDelete: Cascade)
  student       Student       @relation(fields: [studentId], references: [id], onDelete: Cascade)
  createdBy     User          @relation(fields: [createdById], references: [id])

  @@index([feeRecordId])
  @@index([studentId])
  @@index([paymentDate])
  @@index([receiptNumber])
  @@map("payments")
}

// Document Types Enum
enum DocumentType {
  RECEIPT
  REMINDER
  STATEMENT
  REPORT
}

// Documents Table (Secure UUID Tokens for PDFs)
model Document {
  id           String       @id @default(cuid())
  token        String       @unique @default(uuid()) // Unguessable UUID v4
  documentType DocumentType @map("document_type")
  entityId     String       @map("entity_id") // Payment ID or Fee Record ID or Student ID
  metadata     Json?        // Snapshot of document details for validation
  expiresAt    DateTime?    @map("expires_at") // Null for permanent receipt, timestamp for temporary reminder
  createdAt    DateTime     @default(now()) @map("created_at")

  @@index([token])
  @@index([entityId])
  @@map("documents")
}

// Institute Settings Table
model InstituteSetting {
  id                 String   @id @default(cuid())
  instituteName      String   @default("DPR Private Tuition") @map("institute_name")
  tagline            String?  @default("Excellence in Academic Coaching & Guidance")
  address            String?
  phone              String?
  email              String?
  upiId              String?  @map("upi_id")
  bankAccountDetails Json?    @map("bank_account_details")
  receiptPrefix      String   @default("DPR-RC") @map("receipt_prefix")
  studentIdPrefix    String   @default("DPR") @map("student_id_prefix")
  enableLateFees     Boolean  @default(false) @map("enable_late_fees")
  updatedAt          DateTime @updatedAt @map("updated_at")

  @@map("institute_settings")
}

// Audit Logs Table
model AuditLog {
  id         String   @id @default(cuid())
  userId     String?  @map("user_id")
  action     String   // LOGIN_SUCCESS, PAYMENT_RECORDED, STUDENT_CREATED, etc.
  entityType String   @map("entity_type") // USER, PAYMENT, STUDENT, FEE_RECORD, SETTING
  entityId   String?  @map("entity_id")
  details    Json?
  ipAddress  String?  @map("ip_address")
  userAgent  String?  @map("user_agent")
  createdAt  DateTime @default(now()) @map("created_at")

  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([action])
  @@index([entityType, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

---

## 11. API Endpoints & Zod Validation Schemas

### 11.1 Payment API Endpoints

1. **Record Payment**
   - **Route**: `POST /api/payments`
   - **Zod Schema**:
     ```typescript
     export const RecordPaymentSchema = z.object({
       feeRecordId: z.string().min(1, "Fee record ID is required"),
       amount: z.number().positive("Payment amount must be greater than zero"),
       paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER']),
       transactionId: z.string().trim().max(100).optional(),
       paymentDate: z.string().datetime().optional(),
       notes: z.string().trim().max(500).optional()
     });
     ```
   - **Success Response (201 Created)**:
     ```json
     {
       "success": true,
       "payment": {
         "id": "clx12345...",
         "receiptNumber": "DPR-RC-2026-0001",
         "amount": 500,
         "paymentMethod": "UPI",
         "transactionId": "UTR992817293",
         "paymentDate": "2026-08-15T05:30:00.000Z"
       },
       "feeRecord": {
         "id": "clxfee99...",
         "paidAmount": 500,
         "outstandingAmount": 0,
         "status": "PAID"
       },
       "documentToken": "550e8400-e29b-41d4-a716-446655440000",
       "documentUrl": "/api/documents/550e8400-e29b-41d4-a716-446655440000"
     }
     ```

2. **Fetch Payment History**
   - **Route**: `GET /api/payments?studentId={id}&feeRecordId={id}&startDate={}&endDate={}&page=1&limit=20`
   - **Success Response (200 OK)**: Paginated array of payment records with student, class, and fee record relations.

### 11.2 Document Token & PDF Streaming Endpoints

1. **Stream / View Document PDF (Public via UUID Token)**
   - **Route**: `GET /api/documents/[token]`
   - **Behavior**: Validates UUID token in `documents` table, checks expiry, fetches entity data, renders `@react-pdf/renderer` stream with header `Content-Type: application/pdf; charset=utf-8` and `Content-Disposition: inline; filename="DPR-Receipt-DPR-RC-2026-0001.pdf"`.
2. **Download Document PDF**
   - **Route**: `GET /api/documents/download/[token]`
   - **Behavior**: Same as stream, but with `Content-Disposition: attachment; filename="DPR-Receipt-DPR-RC-2026-0001.pdf"`.
3. **Generate Fee Reminder Token**
   - **Route**: `POST /api/documents/reminders`
   - **Payload**: `{ feeRecordId: string, expiryDays?: number }`
   - **Success Response (201 Created)**: Returns generated token and WhatsApp share URL.

### 11.3 Dashboard Metrics Endpoints

1. **Fetch Dashboard Summary**
   - **Route**: `GET /api/dashboard/stats`
   - **Success Response (200 OK)**: Returns KPI numbers, trend percentage, and active alerts.
2. **Fetch Monthly Revenue Trend**
   - **Route**: `GET /api/dashboard/charts/monthly-trend?months=12`
3. **Fetch Class Distribution**
   - **Route**: `GET /api/dashboard/charts/class-distribution`
4. **Fetch Fee Status Donut**
   - **Route**: `GET /api/dashboard/charts/fee-status`
5. **Fetch Recent Activity Feed**
   - **Route**: `GET /api/dashboard/activity?limit=15`

### 11.4 Reports Endpoints

1. **Generate Report Data**
   - **Route**: `POST /api/reports/query`
   - **Payload**: `ReportFilterParams`
   - **Success Response (200 OK)**: Returns rows, aggregates, and summary statistics.
2. **Export Report CSV**
   - **Route**: `POST /api/reports/export/csv`
   - **Payload**: `ReportFilterParams`
   - **Success Response (200 OK)**: `text/csv` stream with downloadable filename.
3. **Export Report PDF**
   - **Route**: `POST /api/reports/export/pdf`
   - **Payload**: `ReportFilterParams`
   - **Success Response (200 OK)**: `application/pdf` stream with branded table layout.

### 11.5 Authentication & Session Endpoints

1. **Admin Login**
   - **Route**: `POST /api/auth/login`
   - **Zod Schema**:
     ```typescript
     export const LoginSchema = z.object({
       email: z.string().email("Invalid email address"),
       password: z.string().min(6, "Password must be at least 6 characters")
     });
     ```
2. **Admin Logout**
   - **Route**: `POST /api/auth/logout`
   - **Behavior**: Clears `dpr_session` cookie and returns `{ success: true }`.
3. **Session Verification (Me)**
   - **Route**: `GET /api/auth/me`
   - **Behavior**: Returns current authenticated admin user object.

---

## 12. Verification & Integrity Checklist

- [x] Full and partial payment balance math and status state transitions strictly defined.
- [x] Overpayment rejection and atomic database transactions specified.
- [x] Receipt numbering scheme `DPR-RC-{YEAR}-{SEQ}` with collision protection designed.
- [x] `@react-pdf/renderer` in-memory streaming with zero filesystem disk storage planned.
- [x] UUID token generation and optional expiration mechanism in `documents` table detailed.
- [x] WhatsApp click-to-chat deep-link generation and phone normalization logic formulated.
- [x] 8 KPI cards, 3 Recharts visual models, quick actions, and alerts specified.
- [x] 8 specialized report dimensions with multi-filter and CSV/PDF/Print export architecture detailed.
- [x] Single-admin JWT auth with `jose`, `bcryptjs`, and Edge Middleware specified.
- [x] Prisma database models for `users`, `payments`, `documents`, `institute_settings`, `audit_logs` fully drafted.
