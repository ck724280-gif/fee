# 🎓 Education Manager — Multi-Tenant SaaS Platform
### Complete User Manual, Technical Architecture & System Guide
*(मास्टर सुपर एडमिन और संस्थान एडमिन के लिए संपूर्ण यूजर गाइड एवं मैन्युअल)*

---

## 🌟 1. System Overview (प्लेटफ़ॉर्म परिचय)

**Education Manager** is an enterprise-grade, multi-tenant Cloud SaaS platform engineered for **Coaching Institutes, Private Tuition Centers, Schools, and Academies**. It automates the entire academic and financial lifecycle—from student enrollment and admission-day anchored fee billing to dynamic UPI QR collections, 1-click WhatsApp reminders, institutional expense accounting, and multi-tenant SaaS membership lifecycle management.

### 🌐 Live Platform Access
- **Institute Portal (संस्थान लॉगिन)**: [`https://fee-eosin.vercel.app/login`](https://fee-eosin.vercel.app/login)
- **Master Admin Portal (सुपर एडमिन लॉगिन)**: [`https://fee-eosin.vercel.app/super-admin/login`](https://fee-eosin.vercel.app/super-admin/login)
- **Android App (Institutes)**: [`https://fee-eosin.vercel.app/Education_Manager.apk`](https://fee-eosin.vercel.app/Education_Manager.apk)
- **Android App (Master Admin)**: [`https://fee-eosin.vercel.app/Master_Admin.apk`](https://fee-eosin.vercel.app/Master_Admin.apk)

---

## 👑 2. MASTER ADMIN MANUAL (मास्टर सुपर एडमिन गाइड)

The **Master Super Admin** is the central controller of the entire platform. The Master Admin creates tenant institutions, configures global UPI gateway settings, approves recurring subscription renewals, monitors total SaaS revenue, and directly accesses client workspaces for customer support.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MASTER ADMIN CONSOLE                            │
├────────────────────────────────────────────────────────────────────────┤
│  🏢 Institute Provisioning   ➔ Create & Edit Organizations + Passwords  │
│  ⚡ Server-Side Access        ➔ 1-Click Support Impersonation Session   │
│  ⚙️ Platform UPI Settings    ➔ Configure Master UPI ID & Payee Name    │
│  💳 Subscription Approvals   ➔ 1-Click UTR Verification & Renewals     │
│  🔐 2-Step Verification      ➔ Google Authenticator (TOTP) + Codes     │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 2.1 Master Admin Login & Security (लॉगिन एवं 2-स्टेप वेरिफिकेशन)
1. Navigate to: [`/super-admin/login`](https://fee-eosin.vercel.app/super-admin/login).
2. Enter Master Admin credentials:
   - **User ID / Email**: `admin@dprtuition.com`
   - **Password**: `Admin@12345`
3. **2-Step Verification (2FA Setup)**:
   - Click the **"🛡️ Setup 2-Step Verification"** button in the Super Admin layout.
   - Scan the generated QR code with **Google Authenticator** or **Authy**.
   - Enter the 6-digit confirmation code to activate 2FA and save the 8 emergency backup recovery codes.

---

### 2.2 How to Create a New Institution (नया संस्थान कैसे बनाएं)
1. Go to **"Organizations"** in the sidebar ([`/super-admin/organizations`](https://fee-eosin.vercel.app/super-admin/organizations)).
2. Click the **"+ Provision New Institute"** button.
3. Fill in the required details:
   - **Institution Name**: e.g., *Apex Coaching Institute*
   - **Organization Type**: *Private Tuition*, *Coaching Institute*, *School*, *Tutorial*, or *Academy*
   - **Admin / Owner Name**: e.g., *Prof. Rajesh Sharma*
   - **User ID / Login Email**: e.g., *rajesh@apex.com*
   - **Mobile Number**: e.g., `9876543210`
   - **Initial Password**: Set a secure password (or click *⚡ Generate Secure Password*).
   - **SaaS Subscription Plan**: *Basic*, *Standard*, *Premium*, or *Enterprise*.
   - **Price Per Cycle & Billing Cycle**: Monthly, Quarterly, or Yearly.
4. Click **"Create & Provision Workspace"**.
5. **Result**: 
   - The institution UUID, custom receipt prefixes, settings, and subscription are automatically generated.
   - The account is immediately active. The Institute Admin can now log in at `/login` with this Email and Password.

---

### 2.3 1-Click Instant Institution Access / Impersonation (संस्थान के अंदर सीधे लॉगिन करना)
Master Admin can access any institution's dashboard directly for maintenance, support, or auditing without knowing the client's password:
1. In the **Organizations List**, locate the desired institution.
2. Click the **"⚡ Access"** button (or click **"Open & Manage Workspace"** on the Institution Details page).
3. The system securely signs a server-side support session (`isImpersonating: true`).
4. You are instantly transported into that Institute's live Dashboard with full administrative privileges.
5. **Support Banner**: A prominent top banner displays:
   > 🛡️ **MASTER ADMIN SUPPORT SESSION:** *You are actively accessing "Apex Coaching".*
6. **Return Safely**: Click **"Exit Support Mode & Return to Master Admin"** at any time to return directly to the Master Admin console.

---

### 2.4 Platform UPI Payment Configuration (मास्टर UPI ID सेट करना)
Institutions pay their membership subscription fees directly to the Super Admin via UPI QR code:
1. Go to **"Subscriptions"** ([`/super-admin/subscriptions`](https://fee-eosin.vercel.app/super-admin/subscriptions)).
2. Click on the **"Platform Super Admin UPI Settings"** tab.
3. Enter:
   - **Platform Master UPI ID**: e.g., `dprtuition@okaxis` or `admin@upi`
   - **Payee Business Name**: e.g., `DPR Tuition Platform`
   - **Enable Dynamic UPI QR**: Checked (ON)
4. Click **"Save Platform UPI Settings"**.
5. All institutions will now see this UPI ID and corresponding dynamic QR code on their renewal page.

---

### 2.5 Approving Institution UPI Submissions (संस्थान की फीस और UTR अप्रूव करना)
1. When an institution renews their plan and submits their 12-digit Bank UTR reference, an alert badge appears on the **"UPI Payments & Approvals"** tab.
2. Review the payment details (Date, Institute Name, Amount, UTR Number).
3. Click:
   - **"✅ Approve (+1m)"**: Instantly marks payment as `SETTLED`, extends the institute's plan expiry date by 1 month (or chosen duration), and activates their workspace.
   - **"❌ Reject"**: Rejects invalid or fraudulent UTR references.

---

### 2.6 Editing & Managing Institutions (संस्थान का डाटा/पासवर्ड बदलना या डिलीट करना)
- **Edit Details**: Click the **✏️ Edit** button on any institution row to update the Institute Name, Owner Name, Login Email/User ID, Mobile Number, Password, or SaaS Plan.
- **Suspend / Reactivate**: Click the **⚡ Power** icon to temporarily freeze/unfreeze tenant access.
- **Permanent Deletion**: Click the **🗑️ Trash** icon to purge an organization and its associated records.

---

## 🏫 3. INSTITUTION ADMIN MANUAL (संस्थान एडमिन यूजर गाइड)

This section guides Coaching, Tuition, and School administrators on daily operations: enrolling students, generating fee invoices, collecting online/offline payments, dispatching WhatsApp reminders, logging expenses, and viewing analytical statements.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INSTITUTION DASHBOARD                           │
├────────────────────────────────────────────────────────────────────────┤
│  📊 Live KPI Analytics       ➔ Total Revenue, Outstanding & Students   │
│  👥 Student Directory        ➔ Enroll, Edit, View Statements & ID Card │
│  📚 Class & Batch Config     ➔ Standard Fees & Late Fee Policies       │
│  💳 Fee Collection Ledger    ➔ Dynamic UPI QR, Cash, Cheque & Receipts │
│  💬 1-Click WhatsApp Engine  ➔ Automated Pre-filled Payment Reminders  │
│  💸 Expense Tracking         ➔ Teacher Salaries, Rent, Utilities       │
│  📈 Financial Reports        ➔ Multi-dimensional CSV / PDF Statements │
│  ⭐ Membership Plan          ➔ Live Validity Meter & 1-Click Renewal   │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 3.1 Logging In (संस्थान लॉगिन)
1. Go to [`https://fee-eosin.vercel.app/login`](https://fee-eosin.vercel.app/login).
2. Enter your **Email / User ID** and **Password** (provided by the Super Admin).
3. Click **"Sign In"**. You will enter your dedicated Institute Dashboard.

---

### 3.2 Setting Up Classes & Batches (कक्षाएं एवं फीस सेट करना)
Before adding students, set up your institute's classes:
1. Go to **"Classes"** in the sidebar ([`/classes`](https://fee-eosin.vercel.app/classes)).
2. Click **"+ Create New Class"**.
3. Fill in:
   - **Class / Batch Name**: e.g., *Class 10 - Mathematics (Morning Batch)*
   - **Default Monthly Tuition Fee (₹)**: e.g., `1500`
   - **Default Admission Fee (₹)**: e.g., `500`
   - **Late Fee Rules (Optional)**: Enable Late Fee, set grace period (e.g., *5 days*), and fine amount (e.g., *₹50 fixed* or *5%*).
4. Click **"Save Class"**.

---

### 3.3 Enrolling New Students (नया छात्र जोड़ना)
1. Go to **"Students"** ([`/students`](https://fee-eosin.vercel.app/students)) or click **"Enroll Student"** on the Dashboard.
2. Click **"+ Add Student"**.
3. **Academic Setup**:
   - Select **Enrolled Class** (monthly fee auto-populates).
   - **Fee Mode**:
     - *Standard*: Uses class default fee.
     - *Custom*: Allows setting a discounted or custom fee for this specific student.
   - **Admission Date & Joining Date**: Automatically sets the recurring **Billing Cycle Anchor Day** (e.g., if admitted on 15th August, recurring cycles will always run from 15th to 14th of each month).
4. **Student Profile**:
   - **Full Name**, **Father's Name**, **Mother's / Guardian Name**.
   - **Primary Mobile Number** & **WhatsApp Number** (Check *Same as primary mobile* for 1-click sync).
   - **Date of Birth**, **Gender**, **School Name**, **Residential Address**.
5. Click **"Save & Enroll Student"**.
6. **Result**: The student code (e.g., `DPR-2026-001`) is generated, initial billing records are created, and the student immediately appears at the top of the Student List.

---

### 3.4 Collecting Student Fees & Instant Receipts (फीस जमा करना एवं रसीद)
1. Go to **"Payments"** ([`/payments`](https://fee-eosin.vercel.app/payments)) or find the student in **"Students"** list.
2. Click **"Collect Fee"**.
3. **Payment Details**:
   - View current pending fee cycle(s) and outstanding amount.
   - Enter **Amount to Pay** (supports partial installment payments or full settlement).
   - Choose **Payment Mode**: *Cash*, *UPI / QR Code*, *Bank Transfer (NEFT/IMPS)*, or *Cheque*.
   - If *UPI* is selected, the student can scan the **Instant UPI QR Code** directly from your screen.
   - Enter reference/transaction ID (optional).
4. Click **"Confirm & Generate Receipt"**.
5. **Instant PDF Receipt**:
   - A branded digital receipt (e.g., `DPR-RC-2026-0042`) is generated with student details, period breakdown, amount paid, and remaining balance.
   - Click **"Print / Download PDF"** or send it via WhatsApp.

---

### 3.5 1-Click WhatsApp Fee Reminders (व्हाट्सएप पर फीस रिमाइंडर भेजना)
1. In the **Students** list or **Payments** ledger, click the **💬 WhatsApp** button next to any student with pending or overdue fees.
2. A pre-formatted dialog appears with:
   - Recipient phone number (normalized with `+91`).
   - Professional bilingual message with student name, class, pending billing period, amount due, and institute payment link.
3. Click **"Open in WhatsApp"**.
4. WhatsApp Web or the WhatsApp Mobile App will open directly with the message pre-filled. Simply tap **Send** (Zero SMS/WhatsApp API charges).

---

### 3.6 Expense Tracking & Outflows (खर्चों का हिसाब-किताब)
Track all institute operational expenditures alongside fee income:
1. Go to **"Expenditure"** ([`/expenses`](https://fee-eosin.vercel.app/expenses)).
2. Click **"+ Record Expense"**.
3. Select **Category**: *Teacher Salary*, *Rent*, *Electricity / Utility*, *Stationery / Printing*, *Marketing*, or *Maintenance*.
4. Enter **Amount**, **Payment Method**, **Expense Date**, **Payee Name**, and **Description / Notes**.
5. Click **"Save Expense Record"**.
6. Real-time net profit (Total Fee Collections minus Total Expenses) is updated on the Dashboard.

---

### 3.7 Financial Reports & Student Statements (रिपोर्ट्स एवं स्टेटमेंट्स)
1. Go to **"Reports"** ([`/reports`](https://fee-eosin.vercel.app/reports)).
2. Choose Report Type:
   - **Monthly Financial Summary**: Total collections, pending dues, and expense breakdown.
   - **Student Account Statement**: Complete chronological ledger of all fees billed and payments made for a single student.
   - **Class-wise Collection Analysis**: Compare fee realization percentages across different classes/batches.
   - **Defaulters / Overdue List**: Filter students with overdue fees for bulk follow-ups.
3. Select custom date ranges or class filters.
4. Click **"Export to CSV / Excel"** or **"Print Statement"**.

---

### 3.8 Custom Institute Branding & Settings (लोगो एवं संस्थान की सेटिंग्स)
1. Go to **"Settings"** ([`/settings`](https://fee-eosin.vercel.app/settings)).
2. Customize:
   - **Institute Name & Tagline**.
   - **Upload Custom Institute Logo** (PNG / JPG).
   - **Receipt & Invoice Prefix**: e.g., `APEX-RC` or `DPR-RC`.
   - **Official Phone, WhatsApp, and Address**.
3. Click **"Save Settings"**. Your logo and customized headers will instantly reflect across all student receipts and reports.

---

### 3.9 Membership Plan & Validity Renewal (संस्थान की मेंबरशिप और UPI से रिन्यूअल)
Institutions can check their platform validity and renew their SaaS subscription anytime:
1. Go to **"Membership Plan"** in the sidebar ([`/subscription`](https://fee-eosin.vercel.app/subscription)).
2. View:
   - **Live Validity Counter**: e.g., *28 Days Remaining* (with circular validity meter).
   - **Current Plan**: Basic / Standard / Premium / Enterprise.
   - **Expiry Date & Billing Rate**.
3. **How to Pay / Renew Plan via UPI**:
   - Click **"Pay / Renew Membership Plan"**.
   - Select Duration: **1 Month**, **3 Months** (5% discount), **6 Months** (10% discount), or **1 Year** (15% discount).
   - The modal generates a **Dynamic UPI QR Code** linked to Super Admin's UPI ID.
   - Scan the QR code using any UPI app (**Google Pay, PhonePe, Paytm, BHIM, CRED**) or click the instant payment buttons.
   - After payment, enter your **12-Digit Bank UTR / Transaction Reference Number**.
   - Click **"Submit Payment Proof"**.
4. Once submitted, your payment status changes to `PENDING APPROVAL`. As soon as Super Admin verifies it, your plan validity is automatically extended!

---

## 🔒 4. Multi-Tenant Security & Data Isolation Architecture

```
                                 [ Incoming Request ]
                                          │
                                   [ Edge Middleware ]
                             (Verifies HS256 JWT Token)
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
         [ Master Super Admin ]                          [ Institution Tenant ]
      (Full Platform Management)                  (Scoped strictly to organizationId)
                  │                                               │
                  ├───────────────────────────────┐               │
                  ▼                               ▼               ▼
          [ Global Settings & ]            [ Temporary ]      [ Tenant DB ]
          [ Tenant Management ]            [ Support   ]   (Students, Classes, Fees,
                                           [ Session   ]    Payments, Expenditures)
```

1. **Strict Organization Scoping (IDOR Prevention)**:
   - Every API request validates the user's active membership against the database.
   - Queries strictly enforce `where: { organizationId: auth.organizationId }`. No institution can view or modify another institution's data.
2. **Public Self-Service Registration Disabled**:
   - Direct public sign-up is blocked. Only Master Super Admin can provision legitimate institution accounts.
3. **Password Security**:
   - All passwords are encrypted using salted `bcryptjs` (cost factor 10).
4. **Zero-Disk In-Memory PDF Streaming**:
   - PDF receipts are generated on-the-fly in RAM using `@react-pdf/renderer` without writing sensitive student records to server disks.

---

## 📲 5. Mobile Applications (Android APK & AAB)

The platform includes dedicated standalone Android builds built via **Capacitor**:

| Application | Package ID | Download Link | Target User |
|---|---|---|---|
| **Education Manager** | `com.dprtuition.app` | [`/Education_Manager.apk`](https://fee-eosin.vercel.app/Education_Manager.apk) | Institute Owners, Teachers, Accountants |
| **Master Admin** | `com.dprtuition.masteradmin` | [`/Master_Admin.apk`](https://fee-eosin.vercel.app/Master_Admin.apk) | Platform Master Super Admin |

---

## 🛠️ 6. Technology Stack

- **Frontend & Full-Stack Framework**: [Next.js 15.2](https://nextjs.org/) (App Router, Server Components & Server Actions)
- **UI Components & Styling**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Lucide Icons](https://lucide.dev/)
- **Database & ORM**: [Prisma ORM 6.4](https://www.prisma.io/), [Neon PostgreSQL Serverless Database](https://neon.tech/)
- **Authentication & Security**: [jose](https://github.com/panva/jose) (Edge HS256 JWT), [bcryptjs](https://www.npmjs.com/package/bcryptjs), [Zod v3](https://zod.dev/)
- **Mobile Engine**: [Capacitor 7](https://capacitorjs.com/) (Native Android APK & AAB)
- **Hosting & Edge Infrastructure**: [Vercel Edge Network](https://vercel.com/)

---

## 📞 7. Quick Troubleshooting & FAQ (अक्सर पूछे जाने वाले सवाल)

#### Q1: Can students or parents register themselves on the website?
> **No.** Public registration is permanently disabled. Only the Master Super Admin can create accounts for institutions, and institutions enroll their own students.

#### Q2: What happens if a student pays fee in two installments?
> Enter the partial amount (e.g. ₹500 out of ₹1500). The system automatically marks the record as `PARTIALLY_PAID`, generates a receipt for ₹500, and retains the ₹1000 balance for the next payment.

#### Q3: How does the billing cycle handle students admitted on different dates?
> Each student's billing anchor is tied to their admission date (e.g., 5th of each month, 18th of each month, etc.). The system automatically calculates calendar months without overlap.

#### Q4: How does Master Admin return after accessing an institute?
> Click the **"Exit Support Mode & Return to Master Admin"** button on the top support banner to immediately switch back to the Super Admin console.

---

*© 2026 Education Management SaaS Platform. All Rights Reserved.*
