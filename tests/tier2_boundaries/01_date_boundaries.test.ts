/**
 * Tier 2: Boundary Value Analysis & Edge Cases — 01 Date Math & Temporal Boundaries
 * Comprehensive boundary testing of admission date anchors across short months, leap years, and rollovers.
 */

import { assertEqual, assertTrue, assertFalse } from '../assertions';
import { TestCase } from '../types';
import { BillingService } from '../fixtures/mock-services';

export const tier2DateBoundariesTests: TestCase[] = [
  // 31st Anchor Tests
  {
    tier: 2,
    name: 'B01-T01: 31st Anchor: Jan 31 -> Feb 28 in non-leap year 2026',
    fn: () => {
      const c0 = BillingService.calculateBillingCycle(new Date('2026-01-31'), 0);
      assertEqual(c0.periodStartStr, '2026-01-31');
      assertEqual(c0.periodEndStr, '2026-02-27');
      assertEqual(c0.dueDateStr, '2026-02-28');
    },
  },
  {
    tier: 2,
    name: 'B01-T02: 31st Anchor: Feb 28 -> Mar 31 recovery in non-leap year 2026',
    fn: () => {
      const c1 = BillingService.calculateBillingCycle(new Date('2026-01-31'), 1);
      assertEqual(c1.periodStartStr, '2026-02-28');
      assertEqual(c1.periodEndStr, '2026-03-30');
      assertEqual(c1.dueDateStr, '2026-03-31');
    },
  },
  {
    tier: 2,
    name: 'B01-T03: 31st Anchor: Mar 31 -> Apr 30 clamp (30-day month)',
    fn: () => {
      const c2 = BillingService.calculateBillingCycle(new Date('2026-01-31'), 2);
      assertEqual(c2.periodStartStr, '2026-03-31');
      assertEqual(c2.periodEndStr, '2026-04-29');
      assertEqual(c2.dueDateStr, '2026-04-30');
    },
  },
  {
    tier: 2,
    name: 'B01-T04: 31st Anchor: Apr 30 -> May 31 recovery (31-day month)',
    fn: () => {
      const c3 = BillingService.calculateBillingCycle(new Date('2026-01-31'), 3);
      assertEqual(c3.periodStartStr, '2026-04-30');
      assertEqual(c3.periodEndStr, '2026-05-30');
      assertEqual(c3.dueDateStr, '2026-05-31');
    },
  },
  {
    tier: 2,
    name: 'B01-T05: 31st Anchor: May 31 -> Jun 30 clamp',
    fn: () => {
      const c4 = BillingService.calculateBillingCycle(new Date('2026-01-31'), 4);
      assertEqual(c4.periodStartStr, '2026-05-31');
      assertEqual(c4.periodEndStr, '2026-06-29');
      assertEqual(c4.dueDateStr, '2026-06-30');
    },
  },
  {
    tier: 2,
    name: 'B01-T06: 31st Anchor: Jun 30 -> Jul 31 recovery',
    fn: () => {
      const c5 = BillingService.calculateBillingCycle(new Date('2026-01-31'), 5);
      assertEqual(c5.periodStartStr, '2026-06-30');
      assertEqual(c5.periodEndStr, '2026-07-30');
      assertEqual(c5.dueDateStr, '2026-07-31');
    },
  },
  {
    tier: 2,
    name: 'B01-T07: 31st Anchor: Jul 31 -> Aug 31 (consecutive 31-day months)',
    fn: () => {
      const c6 = BillingService.calculateBillingCycle(new Date('2026-01-31'), 6);
      assertEqual(c6.periodStartStr, '2026-07-31');
      assertEqual(c6.periodEndStr, '2026-08-30');
      assertEqual(c6.dueDateStr, '2026-08-31');
    },
  },
  {
    tier: 2,
    name: 'B01-T08: 31st Anchor: Aug 31 -> Sep 30 clamp',
    fn: () => {
      const c7 = BillingService.calculateBillingCycle(new Date('2026-01-31'), 7);
      assertEqual(c7.periodStartStr, '2026-08-31');
      assertEqual(c7.periodEndStr, '2026-09-29');
      assertEqual(c7.dueDateStr, '2026-09-30');
    },
  },
  {
    tier: 2,
    name: 'B01-T09: 31st Anchor: Sep 30 -> Oct 31 recovery',
    fn: () => {
      const c8 = BillingService.calculateBillingCycle(new Date('2026-01-31'), 8);
      assertEqual(c8.periodStartStr, '2026-09-30');
      assertEqual(c8.periodEndStr, '2026-10-30');
      assertEqual(c8.dueDateStr, '2026-10-31');
    },
  },
  {
    tier: 2,
    name: 'B01-T10: 31st Anchor: Oct 31 -> Nov 30 clamp',
    fn: () => {
      const c9 = BillingService.calculateBillingCycle(new Date('2026-01-31'), 9);
      assertEqual(c9.periodStartStr, '2026-10-31');
      assertEqual(c9.periodEndStr, '2026-11-29');
      assertEqual(c9.dueDateStr, '2026-11-30');
    },
  },
  {
    tier: 2,
    name: 'B01-T11: 31st Anchor: Nov 30 -> Dec 31 recovery',
    fn: () => {
      const c10 = BillingService.calculateBillingCycle(new Date('2026-01-31'), 10);
      assertEqual(c10.periodStartStr, '2026-11-30');
      assertEqual(c10.periodEndStr, '2026-12-30');
      assertEqual(c10.dueDateStr, '2026-12-31');
    },
  },
  {
    tier: 2,
    name: 'B01-T12: 31st Anchor: Dec 31, 2026 -> Jan 31, 2027 Year Rollover',
    fn: () => {
      const c11 = BillingService.calculateBillingCycle(new Date('2026-01-31'), 11);
      assertEqual(c11.periodStartStr, '2026-12-31');
      assertEqual(c11.periodEndStr, '2027-01-30');
      assertEqual(c11.dueDateStr, '2027-01-31');
    },
  },

  // 30th Anchor Tests
  {
    tier: 2,
    name: 'B01-T13: 30th Anchor: Jan 30 -> Feb 28 clamp in non-leap year',
    fn: () => {
      const c0 = BillingService.calculateBillingCycle(new Date('2026-01-30'), 0);
      assertEqual(c0.periodStartStr, '2026-01-30');
      assertEqual(c0.periodEndStr, '2026-02-27');
      assertEqual(c0.dueDateStr, '2026-02-28');
    },
  },
  {
    tier: 2,
    name: 'B01-T14: 30th Anchor: Feb 28 -> Mar 30 recovery in non-leap year',
    fn: () => {
      const c1 = BillingService.calculateBillingCycle(new Date('2026-01-30'), 1);
      assertEqual(c1.periodStartStr, '2026-02-28');
      assertEqual(c1.periodEndStr, '2026-03-29');
      assertEqual(c1.dueDateStr, '2026-03-30');
    },
  },
  {
    tier: 2,
    name: 'B01-T15: 30th Anchor: Mar 30 -> Apr 30 exact (30-day month)',
    fn: () => {
      const c2 = BillingService.calculateBillingCycle(new Date('2026-01-30'), 2);
      assertEqual(c2.periodStartStr, '2026-03-30');
      assertEqual(c2.periodEndStr, '2026-04-29');
      assertEqual(c2.dueDateStr, '2026-04-30');
    },
  },
  {
    tier: 2,
    name: 'B01-T16: 30th Anchor: Apr 30 -> May 30 (31-day month stays 30)',
    fn: () => {
      const c3 = BillingService.calculateBillingCycle(new Date('2026-01-30'), 3);
      assertEqual(c3.periodStartStr, '2026-04-30');
      assertEqual(c3.periodEndStr, '2026-05-29');
      assertEqual(c3.dueDateStr, '2026-05-30');
    },
  },
  {
    tier: 2,
    name: 'B01-T17: 30th Anchor: Jan 30, 2024 -> Feb 29 in leap year',
    fn: () => {
      const c0 = BillingService.calculateBillingCycle(new Date('2024-01-30'), 0);
      assertEqual(c0.periodStartStr, '2024-01-30');
      assertEqual(c0.periodEndStr, '2024-02-28');
      assertEqual(c0.dueDateStr, '2024-02-29');
    },
  },

  // 29th Anchor Tests
  {
    tier: 2,
    name: 'B01-T18: 29th Anchor: Jan 29, 2026 -> Feb 28 in non-leap year',
    fn: () => {
      const c0 = BillingService.calculateBillingCycle(new Date('2026-01-29'), 0);
      assertEqual(c0.periodStartStr, '2026-01-29');
      assertEqual(c0.periodEndStr, '2026-02-27');
      assertEqual(c0.dueDateStr, '2026-02-28');
    },
  },
  {
    tier: 2,
    name: 'B01-T19: 29th Anchor: Feb 28 -> Mar 29 recovery in non-leap year',
    fn: () => {
      const c1 = BillingService.calculateBillingCycle(new Date('2026-01-29'), 1);
      assertEqual(c1.periodStartStr, '2026-02-28');
      assertEqual(c1.periodEndStr, '2026-03-28');
      assertEqual(c1.dueDateStr, '2026-03-29');
    },
  },
  {
    tier: 2,
    name: 'B01-T20: 29th Anchor: Jan 29, 2024 -> Feb 29 in leap year (exact match)',
    fn: () => {
      const c0 = BillingService.calculateBillingCycle(new Date('2024-01-29'), 0);
      assertEqual(c0.periodStartStr, '2024-01-29');
      assertEqual(c0.periodEndStr, '2024-02-28');
      assertEqual(c0.dueDateStr, '2024-02-29');
    },
  },
  {
    tier: 2,
    name: 'B01-T21: 29th Anchor: Feb 29, 2024 -> Mar 29 in leap year',
    fn: () => {
      const c1 = BillingService.calculateBillingCycle(new Date('2024-01-29'), 1);
      assertEqual(c1.periodStartStr, '2024-02-29');
      assertEqual(c1.periodEndStr, '2024-03-28');
      assertEqual(c1.dueDateStr, '2024-03-29');
    },
  },
  {
    tier: 2,
    name: 'B01-T22: Leap Day Admission (2024-02-29) Cycle 0 (Feb 29 -> Mar 28)',
    fn: () => {
      const c0 = BillingService.calculateBillingCycle(new Date('2024-02-29'), 0);
      assertEqual(c0.periodStartStr, '2024-02-29');
      assertEqual(c0.periodEndStr, '2024-03-28');
      assertEqual(c0.dueDateStr, '2024-03-29');
    },
  },
  {
    tier: 2,
    name: 'B01-T23: Leap Day Admission across 48 months: year 2025 non-leap clamp',
    fn: () => {
      const c12 = BillingService.calculateBillingCycle(new Date('2024-02-29'), 12);
      assertEqual(c12.periodStartStr, '2025-02-28');
      assertEqual(c12.periodEndStr, '2025-03-28');
      assertEqual(c12.dueDateStr, '2025-03-29');
    },
  },
  {
    tier: 2,
    name: 'B01-T24: Leap Day Admission across 48 months: year 2028 leap year restore',
    fn: () => {
      const c48 = BillingService.calculateBillingCycle(new Date('2024-02-29'), 48);
      assertEqual(c48.periodStartStr, '2028-02-29');
      assertEqual(c48.periodEndStr, '2028-03-28');
      assertEqual(c48.dueDateStr, '2028-03-29');
    },
  },

  // 28th Anchor Tests
  {
    tier: 2,
    name: 'B01-T25: 28th Anchor: Consistent day 28 start across all 12 months in non-leap year',
    fn: () => {
      for (let k = 0; k < 12; k++) {
        const c = BillingService.calculateBillingCycle(new Date('2026-01-28'), k);
        assertTrue(c.periodStartStr.endsWith('-28'));
      }
    },
  },
  {
    tier: 2,
    name: 'B01-T26: 28th Anchor: Consistent day 28 start across all 12 months in leap year',
    fn: () => {
      for (let k = 0; k < 12; k++) {
        const c = BillingService.calculateBillingCycle(new Date('2024-01-28'), k);
        assertTrue(c.periodStartStr.endsWith('-28'));
      }
    },
  },

  // 1st Anchor Tests
  {
    tier: 2,
    name: 'B01-T27: 1st Anchor: Full calendar month coverage (May 1 to May 31)',
    fn: () => {
      const c = BillingService.calculateBillingCycle(new Date('2026-05-01'), 0);
      assertEqual(c.periodStartStr, '2026-05-01');
      assertEqual(c.periodEndStr, '2026-05-31');
      assertEqual(c.dueDateStr, '2026-06-01');
    },
  },
  {
    tier: 2,
    name: 'B01-T28: 1st Anchor: February in non-leap year (Feb 1 to Feb 28)',
    fn: () => {
      const c = BillingService.calculateBillingCycle(new Date('2026-02-01'), 0);
      assertEqual(c.periodStartStr, '2026-02-01');
      assertEqual(c.periodEndStr, '2026-02-28');
      assertEqual(c.dueDateStr, '2026-03-01');
    },
  },
  {
    tier: 2,
    name: 'B01-T29: 1st Anchor: February in leap year (Feb 1 to Feb 29)',
    fn: () => {
      const c = BillingService.calculateBillingCycle(new Date('2024-02-01'), 0);
      assertEqual(c.periodStartStr, '2024-02-01');
      assertEqual(c.periodEndStr, '2024-02-29');
      assertEqual(c.dueDateStr, '2024-03-01');
    },
  },

  // Multi-Year Continuity Tests
  {
    tier: 2,
    name: 'B01-T30: 36 consecutive billing cycles have strictly non-overlapping contiguous boundaries',
    fn: () => {
      const admissionDate = new Date('2026-05-03');
      for (let k = 0; k < 35; k++) {
        const cCurrent = BillingService.calculateBillingCycle(admissionDate, k);
        const cNext = BillingService.calculateBillingCycle(admissionDate, k + 1);
        assertEqual(cCurrent.dueDateStr, cNext.periodStartStr);
      }
    },
  },
  {
    tier: 2,
    name: 'B01-T31: 31st Anchor 36 consecutive billing cycles have strictly contiguous boundaries',
    fn: () => {
      const admissionDate = new Date('2026-01-31');
      for (let k = 0; k < 35; k++) {
        const cCurrent = BillingService.calculateBillingCycle(admissionDate, k);
        const cNext = BillingService.calculateBillingCycle(admissionDate, k + 1);
        assertEqual(cCurrent.dueDateStr, cNext.periodStartStr);
      }
    },
  },
  {
    tier: 2,
    name: 'B01-T32: 29th Anchor 36 consecutive billing cycles have strictly contiguous boundaries',
    fn: () => {
      const admissionDate = new Date('2024-01-29');
      for (let k = 0; k < 35; k++) {
        const cCurrent = BillingService.calculateBillingCycle(admissionDate, k);
        const cNext = BillingService.calculateBillingCycle(admissionDate, k + 1);
        assertEqual(cCurrent.dueDateStr, cNext.periodStartStr);
      }
    },
  },
  {
    tier: 2,
    name: 'B01-T33: Cycle index 0 matches admission start day exactly',
    fn: () => {
      const d = new Date('2026-07-19');
      const c = BillingService.calculateBillingCycle(d, 0);
      assertEqual(c.periodStartStr, '2026-07-19');
    },
  },
  {
    tier: 2,
    name: 'B01-T34: Cycle index 120 (10 years) advances target year by exactly 10',
    fn: () => {
      const d = new Date('2026-05-03');
      const c = BillingService.calculateBillingCycle(d, 120);
      assertEqual(c.periodStartStr, '2036-05-03');
    },
  },
  {
    tier: 2,
    name: 'B01-T35: Zero gap between periodEnd and dueDate (due date is exactly 1 day after periodEnd)',
    fn: () => {
      const c = BillingService.calculateBillingCycle(new Date('2026-05-03'), 0);
      const end = new Date(c.periodEnd);
      const due = new Date(c.dueDate);
      const diffMs = due.getTime() - end.getTime();
      assertEqual(diffMs, 86400000); // 24 hours = 1 day
    },
  },
];

if (process.argv[1]?.replace(/\\/g, '/').endsWith('01_date_boundaries.test.ts')) {
  (async () => {
    let passed = 0;
    let failed = 0;
    console.log(`Running ${tier2DateBoundariesTests.length} tests in 01_date_boundaries.test.ts...`);
    for (const t of tier2DateBoundariesTests) {
      try {
        await t.fn();
        console.log(`  ✔ PASS: ${t.name}`);
        passed++;
      } catch (err: any) {
        console.error(`  ✖ FAIL: ${t.name}`, err);
        failed++;
      }
    }
    console.log(`\nResult: ${passed} passed, ${failed} failed out of ${tier2DateBoundariesTests.length} tests.`);
    if (failed > 0) process.exit(1);
  })();
}

