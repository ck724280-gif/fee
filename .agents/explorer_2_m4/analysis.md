# Milestone 4 Technical Analysis & API Contract Blueprint
**DPR Fee Management System — Frontend/Backend Integration, CRUD APIs & Interactive Modals**
*Author: Explorer 2 (Milestone 4)*  
*Target Working Directory: `d:\antigravity programme\tuition_manager`*  
*Timestamp: 2026-08-15T07:15:00Z*

---

## 1. Executive Summary & Scope Overview

Milestone 4 connects the core database schema (M1), admission-date billing cycle engine (M2), and atomic payment transaction/PDF streaming engine (M3) into a fully functional, production-ready SaaS tuition management system.

The primary objective of M4 is to blueprint and deliver:
1. **Full CRUD Backend API Routes**:
   - `/api/classes` & `/api/classes/[id]` (GET, POST, PUT, DELETE with safe deletion guards)
   - `/api/students` & `/api/students/[id]` (GET with multi-filter query, POST with auto DPR student code generator, PUT/PATCH, DELETE, and rich 360° Profile view)
   - `/api/fees` (GET list, POST generate cycles per student/batch, POST refresh overdue statuses, GET/PATCH `/api/fees/[id]`)
   - `/api/payments` (GET list with multi-filters, POST record payment with atomic transaction & overpayment prevention)
   - `/api/settings` (GET, PUT institute branding, receipt prefix, currency symbol, default grace days)
   - `/api/dashboard/stats` (Real-time database aggregated KPIs, monthly collection trend, class distribution, fee status donut, urgent alerts)
   - `/api/reports` (8 report dimensions, filterable by date/class/student/status/method, RFC 4180 CSV export)
2. **Interactive UI Modals & Action Components**:
   - **Fee Collection Modal**: 1-click full or partial payment, real-time client-side overpayment guard, payment method selection, transaction ID capture, post-payment PDF receipt download & WhatsApp click-to-chat deep link.
   - **Generate Billing Cycle Modal**: Batch mode (all active or by class) and single student mode, through-date picker, idempotency indicators, detailed run summary.
   - **Student Add/Edit Modal**: Class selection auto-populating default fee, "Class Default" vs "Custom Student Fee" radio toggle, live discount preview, admission/joining dates, emergency contacts.
   - **Class Add/Edit Modal**: Name, default monthly fee, admission fee, late fee configuration (fixed vs per-day with grace days).
   - **WhatsApp Click-to-Chat**: Utility (`src/lib/whatsapp.ts`) and UI action buttons with phone sanitization (`91XXXXXXXXXX`) and pre-filled message templates.
3. **UX & State Infrastructure**:
   - Standardized Zod validation across all frontend forms and API endpoints.
   - Consistent error responses, toast notifications, loading spinners, and responsive mobile-ready table views.

---

## 2. Database Schema & ORM Alignment

The Prisma schema (`prisma/schema.prisma`) defines all core models. Below is the relationship map and integrity constraints that govern M4 CRUD operations:

```
┌──────────────────┐         1:N         ┌──────────────────┐
│      Class       │ ──────────────────> │     Student      │
│  - id            │ (Restrict on delete)│  - id            │
│  - name (unique) │                     │  - studentCode   │
│  - defaultFee    │                     │  - feeMode       │
│  - lateFeeConfig │                     │  - customFee     │
└────────┬─────────┘                     └────────┬─────────┘
         │                                        │
         │ 1:N                                    │ 1:N
         │ (Restrict)                             │ (Restrict)
         ▼                                        ▼
┌──────────────────┐         1:N         ┌──────────────────┐
│    FeeRecord     │ ──────────────────> │     Payment      │
│  - id            │ (Restrict on delete)│  - id            │
│  - billingPeriod │                     │  - receiptNumber │
│  - base/net/total│                     │  - amount        │
│  - paid/outstand │                     │  - method        │
│  - status        │                     │  - documentToken │
└──────────────────┘                     └──────────────────┘
```

### Key Data Integrity Invariants:
1. **Student Code Uniqueness**: Formatted as `DPR-{YEAR}-{SEQ}` (e.g. `DPR-2026-001`), generated monotonically via `generateStudentCode()`.
2. **Fee Record Idempotency**: Compound unique constraint `@@unique([studentId, billingPeriodStart, billingPeriodEnd])` guarantees no duplicate cycles.
3. **Snapshot Immutability**: Historical `FeeRecord` entries store frozen snapshots (`baseAmount`, `discountAmount`, `admissionFeeAmount`, `lateFeeAmount`, `totalAmount`). Changing a class fee or student fee mode applies only to future generated cycles.
4. **Relational Restrict Rules**: 
   - A `Class` cannot be deleted if active students reference it.
   - A `Student` cannot be hard-deleted if fee records or payments exist. Status must transition to `LEFT` or `INACTIVE`.
   - A `FeeRecord` cannot be deleted if payments are recorded against it.

---

## 3. Backend API Route Specifications

### 3.1 Class Management APIs

#### `GET /api/classes`
- **Purpose**: List all classes with student count and revenue statistics.
- **Query Parameters**:
  - `status`: `'ACTIVE' | 'INACTIVE'` (optional, default: all)
  - `search`: string (optional, searches class name)
  - `includeStats`: `'true' | 'false'` (optional, default: `'true'`)
- **Controller Logic**:
  ```typescript
  const classes = await prisma.class.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    include: {
      _count: {
        select: {
          students: { where: { status: 'ACTIVE' } },
          feeRecords: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
  ```
- **Response Format (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "cls_8",
        "name": "Class 8",
        "defaultMonthlyFee": 800,
        "defaultAdmissionFee": 300,
        "lateFeeEnabled": false,
        "lateFeeType": "FIXED",
        "lateFeeAmount": 0,
        "graceDays": 0,
        "status": "ACTIVE",
        "activeStudentsCount": 6,
        "totalFeeRecordsCount": 36,
        "createdAt": "2026-05-01T00:00:00.000Z",
        "updatedAt": "2026-05-01T00:00:00.000Z"
      }
    ]
  }
  ```

#### `POST /api/classes`
- **Purpose**: Create a new class.
- **Request Body**:
  ```json
  {
    "name": "Class 9",
    "defaultMonthlyFee": 900,
    "defaultAdmissionFee": 350,
    "lateFeeEnabled": true,
    "lateFeeType": "FIXED",
    "lateFeeAmount": 50,
    "graceDays": 7,
    "status": "ACTIVE"
  }
  ```
- **Validation**: `createClassSchema` (Zod).
- **Controller Logic**:
  1. Validate body.
  2. Check duplicate name: if `prisma.class.findUnique({ where: { name } })` exists, return 409 Conflict.
  3. Create class and emit `AuditLog` (`CLASS_CREATED`).
- **Response Format (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Class created successfully",
    "data": { "id": "uuid", "name": "Class 9", ... }
  }
  ```

#### `GET /api/classes/[id]`
- **Purpose**: Fetch details of a specific class including active student roster overview.
- **Response Format (200 OK / 404 Not Found)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "cls_8",
      "name": "Class 8",
      "defaultMonthlyFee": 800,
      "defaultAdmissionFee": 300,
      "lateFeeEnabled": false,
      "students": [
        { "id": "st_1", "studentCode": "DPR-2026-001", "name": "Rahul Sharma", "feeMode": "DEFAULT", "status": "ACTIVE" }
      ]
    }
  }
  ```

#### `PUT /api/classes/[id]` (or `PATCH`)
- **Purpose**: Update class configuration.
- **Request Body**: Partial or full fields (`name`, `defaultMonthlyFee`, `defaultAdmissionFee`, `lateFeeEnabled`, `lateFeeType`, `lateFeeAmount`, `graceDays`, `status`).
- **Validation**: `updateClassSchema`.
- **Note**: Changing `defaultMonthlyFee` will NOT modify existing historical fee records (immutable). It automatically applies to future cycle generations for `feeMode=DEFAULT` students.
- **Response**: `{ success: true, message: "Class updated successfully", data: updatedClass }`.

#### `DELETE /api/classes/[id]`
- **Purpose**: Delete or archive a class.
- **Guard**:
  ```typescript
  const studentCount = await prisma.student.count({ where: { classId: id } });
  if (studentCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "Cannot delete class with assigned students. Please reassign students or archive the class (set status to INACTIVE).",
      },
      { status: 400 }
    );
  }
  await prisma.class.delete({ where: { id } });
  ```

---

### 3.2 Student Management & 360° Profile APIs

#### `GET /api/students`
- **Purpose**: List students with rich multi-field filters, sorting, and pagination.
- **Query Parameters**:
  - `classId`: string (optional)
  - `status`: `'ACTIVE' | 'INACTIVE' | 'LEFT' | 'COMPLETED'` (optional)
  - `feeMode`: `'DEFAULT' | 'CUSTOM'` (optional)
  - `search`: string (searches name, studentCode, mobile, fatherName, school)
  - `page`: number (default: 1)
  - `limit`: number (default: 20, max: 100)
  - `sortBy`: `'studentCode' | 'name' | 'admissionDate' | 'createdAt'` (default: `'studentCode'`)
  - `sortOrder`: `'asc' | 'desc'` (default: `'asc'`)
- **Response Format (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "students": [
        {
          "id": "st_001",
          "studentCode": "DPR-2026-001",
          "name": "Rahul Sharma",
          "fatherName": "Rajesh Sharma",
          "mobile": "9876543210",
          "whatsappNumber": "9876543210",
          "className": "Class 8",
          "classId": "cls_8",
          "classDefaultFee": 800,
          "feeMode": "DEFAULT",
          "customMonthlyFee": null,
          "actualMonthlyFee": 800,
          "discountType": "NONE",
          "discountValue": 0,
          "admissionDate": "2026-05-03T00:00:00.000Z",
          "status": "ACTIVE",
          "totalBilled": 1900,
          "totalPaid": 1900,
          "totalOutstanding": 0,
          "latestFeeStatus": "PAID"
        }
      ],
      "pagination": {
        "total": 1,
        "page": 1,
        "limit": 20,
        "totalPages": 1,
        "hasNextPage": false,
        "hasPrevPage": false
      },
      "summary": {
        "totalStudents": 1,
        "activeStudents": 1,
        "totalOutstanding": 0
      }
    }
  }
  ```

#### `POST /api/students`
- **Purpose**: Register a new student, auto-generate sequential `studentCode`, validate fee rules, and optionally auto-generate initial billing cycles.
- **Request Body**:
  ```json
  {
    "name": "Amit Sen",
    "fatherName": "Pradip Sen",
    "motherName": "Rina Sen",
    "guardianName": "Pradip Sen",
    "mobile": "9830012345",
    "whatsappNumber": "9830012345",
    "address": "45 Park Street, Kolkata",
    "dob": "2012-08-14",
    "gender": "MALE",
    "school": "St. Xavier's Collegiate School",
    "classId": "cls_8",
    "admissionDate": "2026-05-03",
    "joiningDate": "2026-05-03",
    "feeMode": "CUSTOM",
    "customMonthlyFee": 750,
    "admissionFee": 300,
    "discountType": "NONE",
    "discountValue": 0,
    "status": "ACTIVE",
    "autoGenerateFees": true
  }
  ```
- **Validation**:
  - `createStudentSchema`
  - If `feeMode === 'CUSTOM'`, `customMonthlyFee` must be a valid number >= 0.
  - Class exists in DB.
- **Controller Logic**:
  1. Generate unique sequential student code: `studentCode = await generateStudentCode(prisma, admissionYear)`.
  2. Create student inside database.
  3. If `autoGenerateFees` is true, invoke `generateStudentBillingRecords(prisma, student.id, { currentDate: new Date() })`.
  4. Write `AuditLog` (`STUDENT_CREATED`).
- **Response Format (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Student registered successfully",
    "data": {
      "student": { "id": "st_...", "studentCode": "DPR-2026-007", ... },
      "initialBilling": {
        "created": 4,
        "skipped": 0
      }
    }
  }
  ```

#### `GET /api/students/[id]` (360° Profile API)
- **Purpose**: Returns complete 360° student profile including personal details, fee mode comparison, full chronological fee records timeline, and payment receipt history.
- **Response Payload (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "student": {
        "id": "st_002",
        "studentCode": "DPR-2026-002",
        "name": "Priya Mukherjee",
        "fatherName": "Anupam Mukherjee",
        "motherName": "Sunita Mukherjee",
        "guardianName": "Anupam Mukherjee",
        "mobile": "9876543211",
        "whatsappNumber": "9876543211",
        "address": "Salt Lake Sector 1, Kolkata",
        "dob": "2013-02-15T00:00:00.000Z",
        "gender": "FEMALE",
        "school": "Bidhan School",
        "class": {
          "id": "cls_7",
          "name": "Class 7",
          "defaultMonthlyFee": 700,
          "defaultAdmissionFee": 250,
          "lateFeeEnabled": false
        },
        "admissionDate": "2026-05-10T00:00:00.000Z",
        "joiningDate": "2026-05-10T00:00:00.000Z",
        "feeMode": "CUSTOM",
        "customMonthlyFee": 650,
        "admissionFee": 250,
        "discountType": "NONE",
        "discountValue": 0,
        "status": "ACTIVE"
      },
      "feeConfiguration": {
        "classDefaultFee": 700,
        "studentFeeMode": "CUSTOM",
        "customMonthlyFee": 650,
        "actualMonthlyFee": 650,
        "discountType": "NONE",
        "discountValue": 0,
        "discountAmount": 0,
        "effectiveMonthlyFee": 650,
        "admissionFee": 250
      },
      "financialSummary": {
        "totalBilled": 2200,
        "totalPaid": 1550,
        "totalOutstanding": 650,
        "overdueAmount": 0,
        "totalCyclesCount": 3,
        "paidCyclesCount": 2,
        "partialCyclesCount": 0,
        "dueCyclesCount": 1,
        "overdueCyclesCount": 0
      },
      "feeTimeline": [
        {
          "id": "fr_01",
          "billingPeriodStart": "2026-05-10T00:00:00.000Z",
          "billingPeriodEnd": "2026-06-09T00:00:00.000Z",
          "dueDate": "2026-06-10T00:00:00.000Z",
          "baseAmount": 650,
          "admissionFeeAmount": 250,
          "discountAmount": 0,
          "lateFeeAmount": 0,
          "totalAmount": 900,
          "paidAmount": 900,
          "outstandingAmount": 0,
          "status": "PAID",
          "notes": "Cycle 1 (2026-05-10 to 2026-06-09)",
          "payments": [
            { "id": "p_01", "receiptNumber": "DPR-RC-2026-0002", "amount": 900, "paymentDate": "2026-05-12T00:00:00.000Z", "paymentMethod": "UPI" }
          ]
        },
        {
          "id": "fr_02",
          "billingPeriodStart": "2026-06-10T00:00:00.000Z",
          "billingPeriodEnd": "2026-07-09T00:00:00.000Z",
          "dueDate": "2026-07-10T00:00:00.000Z",
          "baseAmount": 650,
          "admissionFeeAmount": 0,
          "discountAmount": 0,
          "lateFeeAmount": 0,
          "totalAmount": 650,
          "paidAmount": 650,
          "outstandingAmount": 0,
          "status": "PAID"
        },
        {
          "id": "fr_03",
          "billingPeriodStart": "2026-07-10T00:00:00.000Z",
          "billingPeriodEnd": "2026-08-09T00:00:00.000Z",
          "dueDate": "2026-08-10T00:00:00.000Z",
          "baseAmount": 650,
          "admissionFeeAmount": 0,
          "discountAmount": 0,
          "lateFeeAmount": 0,
          "totalAmount": 650,
          "paidAmount": 0,
          "outstandingAmount": 650,
          "status": "DUE"
        }
      ],
      "paymentHistory": [
        {
          "id": "p_01",
          "receiptNumber": "DPR-RC-2026-0002",
          "amount": 900,
          "paymentMethod": "UPI",
          "transactionId": "UPI/2026/051289",
          "paymentDate": "2026-05-12T10:30:00.000Z",
          "notes": "Full admission + 1st month payment",
          "documentToken": "uuid-receipt-token-1",
          "feeRecordId": "fr_01"
        },
        {
          "id": "p_02",
          "receiptNumber": "DPR-RC-2026-0005",
          "amount": 650,
          "paymentMethod": "CASH",
          "paymentDate": "2026-06-15T11:00:00.000Z",
          "documentToken": "uuid-receipt-token-2",
          "feeRecordId": "fr_02"
        }
      ],
      "actions": {
        "latestDueFeeRecordId": "fr_03",
        "hasPendingBalance": true,
        "whatsappReminderUrl": "https://wa.me/919876543211?text=..."
      }
    }
  }
  ```

#### `PUT /api/students/[id]`
- **Purpose**: Update student details, class transfer, fee mode change, discount adjustments, or status changes.
- **Request Body**: `updateStudentSchema`.
- **Logic**:
  - Updates student record.
  - If class or feeMode changes, historical fee records remain unchanged; future cycle generations use the new configuration.
  - Emits `AuditLog` (`STUDENT_UPDATED`).

#### `DELETE /api/students/[id]`
- **Purpose**: Delete student record safely.
- **Safety Guard**:
  - If `prisma.payment.count({ where: { studentId: id } }) > 0`, reject with 400 Bad Request: `"Cannot delete student with recorded payment transactions. Update student status to LEFT or INACTIVE instead."`
  - If 0 payments exist, safely delete any uncollected draft fee records and documents, then remove the student.

---

### 3.3 Fee Billing & Status Management APIs

#### `GET /api/fees`
- **Purpose**: List fee records with filtering by class, student, status, date range, and search.
- **Query Parameters**:
  - `classId`, `studentId`, `status`, `startDate`, `endDate`, `search`, `page`, `limit`, `sortBy`, `sortOrder`.
- **Response Format (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "feeRecords": [
        {
          "id": "fr_123",
          "studentId": "st_001",
          "student": {
            "id": "st_001",
            "studentCode": "DPR-2026-001",
            "name": "Rahul Sharma",
            "mobile": "9876543210",
            "whatsappNumber": "9876543210",
            "feeMode": "DEFAULT",
            "status": "ACTIVE"
          },
          "class": {
            "id": "cls_8",
            "name": "Class 8",
            "defaultMonthlyFee": 800
          },
          "billingPeriodStart": "2026-05-03T00:00:00.000Z",
          "billingPeriodEnd": "2026-06-02T00:00:00.000Z",
          "dueDate": "2026-06-03T00:00:00.000Z",
          "baseAmount": 800,
          "admissionFeeAmount": 300,
          "discountAmount": 0,
          "lateFeeAmount": 0,
          "totalAmount": 1100,
          "paidAmount": 1100,
          "outstandingAmount": 0,
          "status": "PAID",
          "payments": [
            { "id": "p_1", "receiptNumber": "DPR-RC-2026-0001", "amount": 1100, "paymentMethod": "CASH", "paymentDate": "2026-05-05T00:00:00.000Z" }
          ]
        }
      ],
      "pagination": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 },
      "summary": {
        "totalBilled": 1100,
        "totalPaid": 1100,
        "totalOutstanding": 0,
        "totalLateFees": 0,
        "totalDiscounts": 0
      }
    }
  }
  ```

#### `POST /api/fees/generate`
- **Purpose**: Batch or single-student fee record generator.
- **Request Body**:
  ```json
  {
    "studentId": "st_001",
    "classId": "cls_8",
    "throughDate": "2026-08-31",
    "currentDate": "2026-08-15"
  }
  ```
- **Controller Logic**:
  - If `studentId` is provided: calls `generateStudentBillingRecords(prisma, studentId, { throughDate, currentDate })`.
  - If `studentId` is omitted: calls `generateBatchBillingRecords(prisma, { classId, throughDate, currentDate })`.
  - Idempotent: records existing for identical `(studentId, billingPeriodStart, billingPeriodEnd)` are skipped automatically.
- **Response**: `{ success: true, message: "Generated 3 billing record(s), skipped 2 existing", data: result }`.

#### `POST /api/fees/refresh-statuses`
- **Purpose**: Bulk-refresh fee record statuses against the current date & grace periods across the database (transitioning UPCOMING -> DUE -> OVERDUE).
- **Request Body**:
  ```json
  {
    "currentDate": "2026-08-15T00:00:00.000Z"
  }
  ```
- **Controller Logic**:
  ```typescript
  const now = startOfDay(currentDate ? new Date(currentDate) : new Date());
  
  // Find all unpaid or partially paid records with class info
  const candidates = await prisma.feeRecord.findMany({
    where: {
      status: { in: ['UPCOMING', 'DUE'] },
      outstandingAmount: { gt: 0 },
    },
    include: { class: true },
  });
  
  let updatedCount = 0;
  for (const fee of candidates) {
    const newStatus = deriveFeeStatus(
      {
        paidAmount: fee.paidAmount,
        totalAmount: fee.totalAmount,
        dueDate: fee.dueDate,
        status: fee.status,
      },
      now,
      fee.class.graceDays
    );
    
    if (newStatus !== fee.status) {
      await prisma.feeRecord.update({
        where: { id: fee.id },
        data: { status: newStatus },
      });
      updatedCount++;
    }
  }
  ```
- **Response**: `{ success: true, message: `Refreshed ${updatedCount} fee record statuses`, data: { evaluated: candidates.length, updated: updatedCount } }`.

#### `GET /api/fees/[id]` & `PATCH /api/fees/[id]`
- Existing endpoints verified. Supports status override (`WAIVED`, `CANCELLED`), note appending, and late fee manual adjustments.

---

### 3.4 Payment Transaction APIs

#### `POST /api/payments`
- **Purpose**: Atomically records full or partial payment against a fee record with overpayment guard, receipt number generation (`DPR-RC-YYYY-SEQ`), and UUID document token creation.
- **Request Body**:
  ```json
  {
    "feeRecordId": "fr_123",
    "amount": 500,
    "paymentMethod": "UPI",
    "transactionId": "UPI/20260815/9981",
    "paymentDate": "2026-08-15T12:00:00.000Z",
    "notes": "Partial fee installment via GPay",
    "recordedByUserId": "user_admin_1"
  }
  ```
- **Validation**:
  - `recordPaymentSchema`
  - Validates `amount > 0`
  - Rejects with 422 if `amount > feeRecord.outstandingAmount`.
- **Response Format (201 Created)**:
  ```json
  {
    "success": true,
    "payment": {
      "id": "p_99",
      "receiptNumber": "DPR-RC-2026-0042",
      "feeRecordId": "fr_123",
      "studentId": "st_001",
      "amount": 500,
      "paymentMethod": "UPI",
      "transactionId": "UPI/20260815/9981",
      "paymentDate": "2026-08-15T12:00:00.000Z"
    },
    "feeRecord": {
      "id": "fr_123",
      "paidAmount": 500,
      "outstandingAmount": 300,
      "status": "PARTIALLY_PAID"
    },
    "receiptNumber": "DPR-RC-2026-0042",
    "documentToken": "uuid-token-for-pdf",
    "documentUrl": "/api/documents/uuid-token-for-pdf"
  }
  ```

#### `GET /api/payments` & `GET /api/payments/[id]`
- Existing endpoints verified with search, method filters, date filters, student/class relations, and aggregations.

---

### 3.5 Institute Settings APIs

#### `GET /api/settings`
- **Purpose**: Fetch current institute branding and default configuration. Auto-creates singleton if missing.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "inst_01",
      "instituteName": "DPR Private Tuition",
      "tagline": "Excellence in Academic Coaching & Guidance",
      "address": "Station Road, Near City Center, West Bengal",
      "phone": "+91 98765 43210",
      "whatsapp": "+91 98765 43210",
      "email": "info@dprtuition.com",
      "logoUrl": null,
      "receiptPrefix": "DPR-RC",
      "currencySymbol": "₹",
      "defaultGraceDays": 0
    }
  }
  ```

#### `PUT /api/settings`
- **Purpose**: Update institute settings.
- **Request Body**: `updateSettingsSchema`.
- **Response**: `{ success: true, message: "Settings updated successfully", data: updatedSettings }`.

---

### 3.6 Dashboard Aggregation & Analytics APIs

#### `GET /api/dashboard/stats`
- **Purpose**: Returns real-time computed SaaS metrics for the dashboard header KPI cards, Recharts visualizations, and urgent alert action lists.
- **Query Parameters**:
  - `currentDate`: string (optional, defaults to now)
- **Controller Logic**:
  ```typescript
  const now = startOfDay(currentDate ? new Date(currentDate) : new Date());
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  // Aggregate KPIs
  const [
    totalStudents,
    activeStudents,
    todayPayments,
    monthlyPayments,
    pendingFeesAgg,
    overdueFeesAgg,
    partialCount,
    newAdmissions,
    recentPayments,
    urgentOverdue,
    classDist,
    statusCounts
  ] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { status: 'ACTIVE' } }),
    prisma.payment.aggregate({
      where: { paymentDate: { gte: now } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { paymentDate: { gte: currentMonthStart, lt: nextMonthStart } },
      _sum: { amount: true },
    }),
    prisma.feeRecord.aggregate({
      where: { status: { in: ['DUE', 'PARTIALLY_PAID'] } },
      _sum: { outstandingAmount: true },
    }),
    prisma.feeRecord.aggregate({
      where: { status: 'OVERDUE' },
      _sum: { outstandingAmount: true },
    }),
    prisma.feeRecord.count({ where: { status: 'PARTIALLY_PAID' } }),
    prisma.student.count({
      where: { admissionDate: { gte: currentMonthStart, lt: nextMonthStart } },
    }),
    prisma.payment.findMany({
      take: 6,
      orderBy: { paymentDate: 'desc' },
      include: {
        student: { select: { id: true, name: true, studentCode: true } },
        feeRecord: { select: { id: true, billingPeriodStart: true, billingPeriodEnd: true } },
      },
    }),
    prisma.feeRecord.findMany({
      where: { status: 'OVERDUE' },
      take: 5,
      orderBy: { dueDate: 'asc' },
      include: {
        student: { select: { id: true, name: true, studentCode: true, mobile: true, whatsappNumber: true } },
        class: { select: { name: true } },
      },
    }),
    prisma.class.findMany({
      include: {
        _count: { select: { students: { where: { status: 'ACTIVE' } } } },
      },
    }),
    prisma.feeRecord.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
  ]);
  ```
- **Response Format (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "kpis": {
        "totalStudents": 6,
        "activeStudents": 6,
        "todayCollection": 1900,
        "monthlyCollection": 4550,
        "pendingFees": 1450,
        "overdueFees": 800,
        "partialCount": 1,
        "newAdmissions": 2
      },
      "charts": {
        "feeStatusDistribution": [
          { "name": "Paid", "value": 18, "color": "#10b981" },
          { "name": "Partial", "value": 1, "color": "#f59e0b" },
          { "name": "Due", "value": 3, "color": "#3b82f6" },
          { "name": "Overdue", "value": 2, "color": "#ef4444" },
          { "name": "Upcoming", "value": 0, "color": "#8b5cf6" }
        ],
        "monthlyCollectionTrend": [
          { "month": "Jan 2026", "collection": 0 },
          { "month": "May 2026", "collection": 3450 },
          { "month": "Jun 2026", "collection": 1100 }
        ],
        "classDistribution": [
          { "className": "Class 5", "studentCount": 1, "monthlyFee": 500 },
          { "className": "Class 8", "studentCount": 2, "monthlyFee": 800 }
        ]
      },
      "urgentOverdueList": [
        {
          "id": "fr_99",
          "studentName": "Vikram Das",
          "studentCode": "DPR-2026-004",
          "className": "Class 6",
          "outstandingAmount": 600,
          "dueDate": "2026-07-20T00:00:00.000Z",
          "mobile": "9876543213",
          "whatsappUrl": "https://wa.me/919876543213?text=..."
        }
      ],
      "recentPayments": [
        {
          "id": "p_01",
          "receiptNumber": "DPR-RC-2026-0001",
          "studentName": "Rahul Sharma",
          "amount": 1100,
          "paymentMethod": "CASH",
          "paymentDate": "2026-05-05T00:00:00.000Z"
        }
      ]
    }
  }
  ```

---

### 3.7 Multi-Dimension Reports API

#### `GET /api/reports`
- **Supported Report Types**:
  1. `DAILY_COLLECTION`: Date-wise collection ledger.
  2. `MONTHLY_COLLECTION`: Month-by-month revenue trend with payment method distribution.
  3. `OUTSTANDING_FEES`: All unpaid/partially paid fee records with student contact details and aging.
  4. `OVERDUE_FEES`: Delinquent accounts past due date with late fee breakdown.
  5. `CLASS_WISE_REVENUE`: Aggregate revenue, billed amount, collected amount, and collection efficiency percentage per class.
  6. `STUDENT_STATEMENT`: Chronological ledger for an individual student (debit: billed, credit: payments, balance).
  7. `PAYMENT_METHOD_DISTRIBUTION`: Breakdown by Cash, UPI, Bank Transfer, Card.
  8. `ADMISSIONS_REPORT`: New student enrollments, admission fees collected, and fee mode split.
- **Export Capabilities**:
  - Standard JSON response for React UI table & charting.
  - Query parameter `format=csv`: Returns `text/csv` with `Content-Disposition: attachment; filename="report-..."` adhering to RFC 4180 (escaping quotes and commas).

---

## 4. Zod Validation Schemas Architecture

### 4.1 Class Validation (`src/lib/validations/class.ts`)
```typescript
import { z } from 'zod';
import { ClassStatus, LateFeeType } from '@prisma/client';

export const createClassSchema = z.object({
  name: z.string().trim().min(1, 'Class name is required').max(100, 'Name cannot exceed 100 characters'),
  defaultMonthlyFee: z.coerce.number().min(0, 'Monthly fee must be non-negative'),
  defaultAdmissionFee: z.coerce.number().min(0, 'Admission fee must be non-negative').default(0),
  lateFeeEnabled: z.boolean().default(false),
  lateFeeType: z.nativeEnum(LateFeeType).default(LateFeeType.FIXED),
  lateFeeAmount: z.coerce.number().min(0, 'Late fee amount must be non-negative').default(0),
  graceDays: z.coerce.number().int().min(0, 'Grace days must be non-negative integer').default(0),
  status: z.nativeEnum(ClassStatus).default(ClassStatus.ACTIVE),
});

export const updateClassSchema = createClassSchema.partial();
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
```

### 4.2 Student Validation (`src/lib/validations/student.ts`)
```typescript
import { z } from 'zod';
import { FeeMode, DiscountType, StudentStatus, Gender } from '@prisma/client';

export const createStudentSchema = z.object({
  name: z.string().trim().min(1, 'Student name is required').max(100),
  fatherName: z.string().trim().min(1, "Father's name is required").max(100),
  motherName: z.string().trim().max(100).optional().nullable(),
  guardianName: z.string().trim().max(100).optional().nullable(),
  mobile: z.string().trim().min(10, 'Valid phone number required').max(15),
  whatsappNumber: z.string().trim().max(15).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  dob: z.union([z.string(), z.date()]).optional().nullable(),
  gender: z.nativeEnum(Gender).default(Gender.MALE),
  school: z.string().trim().max(150).optional().nullable(),
  classId: z.string().min(1, 'Class selection is required'),
  admissionDate: z.union([z.string(), z.date()]),
  joiningDate: z.union([z.string(), z.date()]).optional().nullable(),
  feeMode: z.nativeEnum(FeeMode).default(FeeMode.DEFAULT),
  customMonthlyFee: z.coerce.number().min(0, 'Custom fee must be non-negative').optional().nullable(),
  admissionFee: z.coerce.number().min(0).default(0),
  discountType: z.nativeEnum(DiscountType).default(DiscountType.NONE),
  discountValue: z.coerce.number().min(0).default(0),
  status: z.nativeEnum(StudentStatus).default(StudentStatus.ACTIVE),
  autoGenerateFees: z.boolean().default(true),
}).refine((data) => {
  if (data.feeMode === FeeMode.CUSTOM) {
    return data.customMonthlyFee !== null && data.customMonthlyFee !== undefined && data.customMonthlyFee >= 0;
  }
  return true;
}, {
  message: 'Custom Monthly Fee is required when Fee Mode is set to CUSTOM',
  path: ['customMonthlyFee'],
}).refine((data) => {
  if (data.discountType === DiscountType.PERCENTAGE) {
    return data.discountValue <= 100;
  }
  return true;
}, {
  message: 'Percentage discount cannot exceed 100%',
  path: ['discountValue'],
});

export const updateStudentSchema = createStudentSchema.partial();
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
```

### 4.3 Settings Validation (`src/lib/validations/settings.ts`)
```typescript
import { z } from 'zod';

export const updateSettingsSchema = z.object({
  instituteName: z.string().trim().min(1, 'Institute name is required').max(150),
  tagline: z.string().trim().max(200).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  whatsapp: z.string().trim().max(50).optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable(),
  logoUrl: z.string().url('Invalid URL').optional().nullable(),
  receiptPrefix: z.string().trim().min(1).max(20).default('DPR-RC'),
  currencySymbol: z.string().trim().min(1).max(5).default('₹'),
  defaultGraceDays: z.coerce.number().int().min(0).default(0),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
```

---

## 5. Interactive UI Modals & Action Components Blueprint

### 5.1 Fee Collection Modal (`FeeCollectionModal.tsx`)

#### Trigger Locations:
- **Dashboard**: Quick action button "Collect Fee" (opens student search picker).
- **Fees Table**: Action column button "Collect" on any unpaid or partially paid row.
- **Student Profile**: Primary action button "Collect Fee" under Pending Balance.
- **Overdue Alert List**: "Collect" button next to delinquent student.

#### Visual Layout & Component State:
```
┌────────────────────────────────────────────────────────┐
│  Record Fee Payment                       [ ✕ Close ]  │
├────────────────────────────────────────────────────────┤
│  Student: Rahul Sharma (DPR-2026-001)                 │
│  Class: Class 8  •  Cycle: 03 May 2026 to 02 Jun 2026 │
│                                                        │
│  ┌───────────────────────┬──────────────────────────┐  │
│  │ Total Billed:  ₹1,100 │ Outstanding:      ₹500   │  │
│  │ Already Paid:    ₹600 │ (Highlighted in Amber)   │  │
│  └───────────────────────┴──────────────────────────┘  │
│                                                        │
│  Payment Amount (₹)*                                   │
│  [  500.00                                           ] │
│  Quick Select: [ Full Amount (₹500) ] [ 50% (₹250) ]   │
│  ⚠️ (Real-time guard: rejects amount > ₹500)           │
│                                                        │
│  Payment Method*                                       │
│  (•) Cash   ( ) UPI   ( ) Bank Transfer   ( ) Card     │
│                                                        │
│  Transaction / Reference ID (UPI/Bank/Card)            │
│  [ UPI/20260815/991823                               ] │
│                                                        │
│  Payment Date*             Notes / Remarks             │
│  [ 2026-08-15            ] [ Paid via GPay           ] │
├────────────────────────────────────────────────────────┤
│  [ Cancel ]                     [ 💳 Record Payment ]  │
└────────────────────────────────────────────────────────┘
```

#### Success State & Immediate Post-Payment Actions:
Upon successful submission (201 Created):
```
┌────────────────────────────────────────────────────────┐
│  ✔ Payment Recorded Successfully!                      │
├────────────────────────────────────────────────────────┤
│  Receipt Number: DPR-RC-2026-0042                      │
│  Amount Paid: ₹500.00  •  Remaining Balance: ₹0.00     │
│                                                        │
│  Immediate Actions:                                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ [ 📄 Download PDF Receipt ]                      │  │
│  │ [ 💬 Send WhatsApp Receipt to Parent ]           │  │
│  │ [ 🖨️ Print Receipt ]                             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  [ Done / Close ]                                      │
└────────────────────────────────────────────────────────┘
```

---

### 5.2 Generate Billing Cycle Modal (`GenerateBillingModal.tsx`)

#### Trigger Locations:
- **Fees Page Header**: "⚡ Generate Billing Cycles".
- **Dashboard**: Quick action button "Generate Fees".
- **Student Profile**: "Generate Next Cycle".

#### Modes & Flow:
1. **Scope Selection**:
   - `ALL_ACTIVE`: Processes all active students in the institute.
   - `BY_CLASS`: Selects a specific class (e.g. Class 8 only).
   - `SINGLE_STUDENT`: Selects an individual student.
2. **Through Date Picker**: Target evaluation date (defaults to end of current month or current date).
3. **Idempotency Guarantee Notice**: Clarifies that the billing engine computes cycles based on each student's admission date anchor, and existing cycles are safely skipped without creating duplicates.
4. **Execution Summary Screen**: Displays total students evaluated, new records created, existing records skipped, and any exceptions.

---

### 5.3 Student Creation & Edit Modal (`StudentFormModal.tsx`)

#### Interactive Fee Mode & Discount UX:
- Selecting a `Class` (e.g. "Class 8") dynamically updates the helper display:
  - Class Default Monthly Fee: ₹800
  - Default Admission Fee: ₹300
- **Fee Mode Toggle**:
  - `Class Default Fee (₹800/mo)`: Disabled custom input, uses class rate.
  - `Custom Student Fee`: Unlocks `Custom Monthly Fee` input (e.g. ₹650/mo).
- **Live Calculation Preview Box**:
  ```
  ┌────────────────────────────────────────────────────────────┐
  │  Fee Configuration Summary:                                │
  │  Base Monthly: ₹650  •  Discount: ₹50 (Fixed) ➔ Net: ₹600 │
  │  First Cycle Admission Fee: ₹300                           │
  │  Total 1st Month Payable: ₹900                             │
  └────────────────────────────────────────────────────────────┘
  ```

---

### 5.4 WhatsApp Click-to-Chat Service (`src/lib/whatsapp.ts`)

```typescript
/**
 * WhatsApp Click-to-Chat Deep Linking Helper
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }
  return cleaned;
}

export function buildClickToChatUrl(phone: string, text: string): string {
  const cleanPhone = sanitizePhone(phone);
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}

export function generateReceiptMessage(data: {
  studentName: string;
  className: string;
  paidAmount: number;
  receiptNumber: string;
  outstandingAmount: number;
  documentUrl: string;
}): string {
  return (
    `Dear Parent/Student,\n\n` +
    `We have received a payment of ₹${data.paidAmount} for ${data.studentName} (${data.className}).\n` +
    `Receipt No: ${data.receiptNumber}\n` +
    `Remaining Balance: ₹${data.outstandingAmount}\n\n` +
    `Download your official receipt here:\n${data.documentUrl}\n\n` +
    `Thank you,\nDPR Private Tuition`
  );
}

export function generateReminderMessage(data: {
  studentName: string;
  className: string;
  dueAmount: number;
  dueDateStr: string;
  documentUrl: string;
}): string {
  return (
    `Dear Parent/Student,\n\n` +
    `This is a gentle fee reminder for ${data.studentName} (${data.className}).\n` +
    `Amount Due: ₹${data.dueAmount}\n` +
    `Due Date: ${data.dueDateStr}\n\n` +
    `View your fee notice here:\n${data.documentUrl}\n\n` +
    `Thank you,\nDPR Private Tuition`
  );
}
```

---

## 6. Frontend State Management & Responsive Layout

### 6.1 Toast Notifications & Error Handling
- Use lightweight toast notifications (e.g. `sonner` or custom animated React toast context) for all asynchronous mutations (payment created, student registered, billing cycle generated, settings saved).
- API client wrapper (`src/lib/api-client.ts`) handles network errors, parses Zod validation error arrays, and surfaces human-readable error messages.

### 6.2 Responsive Navigation & Layout Topology
- **Desktop (>= 1024px)**: Fixed left sidebar (`w-64`), top header with institute name and quick actions, spacious main content container.
- **Tablet / Mobile (< 1024px)**: Collapsible hamburger drawer, sticky mobile header, bottom quick-action bar for rapid fee collection on mobile devices.
- **Tables**: All data tables wrapped in `<div className="overflow-x-auto w-full">` with sticky column headers and touch targets >= 44px for action buttons.

---

## 7. Edge Cases & Invariant Safeguards

| Edge Case | Risk / Challenge | Safeguard Strategy |
|---|---|---|
| **Class Default Fee Hike** | Could accidentally alter past historical fee records. | Fee records store immutable snapshots. `prisma.class.update` updates only the class record; existing fee records are untouched. Future generations fetch the updated default for `DEFAULT` fee mode students only. |
| **Custom Student Protection** | Changing class fee might inadvertently affect custom-rate students. | Billing engine inspects `feeMode === 'CUSTOM'` and uses `customMonthlyFee`, completely ignoring class fee changes. |
| **Overpayment Attempt** | User enters ₹1,000 on a ₹400 outstanding balance. | **Two-level guard**: Real-time client form validation + backend `recordPayment` validation check rejecting with 422 Unprocessable Entity. |
| **Accidental Destructive Delete** | Deleting a class or student with active records breaks relational integrity. | Safe deletion check: `prisma.student.count({ where: { classId } })` and `prisma.payment.count({ where: { studentId } })` block delete with actionable 400 Bad Request error. |
| **Phone Number Formatting** | WhatsApp requires international format (`91XXXXXXXXXX`) without punctuation. | `sanitizePhone()` utility automatically strips dashes, spaces, parentheses, leading zeros, and prefixes `91` for 10-digit Indian numbers. |
| **Zero/Empty State Handling** | First-time setup with 0 students or 0 payments. | Recharts datasets and KPI metrics return `0` / empty arrays cleanly without divide-by-zero errors. |

---

## 8. Implementation Roadmap for Milestone 4 Workers

1. **Step 1: Validation Schemas & WhatsApp Helper**:
   - Create `src/lib/validations/class.ts`, `src/lib/validations/student.ts`, `src/lib/validations/settings.ts`, `src/lib/validations/report.ts`.
   - Create `src/lib/whatsapp.ts`.
2. **Step 2: API Route Implementations**:
   - Implement `src/app/api/classes/route.ts` & `src/app/api/classes/[id]/route.ts`.
   - Implement `src/app/api/students/route.ts` & `src/app/api/students/[id]/route.ts`.
   - Implement `src/app/api/fees/refresh-statuses/route.ts`.
   - Implement `src/app/api/settings/route.ts`.
   - Implement `src/app/api/dashboard/stats/route.ts`.
   - Implement `src/app/api/reports/route.ts`.
3. **Step 3: UI Modals & Action Components**:
   - Build `FeeCollectionModal.tsx`, `GenerateBillingModal.tsx`, `StudentFormModal.tsx`, `ClassFormModal.tsx`.
   - Build `WhatsAppButton.tsx`.
4. **Step 4: Dashboard, Students, Classes, Fees, Payments, Reports Pages**:
   - Wire all pages to real API endpoints with loading skeletons, filter controls, pagination, and toast feedback.
5. **Step 5: Full Verification & E2E Validation**:
   - Run typecheck, lint, seed, and master 4-tier test suite.
