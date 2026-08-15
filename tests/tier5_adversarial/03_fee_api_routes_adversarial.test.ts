/**
 * Tier 5 Adversarial Challenge Suite:
 * API Validation Schemas & Pure Route Handling Stress
 */

import { assertEqual, assertTrue, assertFalse } from '../assertions';
import { generateFeesSchema, feeFilterSchema, updateFeeRecordSchema } from '../../src/lib/validations/fee';
import { FeeStatus } from '@prisma/client';

export async function runApiValidationsAdversarialSuite() {
  console.log('\n======================================================================');
  console.log('  CHALLENGER 2 (M2): API VALIDATION SCHEMAS ADVERSARIAL STRESS SUITE');
  console.log('======================================================================\n');

  let total = 0;
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      console.log(`  ✔ PASS [${total}]: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✖ FAIL [${total}]: ${name}`);
      console.error(`     Error: ${err.message || err}`);
      failed++;
    }
  }

  // Test 1: generateFeesSchema with invalid non-string studentId
  test('ADV-VAL-01: generateFeesSchema rejects non-string studentId', () => {
    const res = generateFeesSchema.safeParse({ studentId: 12345 });
    assertFalse(res.success);
  });

  // Test 2: generateFeesSchema accepts valid strings and empty objects
  test('ADV-VAL-02: generateFeesSchema accepts valid string options and empty body', () => {
    const emptyRes = generateFeesSchema.safeParse({});
    assertTrue(emptyRes.success);

    const validRes = generateFeesSchema.safeParse({
      studentId: 'stu_123',
      classId: 'cls_456',
      throughDate: '2026-06-15',
      currentDate: '2026-06-15',
    });
    assertTrue(validRes.success);
  });

  // Test 3: feeFilterSchema rejects invalid FeeStatus enum
  test('ADV-VAL-03: feeFilterSchema rejects invalid status values', () => {
    const res = feeFilterSchema.safeParse({ status: 'INVALID_STATUS' });
    assertFalse(res.success);
  });

  // Test 4: feeFilterSchema coercing pagination and enforcing max limit 100
  test('ADV-VAL-04: feeFilterSchema coerces numeric strings and caps/validates limit', () => {
    const parsed = feeFilterSchema.safeParse({
      page: '3',
      limit: '50',
      sortBy: 'totalAmount',
      sortOrder: 'asc',
    });
    assertTrue(parsed.success);
    if (parsed.success) {
      assertEqual(parsed.data.page, 3);
      assertEqual(parsed.data.limit, 50);
      assertEqual(parsed.data.sortBy, 'totalAmount');
      assertEqual(parsed.data.sortOrder, 'asc');
    }

    // Limit > 100 is rejected
    const overLimit = feeFilterSchema.safeParse({ limit: '500' });
    assertFalse(overLimit.success);

    // Negative page is rejected
    const negPage = feeFilterSchema.safeParse({ page: '-1' });
    assertFalse(negPage.success);
  });

  // Test 5: updateFeeRecordSchema validates negative late fees and invalid status
  test('ADV-VAL-05: updateFeeRecordSchema rejects negative late fee and invalid status', () => {
    const negLate = updateFeeRecordSchema.safeParse({ lateFeeAmount: -10 });
    assertFalse(negLate.success);

    const badStatus = updateFeeRecordSchema.safeParse({ status: 'NOT_A_STATUS' });
    assertFalse(badStatus.success);

    const validUpdate = updateFeeRecordSchema.safeParse({
      status: FeeStatus.WAIVED,
      notes: 'Fee waived by admin for scholarship',
      lateFeeAmount: 0,
    });
    assertTrue(validUpdate.success);
  });

  console.log(`\nAdversarial Validation Tests Result: ${passed}/${total} passed (${failed} failed).\n`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('03_fee_api_routes_adversarial.test.ts')) {
  runApiValidationsAdversarialSuite().catch((err) => {
    console.error('Fatal Validation test error:', err);
    process.exit(1);
  });
}
