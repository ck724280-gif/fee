## 2026-08-15T07:11:34Z
MANDATORY INPUTS:
- User Requirements: d:\antigravity programme\tuition_manager\.agents\ORIGINAL_REQUEST.md
- Project Blueprint: d:\antigravity programme\tuition_manager\PROJECT.md
- Gate Status: d:\antigravity programme\tuition_manager\.agents\orchestrator\GATE_STATUS.md

MISSION:
Investigate the current Next.js 15 / React 19 frontend setup, existing layout components, Tailwind v4 styling, Lucide icons, and design a concrete, comprehensive implementation plan for:
1. Dashboard layout (`src/app/(dashboard)/layout.tsx`) with desktop sidebar, mobile responsive collapsible drawer/header, user profile/logout, and breadcrumbs.
2. Dashboard main page (`src/app/(dashboard)/page.tsx`) with KPI cards (Total Students, Active Students, Monthly Collection, Pending/Overdue Fees), High-Priority Overdue Alert banner, Quick Action buttons.
3. Class Management UI (`src/app/(dashboard)/classes/page.tsx`, modal forms for Add/Edit class with default monthly fee, admission fee, late fee configuration).
4. Student Management UI (`src/app/(dashboard)/students/page.tsx`, filters by class/status/feeMode, search, pagination, Add/Edit modal with fee mode toggle DEFAULT vs CUSTOM, auto-populating class fee, admission date).
5. Student 360° Profile view (`src/app/(dashboard)/students/[id]/page.tsx`) showing personal details, current fee mode & discount, fee history timeline with badges, payment history table, quick action buttons (Collect Fee, Generate Reminder, Send WhatsApp, View Receipt).
