# Orchestration Plan: DPR Fee Management System

## Objective
Build, verify, and harden a production-grade, full-stack Fee Management Web Application ("DPR Fee Management System") for "DPR Private Tuition" following all requirements R1-R5 and Acceptance Criteria in `ORIGINAL_REQUEST.md`.

## Execution Topology & Milestones

### Phase 0: Survey & Technical Exploration
- Spawn 3 parallel Explorers / Spec Miners:
  1. `explorer_survey_1`: Technical stack, package configuration, Next.js 15 / React 19 / Tailwind v4 / Prisma 6 / Neon adapter setup and Node/npm environment probe.
  2. `explorer_survey_2`: Core Domain Logic & Math: billing cycle calculations based on admission date, leap year / edge day rules, fee state transitions, idempotency constraints, late fees.
  3. `explorer_survey_3`: System Features: PDF generation with `@react-pdf/renderer` via secure token URLs, WhatsApp click-to-chat URL building, reports/charts, auth with `jose`+`bcryptjs`, audit logs.
- Synthesize findings into `PROJECT.md` (Feature Inventory, Architecture, Code Layout, Interfaces, Milestones).

### Phase 1: Dual Track Initiation
- **Track A (Implementation Track)**:
  - **Milestone 1**: Project Scaffolding, Prisma Schema & Neon DB Migrations/Seed.
  - **Milestone 2**: Core Fee Engine & Billing Cycle Services (idempotent generation, custom vs default fees, status derivation).
  - **Milestone 3**: Payment Processing, Receipt & Reminder PDF Generation (token-based access, atomic DB transactions).
  - **Milestone 4**: Complete Student & Class CRUD, Admin Dashboard, Reports, Analytics & WhatsApp Integration.
  - **Milestone 5**: Authentication (JWT via `jose` in middleware), Security, Role-based API protection, and Audit Logging.
- **Track B (E2E Testing Track)**:
  - Independent E2E Test Suite (Tiers 1-4: Feature coverage >= 5/feature, Boundary/Corner cases, Pairwise interactions, Real-world workloads).
  - Publish `TEST_INFRA.md` and `TEST_READY.md`.

### Phase 2: Implementation Track Final Milestone & Hardening
- **Milestone 6**: Pass 100% of E2E Test Suite (Tiers 1-4).
- **Milestone 7**: Adversarial Coverage Hardening (Tier 5) with Challengers & White-box Auditing.
- Forensic Integrity Audit (`teamwork_preview_auditor`) before final sign-off.
- Final victory report to Sentinel.
