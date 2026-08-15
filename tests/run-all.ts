/**
 * DPR Fee Management System — Master 4-Tier Automated Test Runner
 * Executes all Opaque-Box E2E Tests across Tiers 1-4 and generates execution diagnostics.
 */

import { TestCase, TestResult, TestSummary } from './types';
import { tier1ScaffoldingTests } from './tier1_features/01_scaffolding.test';
import { tier1BillingEngineTests } from './tier1_features/02_billing_engine.test';
import { tier1FeeLifecycleTests } from './tier1_features/03_fee_lifecycle.test';
import { tier1PaymentsTests } from './tier1_features/04_payments.test';
import { tier1DocumentsTests } from './tier1_features/05_documents.test';
import { tier1CrudDashboardTests } from './tier1_features/06_crud_dashboard.test';
import { tier1ReportsWhatsAppTests } from './tier1_features/07_reports_whatsapp.test';
import { tier1SecurityAuditTests } from './tier1_features/08_security_audit.test';

import { tier2DateBoundariesTests } from './tier2_boundaries/01_date_boundaries.test';
import { tier2FinancialBoundariesTests } from './tier2_boundaries/02_financial_boundaries.test';
import { tier2SecurityBoundariesTests } from './tier2_boundaries/03_security_boundaries.test';
import { tier2DocumentBoundariesTests } from './tier2_boundaries/04_document_boundaries.test';
import { tier2InputBoundariesTests } from './tier2_boundaries/05_input_boundaries.test';

import { tier3ClassFeeVsCustomStudentTests } from './tier3_combinations/01_class_fee_vs_custom_student.test';
import { tier3PartialPaymentRemindersTests } from './tier3_combinations/02_partial_payment_reminders.test';
import { tier3DiscountLateFeeLifecycleTests } from './tier3_combinations/03_discount_latefee_lifecycle.test';
import { tier3ClassTransferBillingTests } from './tier3_combinations/04_class_transfer_billing.test';
import { tier3StatusInactivationLifecycleTests } from './tier3_combinations/05_status_inactivation_lifecycle.test';

import { tier4FullInstituteSimulationTests } from './tier4_workloads/01_full_institute_simulation.test';
import { tier4DelinquencyRecoveryTests } from './tier4_workloads/02_delinquency_recovery_pipeline.test';
import { tier4FinancialReconciliationTests } from './tier4_workloads/03_financial_reports_reconciliation.test';
import { tier4HighConcurrencyPaymentsTests } from './tier4_workloads/04_high_concurrency_payments.test';

// Color codes for ANSI terminal output
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const GRAY = '\x1b[90m';
const BG_GREEN = '\x1b[42m\x1b[30m';
const BG_RED = '\x1b[41m\x1b[37m';

interface TestSuiteGroup {
  name: string;
  tier: number;
  description: string;
  tests: TestCase[];
}

const TEST_GROUPS: TestSuiteGroup[] = [
  // --- TIER 1: Feature Coverage (Features 1 - 35) ---
  {
    name: 'Tier 1: Scaffolding, DB & Seed (F01-F04)',
    tier: 1,
    description: 'Next.js 15, Prisma 6, Core Schema, and Realistic Seed Data',
    tests: tier1ScaffoldingTests,
  },
  {
    name: 'Tier 1: Billing Engine & Math (F05-F10)',
    tier: 1,
    description: 'Admission-date cycle math, anchor preservation, DEFAULT/CUSTOM modes, immutability, idempotency, discounts',
    tests: tier1BillingEngineTests,
  },
  {
    name: 'Tier 1: Fee Lifecycle & Numbering (F11-F13)',
    tier: 1,
    description: 'State machine (UPCOMING/DUE/PAID/OVERDUE), late fee calculations, student code generator',
    tests: tier1FeeLifecycleTests,
  },
  {
    name: 'Tier 1: Payments & Receipts (F14-F17)',
    tier: 1,
    description: 'Partial/full payments, overpayment guards, payment methods, sequential receipt numbers',
    tests: tier1PaymentsTests,
  },
  {
    name: 'Tier 1: Documents & PDF Streaming (F18-F20)',
    tier: 1,
    description: 'On-demand PDF receipts, reminder notices, secure crypto UUID tokens, zero disk writes',
    tests: tier1DocumentsTests,
  },
  {
    name: 'Tier 1: CRUD & SaaS Dashboard (F21-F25)',
    tier: 1,
    description: 'Classes & Students CRUD, 360 profile view, KPI metrics calculation, Recharts analytics',
    tests: tier1CrudDashboardTests,
  },
  {
    name: 'Tier 1: Reports & WhatsApp Integration (F26-F28)',
    tier: 1,
    description: '8 report views, RFC 4180 CSV export, WhatsApp wa.me deep links, responsive layout',
    tests: tier1ReportsWhatsAppTests,
  },
  {
    name: 'Tier 1: Security, Auth & Audit Logs (F29-F35)',
    tier: 1,
    description: 'jose JWT signing, bcrypt passwords, Edge middleware guards, Zod validation, audit trail',
    tests: tier1SecurityAuditTests,
  },

  // --- TIER 2: Boundary Value Analysis & Edge Cases ---
  {
    name: 'Tier 2: Temporal & Calendar Boundaries',
    tier: 2,
    description: '28th, 29th, 30th, 31st anchors, leap years, non-leap Feb, 48-month rollovers',
    tests: tier2DateBoundariesTests,
  },
  {
    name: 'Tier 2: Financial & Balance Boundaries',
    tier: 2,
    description: 'Overpayments, zero/negative payments, 100% discounts, micro-installments, fraction rounding',
    tests: tier2FinancialBoundariesTests,
  },
  {
    name: 'Tier 2: Cryptographic & Security Boundaries',
    tier: 2,
    description: 'Expired tokens, tampered signatures, unauthenticated API probes, role elevation attempts',
    tests: tier2SecurityBoundariesTests,
  },
  {
    name: 'Tier 2: Document & Token Expiration Boundaries',
    tier: 2,
    description: 'HTTP 410 expired token responses, HTTP 404 nonexistent UUIDs, memory streaming safety',
    tests: tier2DocumentBoundariesTests,
  },
  {
    name: 'Tier 2: String Escaping, Phone Sanitization & Input Boundaries',
    tier: 2,
    description: 'Unicode student names, RFC 4180 CSV quotes/commas, phone number sanitization',
    tests: tier2InputBoundariesTests,
  },

  // --- TIER 3: Cross-Feature Interactions ---
  {
    name: 'Tier 3: Class Fee Hikes vs. Custom Student Rates',
    tier: 3,
    description: 'Dynamic DEFAULT fee update with immutable historical snapshots and invariant CUSTOM rates',
    tests: tier3ClassFeeVsCustomStudentTests,
  },
  {
    name: 'Tier 3: Partial Payments & WhatsApp Reminders',
    tier: 3,
    description: 'Multi-part payment capture ➔ dynamic status update ➔ reminder token ➔ wa.me deep link',
    tests: tier3PartialPaymentRemindersTests,
  },
  {
    name: 'Tier 3: Discounts & Late Fee Settlements',
    tier: 3,
    description: 'Discount calculation ➔ grace period expiry late fee ➔ multi-part payment settlement',
    tests: tier3DiscountLateFeeLifecycleTests,
  },
  {
    name: 'Tier 3: Mid-Year Student Class Transfers',
    tier: 3,
    description: 'Class promotion/transfer mid-cycle preserving historical records and billing at new rates',
    tests: tier3ClassTransferBillingTests,
  },
  {
    name: 'Tier 3: Inactivation Lifecycle & Billing Block',
    tier: 3,
    description: 'Student inactivation/leaving halting future fee generation while preserving audit logs',
    tests: tier3StatusInactivationLifecycleTests,
  },

  // --- TIER 4: Real-World Institute Workloads ---
  {
    name: 'Tier 4: Full Institute Simulation',
    tier: 4,
    description: '12-month simulation with 12 classes, 24+ students, 288+ billing cycles, 300+ payments',
    tests: tier4FullInstituteSimulationTests,
  },
  {
    name: 'Tier 4: Delinquency Recovery Pipeline',
    tier: 4,
    description: 'Arrears aging across <15d, 15-30d, 30+d buckets, urgent notices, and recovery settlement',
    tests: tier4DelinquencyRecoveryTests,
  },
  {
    name: 'Tier 4: Financial Reports Reconciliation',
    tier: 4,
    description: 'Cross-reconciling Daily, Monthly, Outstanding, Class Distribution, and KPI collections',
    tests: tier4FinancialReconciliationTests,
  },
  {
    name: 'Tier 4: High-Concurrency Payments & Monotonic Receipts',
    tier: 4,
    description: 'Concurrent race-condition payments against fee balances, rollback safety, DPR-RC-YYYY-SEQ',
    tests: tier4HighConcurrencyPaymentsTests,
  },
];

async function runTestSuite(): Promise<void> {
  const startTime = Date.now();

  console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}        DPR FEE MANAGEMENT SYSTEM — 4-TIER OPAQUE-BOX E2E TEST RUNNER         ${RESET}`);
  console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════════════════════════════════════════${RESET}\n`);

  const summary: TestSummary = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    durationMs: 0,
    tierBreakdown: {
      1: { total: 0, passed: 0, failed: 0 },
      2: { total: 0, passed: 0, failed: 0 },
      3: { total: 0, passed: 0, failed: 0 },
      4: { total: 0, passed: 0, failed: 0 },
    },
    failures: [],
  };

  for (const group of TEST_GROUPS) {
    console.log(`${BOLD}${YELLOW}▶ [Tier ${group.tier}] ${group.name}${RESET}`);
    console.log(`  ${GRAY}${group.description}${RESET}`);

    let groupPassed = 0;
    let groupFailed = 0;

    for (const test of group.tests) {
      summary.totalTests++;
      summary.tierBreakdown[test.tier].total++;

      const testStart = Date.now();
      let passed = false;
      let errorMsg: string | undefined;

      try {
        await test.fn();
        passed = true;
        groupPassed++;
        summary.passed++;
        summary.tierBreakdown[test.tier].passed++;
      } catch (err: any) {
        passed = false;
        groupFailed++;
        summary.failed++;
        summary.tierBreakdown[test.tier].failed++;
        errorMsg = err.message || String(err);
        summary.failures.push({
          suiteName: group.name,
          testName: test.name,
          tier: test.tier,
          passed: false,
          durationMs: Date.now() - testStart,
          error: errorMsg,
          featureId: test.featureId,
          featureName: test.featureName,
        });
      }

      const duration = Date.now() - testStart;
      const statusIcon = passed ? `${GREEN}✔ PASS${RESET}` : `${RED}✖ FAIL${RESET}`;
      console.log(`    ${statusIcon} ${test.name} ${GRAY}(${duration}ms)${RESET}`);

      if (!passed && errorMsg) {
        console.log(`       ${RED}Error: ${errorMsg}${RESET}`);
      }
    }

    console.log(`  ${GRAY}Group Summary: ${groupPassed} passed, ${groupFailed} failed out of ${group.tests.length} tests${RESET}\n`);
  }

  summary.durationMs = Date.now() - startTime;

  console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}                             FINAL EXECUTION SUMMARY                                  ${RESET}`);
  console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════════════════════════════════════════${RESET}\n`);

  console.log(`${BOLD}Tier Breakdown:${RESET}`);
  for (let tier = 1; tier <= 4; tier++) {
    const t = summary.tierBreakdown[tier];
    const tierName =
      tier === 1
        ? 'Tier 1 (Feature Coverage — 35 Features)'
        : tier === 2
        ? 'Tier 2 (Boundary Value Analysis & Edge Cases)'
        : tier === 3
        ? 'Tier 3 (Cross-Feature Interactions & Pairwise)'
        : 'Tier 4 (Real-World Institute Workloads)';
    const color = t.failed === 0 ? GREEN : RED;
    console.log(
      `  • ${tierName.padEnd(50)}: ${color}${t.passed}/${t.total} Passed${RESET} ${
        t.failed > 0 ? `(${t.failed} Failed)` : ''
      }`
    );
  }

  console.log(`\n${BOLD}Total Tests Run:${RESET} ${summary.totalTests}`);
  console.log(`${BOLD}Passed:${RESET}         ${GREEN}${summary.passed}${RESET}`);
  console.log(`${BOLD}Failed:${RESET}         ${summary.failed > 0 ? RED : GREEN}${summary.failed}${RESET}`);
  console.log(`${BOLD}Total Duration:${RESET} ${summary.durationMs}ms`);

  if (summary.failed === 0) {
    console.log(`\n${BG_GREEN}${BOLD} ✔ ALL ${summary.totalTests} TESTS PASSED (100% SUCCESS RATE) ${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`\n${BG_RED}${BOLD} ✖ ${summary.failed} TESTS FAILED ${RESET}\n`);
    console.log(`${BOLD}Failure Details:${RESET}`);
    summary.failures.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [Tier ${f.tier}] ${f.testName}`);
      console.log(`     ${RED}${f.error}${RESET}`);
    });
    process.exit(1);
  }
}

// Run the test runner
runTestSuite().catch((err) => {
  console.error('Fatal error in test runner:', err);
  process.exit(1);
});
