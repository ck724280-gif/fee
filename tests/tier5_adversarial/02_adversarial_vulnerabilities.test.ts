/**
 * Tier 5 Adversarial Vulnerability & Attack Surface Suite
 * Target: src/lib/billing-engine.ts
 * Author: Challenger 1 (Milestone M2)
 */

import {
  calculateBillingCycle,
  getBillingCyclesUpToDate,
  calculateFeeBreakdown,
  calculateLateFee,
  deriveFeeStatus,
  generateStudentCode,
  generateStudentBillingRecords,
  generateBatchBillingRecords,
  formatYMD,
  startOfDay,
} from '../../src/lib/billing-engine';
import { assert, assertEqual, assertTrue, assertFalse, assertThrows } from '../assertions';

interface VulnerabilityReport {
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  description: string;
  evidence: string;
  mitigation: string;
}

const vulnerabilities: VulnerabilityReport[] = [];

async function main() {
  console.log('\n============================================================');
  console.log('  CHALLENGER 1 — ADVERSARIAL VULNERABILITY INVESTIGATION');
  console.log('============================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: Student Code Lexicographical Sort Collision at 1,000+ Students
  // -------------------------------------------------------------------------
  console.log('--- Testing 1: Student Code 1000+ Sequence Sorting ---');
  {
    // Mock DB simulating students from DPR-2026-001 up to DPR-2026-1000
    const students = [
      { studentCode: 'DPR-2026-998' },
      { studentCode: 'DPR-2026-999' },
      { studentCode: 'DPR-2026-1000' },
    ];

    const mockPrisma = {
      student: {
        findFirst: async ({ orderBy }: any) => {
          // Prisma string sorting order by studentCode desc
          const sorted = [...students].sort((a, b) => b.studentCode.localeCompare(a.studentCode));
          return sorted[0]; // In string comparison, 'DPR-2026-999' > 'DPR-2026-1000'
        },
      },
    };

    const nextCode = await generateStudentCode(mockPrisma as any, 2026);
    console.log(`    Current highest in DB: DPR-2026-1000`);
    console.log(`    Generated next code:   ${nextCode}`);

    if (nextCode === 'DPR-2026-1000') {
      vulnerabilities.push({
        title: 'Student Code Sequence Collision Beyond 999 Students in Single Year',
        severity: 'MEDIUM',
        description:
          'generateStudentCode uses Prisma orderBy: { studentCode: "desc" } on a varchar column. Because studentCode is padded to 3 digits ("DPR-YYYY-001" to "DPR-YYYY-999"), when sequence reaches 1000 ("DPR-YYYY-1000"), string alphabetical comparison evaluates "DPR-YYYY-999" > "DPR-YYYY-1000". Consequently, findFirst returns DPR-YYYY-999 instead of DPR-YYYY-1000, causing subsequent student generation to duplicate DPR-YYYY-1000.',
        evidence: `When DB contains DPR-2026-1000, generateStudentCode returned ${nextCode} instead of DPR-2026-1001`,
        mitigation:
          'Pad sequence to 4 digits (e.g. "DPR-YYYY-0001") or query MAX sequence by parsing substring in DB or use a dedicated sequence counter table.',
      });
      console.log('    [VULNERABILITY CONFIRMED]: Student code sequence duplicates at 1,000 students.');
    } else {
      console.log('    [PASSED]: Student code sequence generated correctly.');
    }
  }

  // -------------------------------------------------------------------------
  // TEST 2: ISO Date String UTC Offset Interpretation
  // -------------------------------------------------------------------------
  console.log('\n--- Testing 2: ISO Date String UTC vs Local Day Parsing ---');
  {
    // When passing "2026-05-03" (date-only ISO string), JS new Date("2026-05-03") creates UTC midnight.
    // In timezone UTC-5 (EST), new Date("2026-05-03").getDate() is 2 (May 2nd).
    // Let's test if passing string vs Date preserves intention.
    const dateObj = new Date(2026, 4, 3); // May 3 local
    const cObj = calculateBillingCycle(dateObj, 0);
    console.log(`    Local Date Object (2026, 4, 3) -> Start: ${cObj.periodStartStr}, End: ${cObj.periodEndStr}`);
    assertEqual(cObj.periodStartStr, '2026-05-03');

    // In local environment
    const strDate = '2026-05-03';
    const cStr = calculateBillingCycle(strDate, 0);
    console.log(`    String "2026-05-03" -> Start: ${cStr.periodStartStr}, End: ${cStr.periodEndStr}`);

    if (cObj.periodStartStr !== cStr.periodStartStr) {
      vulnerabilities.push({
        title: 'Timezone Offset Discrepancy on ISO Date String Parsing',
        severity: 'LOW',
        description:
          'Passing a date-only string "YYYY-MM-DD" to new Date() parses it as UTC midnight. In negative UTC timezones (e.g. UTC-5 EST), getDate() returns day - 1.',
        evidence: `String produced ${cStr.periodStartStr} vs Date Object ${cObj.periodStartStr}`,
        mitigation: 'Parse date strings with explicit year/month/day components (e.g., dateStr.split("-")).',
      });
    } else {
      console.log('    [PASSED in current timezone]: String parsing matches Date object.');
    }
  }

  // -------------------------------------------------------------------------
  // TEST 3: Negative and Extreme Cycle Indices
  // -------------------------------------------------------------------------
  console.log('\n--- Testing 3: Negative & Large Cycle Indices ---');
  {
    const base = new Date(2026, 4, 3);
    const cNeg1 = calculateBillingCycle(base, -1);
    console.log(`    Cycle -1 (1 month before admission): ${cNeg1.periodStartStr} to ${cNeg1.periodEndStr}`);
    assertEqual(cNeg1.periodStartStr, '2026-04-03');
    assertEqual(cNeg1.periodEndStr, '2026-05-02');
    assertEqual(cNeg1.dueDateStr, '2026-05-03');

    const c1200 = calculateBillingCycle(base, 1200); // 100 years in future
    console.log(`    Cycle 1200 (100 years future): ${c1200.periodStartStr} to ${c1200.periodEndStr}`);
    assertEqual(c1200.periodStartStr, '2126-05-03');
    console.log('    [PASSED]: Math handles negative and 100-year cycle indices gracefully.');
  }

  // -------------------------------------------------------------------------
  // TEST 4: Batch Billing with Inactive/Missing Class Handling
  // -------------------------------------------------------------------------
  console.log('\n--- Testing 4: Batch Generation Error Isolation ---');
  {
    const mockDb = {
      student: {
        findMany: async () => [
          { id: 's1', studentCode: 'DPR-2026-001', status: 'ACTIVE', admissionDate: new Date('2026-01-01'), classId: 'c1' },
          { id: 's2', studentCode: 'DPR-2026-002', status: 'ACTIVE', admissionDate: new Date('2026-01-01'), classId: 'c-invalid' },
        ],
        findUnique: async ({ where }: any) => {
          if (where.id === 's1') {
            return {
              id: 's1',
              status: 'ACTIVE',
              admissionDate: new Date('2026-01-01'),
              feeMode: 'DEFAULT',
              classId: 'c1',
              class: { defaultMonthlyFee: 500, lateFeeEnabled: false },
            };
          }
          if (where.id === 's2') {
            return {
              id: 's2',
              status: 'ACTIVE',
              admissionDate: new Date('2026-01-01'),
              feeMode: 'DEFAULT',
              classId: 'c-invalid',
              class: null, // Missing class relation
            };
          }
          return null;
        },
      },
      feeRecord: {
        findFirst: async () => null,
        create: async ({ data }: any) => ({ id: `fee_${Math.random()}`, ...data }),
      },
    };

    const batchRes = await generateBatchBillingRecords(mockDb as any, {
      throughDate: new Date('2026-01-15'),
    });

    console.log(`    Batch total processed: ${batchRes.totalProcessed}`);
    console.log(`    Batch created:         ${batchRes.created}`);
    console.log(`    Batch errors caught:   ${batchRes.errors.length}`);

    assertEqual(batchRes.totalProcessed, 2);
    assertEqual(batchRes.created, 1);
    assertEqual(batchRes.errors.length, 1);
    assertEqual(batchRes.errors[0].studentId, 's2');
    console.log('    [PASSED]: Batch generator isolates individual student errors without failing entire batch.');
  }

  // -------------------------------------------------------------------------
  // Summary of Adversarial Findings
  // -------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log('  ADVERSARIAL FINDINGS SUMMARY');
  console.log(`  Identified ${vulnerabilities.length} potential vulnerabilities / edge-case limitations.`);
  console.log('============================================================');
  for (const v of vulnerabilities) {
    console.log(`\n  [${v.severity}] ${v.title}`);
    console.log(`  Description: ${v.description}`);
    console.log(`  Evidence:    ${v.evidence}`);
    console.log(`  Mitigation:  ${v.mitigation}`);
  }
}

main().catch((err) => {
  console.error('Adversarial suite error:', err);
  process.exit(1);
});
