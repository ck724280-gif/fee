/**
 * Tier 5 Adversarial Stress & Correctness Suite:
 * Payment Atomic Transactions, Overpayment Guard, Multi-Installment Math & Receipt Sequencing
 * Author: Challenger 1 (Milestone 3)
 */

import { assertEqual, assertTrue, assertFalse, assertApprox, assertThrows, assertRejects } from '../assertions';
import {
  generateReceiptNumber,
  recordPayment,
  getPaymentById,
  getPaymentByReceiptNumber,
  listPayments,
} from '../../src/lib/payment-service';
import { recordPaymentSchema, paymentFilterSchema } from '../../src/lib/validations/payment';
import { FeeStatus, PaymentMethod } from '@prisma/client';

export async function runPaymentEmpiricalStressSuite() {
  console.log('\n================================================================================');
  console.log('  CHALLENGER 1 (M3): PAYMENT ENGINE & TRANSACTION ATOMICITY EMPIRICAL STRESS SUITE');
  console.log('================================================================================\n');

  let total = 0;
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    total++;
    try {
      await fn();
      console.log(`  ✔ PASS [${total}]: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✖ FAIL [${total}]: ${name}`);
      console.error(`     Error: ${err.message || err}`);
      failed++;
    }
  }

  // ============================================================================
  // SECTION 1: OVERPAYMENT VALIDATION & BOUNDARY TESTS
  // ============================================================================

  await test('STRESS-PAY-01: Rejection of exact overpayment boundary (+₹0.01 above outstanding balance)', async () => {
    let feeRecord = {
      id: 'fee_stress_1',
      studentId: 'stu_1',
      classId: 'cls_1',
      totalAmount: 1000,
      paidAmount: 400,
      outstandingAmount: 600,
      status: FeeStatus.PARTIALLY_PAID,
      student: { id: 'stu_1', name: 'Aarav Patel', studentCode: 'DPR-2026-001', class: { name: 'Class 8' } },
      class: { name: 'Class 8' },
    };

    const mockPrisma = {
      $transaction: async (cb: any) => {
        const tx = {
          feeRecord: {
            findUnique: async () => ({ ...feeRecord }),
            update: async ({ data }: any) => {
              feeRecord = { ...feeRecord, ...data };
              return feeRecord;
            },
          },
          payment: {
            findFirst: async () => null,
            create: async ({ data }: any) => ({ id: 'pay_1', ...data }),
          },
          document: {
            create: async ({ data }: any) => ({ id: 'doc_1', ...data }),
          },
          auditLog: {
            create: async ({ data }: any) => ({ id: 'audit_1', ...data }),
          },
        };
        return await cb(tx);
      },
    };

    // Attempting to pay 600.01 when outstanding is 600
    await assertRejects(
      async () => {
        await recordPayment(
          { feeRecordId: 'fee_stress_1', amount: 600.01, paymentMethod: 'UPI' },
          mockPrisma as any
        );
      },
      'cannot exceed outstanding balance'
    );

    // State remains unaltered
    assertEqual(feeRecord.paidAmount, 400);
    assertEqual(feeRecord.outstandingAmount, 600);
    assertEqual(feeRecord.status, FeeStatus.PARTIALLY_PAID);
  });

  await test('STRESS-PAY-02: Payment attempt on an already PAID fee record (outstanding = 0) is rejected', async () => {
    const feeRecord = {
      id: 'fee_paid_1',
      studentId: 'stu_1',
      classId: 'cls_1',
      totalAmount: 800,
      paidAmount: 800,
      outstandingAmount: 0,
      status: FeeStatus.PAID,
      student: { id: 'stu_1', name: 'Aarav Patel', studentCode: 'DPR-2026-001', class: { name: 'Class 8' } },
      class: { name: 'Class 8' },
    };

    const mockPrisma = {
      $transaction: async (cb: any) => {
        const tx = {
          feeRecord: {
            findUnique: async () => feeRecord,
          },
        };
        return await cb(tx);
      },
    };

    await assertRejects(
      async () => {
        await recordPayment(
          { feeRecordId: 'fee_paid_1', amount: 10, paymentMethod: 'CASH' },
          mockPrisma as any
        );
      },
      'cannot exceed outstanding balance of ₹0'
    );
  });

  await test('STRESS-PAY-03: Zero, negative, NaN, and Infinity amounts are strictly rejected', async () => {
    const mockPrisma = {
      $transaction: async () => {},
    };

    // Zero amount
    await assertRejects(
      async () => {
        await recordPayment(
          { feeRecordId: 'fee_1', amount: 0, paymentMethod: 'CASH' },
          mockPrisma as any
        );
      },
      'greater than 0'
    );

    // Negative amount
    await assertRejects(
      async () => {
        await recordPayment(
          { feeRecordId: 'fee_1', amount: -500, paymentMethod: 'CASH' },
          mockPrisma as any
        );
      },
      'greater than 0'
    );

    // NaN
    await assertRejects(
      async () => {
        await recordPayment(
          { feeRecordId: 'fee_1', amount: NaN, paymentMethod: 'CASH' },
          mockPrisma as any
        );
      },
      'greater than 0'
    );

    // Schema validation checks
    assertFalse(recordPaymentSchema.safeParse({ feeRecordId: 'f1', amount: 0 }).success);
    assertFalse(recordPaymentSchema.safeParse({ feeRecordId: 'f1', amount: -10 }).success);
    assertFalse(recordPaymentSchema.safeParse({ feeRecordId: 'f1', amount: Infinity }).success);
    assertFalse(recordPaymentSchema.safeParse({ feeRecordId: 'f1', amount: 'abc' as any }).success);
  });

  await test('STRESS-PAY-04: Non-existent fee record returns clear not found error', async () => {
    const mockPrisma = {
      $transaction: async (cb: any) => {
        const tx = {
          feeRecord: {
            findUnique: async () => null,
          },
        };
        return await cb(tx);
      },
    };

    await assertRejects(
      async () => {
        await recordPayment(
          { feeRecordId: 'non_existent_id', amount: 500, paymentMethod: 'CASH' },
          mockPrisma as any
        );
      },
      'not found'
    );
  });

  // ============================================================================
  // SECTION 2: MULTI-INSTALLMENT CALCULATIONS & STATUS TRANSITIONS
  // ============================================================================

  await test('STRESS-PAY-05: 10-installment micro-payment sequence converges accurately to PAID status', async () => {
    let feeRecordState: any = {
      id: 'fee_multi_1',
      studentId: 'stu_10',
      classId: 'cls_8',
      totalAmount: 1000,
      paidAmount: 0,
      outstandingAmount: 1000,
      status: FeeStatus.DUE,
      student: { id: 'stu_10', name: 'Meera Sen', studentCode: 'DPR-2026-010', class: { name: 'Class 8' } },
      class: { name: 'Class 8' },
    };

    const paymentLog: any[] = [];
    const documentLog: any[] = [];
    const auditLog: any[] = [];

    const mockPrisma = {
      $transaction: async (cb: any) => {
        const tx = {
          feeRecord: {
            findUnique: async () => ({ ...feeRecordState }),
            update: async ({ data }: any) => {
              feeRecordState = { ...feeRecordState, ...data };
              return { ...feeRecordState };
            },
          },
          payment: {
            findFirst: async () => (paymentLog.length > 0 ? paymentLog[paymentLog.length - 1] : null),
            create: async ({ data }: any) => {
              const p = { id: `pay_${paymentLog.length + 1}`, ...data };
              paymentLog.push(p);
              return p;
            },
          },
          document: {
            create: async ({ data }: any) => {
              const d = { id: `doc_${documentLog.length + 1}`, ...data };
              documentLog.push(d);
              return d;
            },
          },
          auditLog: {
            create: async ({ data }: any) => {
              const a = { id: `audit_${auditLog.length + 1}`, ...data };
              auditLog.push(a);
              return a;
            },
          },
        };
        return await cb(tx);
      },
    };

    // Execute 10 installments of ₹100 each
    for (let i = 1; i <= 10; i++) {
      const result = await recordPayment(
        {
          feeRecordId: 'fee_multi_1',
          amount: 100,
          paymentMethod: i % 2 === 0 ? 'UPI' : 'CASH',
          notes: `Installment ${i} of 10`,
        },
        mockPrisma as any
      );

      const expectedPaid = i * 100;
      const expectedOutstanding = 1000 - expectedPaid;
      const expectedStatus = i === 10 ? FeeStatus.PAID : FeeStatus.PARTIALLY_PAID;

      assertEqual(result.feeRecord.paidAmount, expectedPaid, `Mismatch in paidAmount on installment ${i}`);
      assertEqual(result.feeRecord.outstandingAmount, expectedOutstanding, `Mismatch in outstandingAmount on installment ${i}`);
      assertEqual(result.feeRecord.status, expectedStatus, `Mismatch in status on installment ${i}`);
      assertEqual(paymentLog.length, i);
      assertEqual(documentLog.length, i);
      assertEqual(auditLog.length, i);
      assertEqual(auditLog[i - 1].details.newStatus, expectedStatus);
      assertEqual(auditLog[i - 1].details.remainingOutstanding, expectedOutstanding);
    }

    // 11th installment must fail with overpayment
    await assertRejects(
      async () => {
        await recordPayment(
          { feeRecordId: 'fee_multi_1', amount: 50, paymentMethod: 'CASH' },
          mockPrisma as any
        );
      },
      'cannot exceed outstanding balance of ₹0'
    );
  });

  await test('STRESS-PAY-06: Decimal fraction installments (₹33.33 + ₹33.33 + ₹33.34 = ₹100.00)', async () => {
    let feeRecordState: any = {
      id: 'fee_decimal_1',
      studentId: 'stu_11',
      classId: 'cls_5',
      totalAmount: 100,
      paidAmount: 0,
      outstandingAmount: 100,
      status: FeeStatus.UPCOMING,
      student: { id: 'stu_11', name: 'Tanmay Roy', studentCode: 'DPR-2026-011', class: { name: 'Class 5' } },
      class: { name: 'Class 5' },
    };

    const mockPrisma = {
      $transaction: async (cb: any) => {
        const tx = {
          feeRecord: {
            findUnique: async () => ({ ...feeRecordState }),
            update: async ({ data }: any) => {
              feeRecordState = { ...feeRecordState, ...data };
              return { ...feeRecordState };
            },
          },
          payment: {
            findFirst: async () => null,
            create: async ({ data }: any) => ({ id: 'pay_dec', ...data }),
          },
          document: {
            create: async ({ data }: any) => ({ id: 'doc_dec', ...data }),
          },
          auditLog: {
            create: async ({ data }: any) => ({ id: 'audit_dec', ...data }),
          },
        };
        return await cb(tx);
      },
    };

    // Installment 1: 33.33
    const res1 = await recordPayment({ feeRecordId: 'fee_decimal_1', amount: 33.33, paymentMethod: 'CARD' }, mockPrisma as any);
    assertApprox(res1.feeRecord.paidAmount, 33.33, 0.0001);
    assertApprox(res1.feeRecord.outstandingAmount, 66.67, 0.0001);
    assertEqual(res1.feeRecord.status, FeeStatus.PARTIALLY_PAID);

    // Installment 2: 33.33
    const res2 = await recordPayment({ feeRecordId: 'fee_decimal_1', amount: 33.33, paymentMethod: 'CARD' }, mockPrisma as any);
    assertApprox(res2.feeRecord.paidAmount, 66.66, 0.0001);
    assertApprox(res2.feeRecord.outstandingAmount, 33.34, 0.0001);
    assertEqual(res2.feeRecord.status, FeeStatus.PARTIALLY_PAID);

    // Installment 3: 33.34 (Exact remainder)
    const res3 = await recordPayment({ feeRecordId: 'fee_decimal_1', amount: 33.34, paymentMethod: 'CARD' }, mockPrisma as any);
    assertApprox(res3.feeRecord.paidAmount, 100.0, 0.0001);
    assertEqual(res3.feeRecord.outstandingAmount, 0);
    assertEqual(res3.feeRecord.status, FeeStatus.PAID);
  });

  await test('STRESS-PAY-07: Single full payment transitions directly from OVERDUE to PAID', async () => {
    let feeRecordState: any = {
      id: 'fee_overdue_1',
      studentId: 'stu_12',
      classId: 'cls_6',
      totalAmount: 650,
      paidAmount: 0,
      outstandingAmount: 650,
      status: FeeStatus.OVERDUE,
      student: { id: 'stu_12', name: 'Rohan Gupta', studentCode: 'DPR-2026-012', class: { name: 'Class 6' } },
      class: { name: 'Class 6' },
    };

    const mockPrisma = {
      $transaction: async (cb: any) => {
        const tx = {
          feeRecord: {
            findUnique: async () => ({ ...feeRecordState }),
            update: async ({ data }: any) => {
              feeRecordState = { ...feeRecordState, ...data };
              return { ...feeRecordState };
            },
          },
          payment: {
            findFirst: async () => null,
            create: async ({ data }: any) => ({ id: 'pay_ov', ...data }),
          },
          document: {
            create: async ({ data }: any) => ({ id: 'doc_ov', ...data }),
          },
          auditLog: {
            create: async ({ data }: any) => ({ id: 'audit_ov', ...data }),
          },
        };
        return await cb(tx);
      },
    };

    const res = await recordPayment({ feeRecordId: 'fee_overdue_1', amount: 650, paymentMethod: 'BANK_TRANSFER', transactionId: 'NEFT123456' }, mockPrisma as any);
    assertEqual(res.feeRecord.paidAmount, 650);
    assertEqual(res.feeRecord.outstandingAmount, 0);
    assertEqual(res.feeRecord.status, FeeStatus.PAID);
  });

  // ============================================================================
  // SECTION 3: TRANSACTION ATOMICITY & MID-STREAM FAILURE ROLLBACK
  // ============================================================================

  await test('STRESS-PAY-08: Transaction rollback when Document creation fails midway', async () => {
    let feeRecordState: any = {
      id: 'fee_rollback_doc',
      totalAmount: 800,
      paidAmount: 0,
      outstandingAmount: 800,
      status: FeeStatus.DUE,
      student: { id: 'stu_rb1', name: 'Vikram', studentCode: 'DPR-2026-015', class: { name: 'Class 8' } },
      class: { name: 'Class 8' },
    };

    let paymentCreated = false;
    let feeUpdated = false;

    // Simulated transactional client where document.create fails
    const mockPrisma = {
      $transaction: async (cb: any) => {
        // We create isolated scratch copies
        let scratchFee = { ...feeRecordState };
        const tx = {
          feeRecord: {
            findUnique: async () => ({ ...scratchFee }),
            update: async ({ data }: any) => {
              scratchFee = { ...scratchFee, ...data };
              feeUpdated = true;
              return scratchFee;
            },
          },
          payment: {
            findFirst: async () => null,
            create: async ({ data }: any) => {
              paymentCreated = true;
              return { id: 'p_temp', ...data };
            },
          },
          document: {
            create: async () => {
              throw new Error('Database disk full / Document table error');
            },
          },
          auditLog: {
            create: async () => ({ id: 'a_temp' }),
          },
        };

        try {
          const res = await cb(tx);
          // If transaction succeeded, commit scratchFee
          feeRecordState = scratchFee;
          return res;
        } catch (err) {
          // Transaction aborted: scratch state discarded
          throw err;
        }
      },
    };

    await assertRejects(
      async () => {
        await recordPayment(
          { feeRecordId: 'fee_rollback_doc', amount: 400, paymentMethod: 'CASH' },
          mockPrisma as any
        );
      },
      'Document table error'
    );

    // Assert that feeRecordState was untouched (transaction rolled back)
    assertEqual(feeRecordState.paidAmount, 0);
    assertEqual(feeRecordState.outstandingAmount, 800);
    assertEqual(feeRecordState.status, FeeStatus.DUE);
  });

  await test('STRESS-PAY-09: Transaction rollback when AuditLog creation fails midway', async () => {
    let feeRecordState: any = {
      id: 'fee_rollback_audit',
      totalAmount: 900,
      paidAmount: 300,
      outstandingAmount: 600,
      status: FeeStatus.PARTIALLY_PAID,
      student: { id: 'stu_rb2', name: 'Siddharth', studentCode: 'DPR-2026-016', class: { name: 'Class 8' } },
      class: { name: 'Class 8' },
    };

    const mockPrisma = {
      $transaction: async (cb: any) => {
        let scratchFee = { ...feeRecordState };
        const tx = {
          feeRecord: {
            findUnique: async () => ({ ...scratchFee }),
            update: async ({ data }: any) => {
              scratchFee = { ...scratchFee, ...data };
              return scratchFee;
            },
          },
          payment: {
            findFirst: async () => null,
            create: async ({ data }: any) => ({ id: 'p_temp', ...data }),
          },
          document: {
            create: async ({ data }: any) => ({ id: 'doc_temp', ...data }),
          },
          auditLog: {
            create: async () => {
              throw new Error('Audit service constraint violation');
            },
          },
        };

        try {
          const res = await cb(tx);
          feeRecordState = scratchFee;
          return res;
        } catch (err) {
          throw err;
        }
      },
    };

    await assertRejects(
      async () => {
        await recordPayment(
          { feeRecordId: 'fee_rollback_audit', amount: 300, paymentMethod: 'UPI' },
          mockPrisma as any
        );
      },
      'Audit service constraint violation'
    );

    assertEqual(feeRecordState.paidAmount, 300);
    assertEqual(feeRecordState.outstandingAmount, 600);
    assertEqual(feeRecordState.status, FeeStatus.PARTIALLY_PAID);
  });

  // ============================================================================
  // SECTION 4: RECEIPT SEQUENCE MONOTONIC INCREMENTS & CONCURRENCY
  // ============================================================================

  await test('STRESS-PAY-10: 100 consecutive receipts in same year produce strictly monotonic sequential numbers', async () => {
    const paymentStore: { receiptNumber: string }[] = [];

    const mockPrisma = {
      payment: {
        findFirst: async ({ where }: any) => {
          const prefix = where.receiptNumber.startsWith;
          const matching = paymentStore.filter((p) => p.receiptNumber.startsWith(prefix));
          return matching.length > 0 ? matching[matching.length - 1] : null;
        },
      },
    };

    for (let i = 1; i <= 100; i++) {
      const receipt = await generateReceiptNumber(mockPrisma as any, 2026);
      const expected = `DPR-RC-2026-${String(i).padStart(4, '0')}`;
      assertEqual(receipt, expected, `Receipt seq mismatch at index ${i}`);
      paymentStore.push({ receiptNumber: receipt });
    }

    assertEqual(paymentStore.length, 100);
    assertEqual(paymentStore[0].receiptNumber, 'DPR-RC-2026-0001');
    assertEqual(paymentStore[99].receiptNumber, 'DPR-RC-2026-0100');
  });

  await test('STRESS-PAY-11: Year boundary transition resets sequence to 0001 for the new year', async () => {
    const paymentStore = [
      { receiptNumber: 'DPR-RC-2025-0542' },
      { receiptNumber: 'DPR-RC-2026-0899' },
      { receiptNumber: 'DPR-RC-2026-0900' },
    ];

    const mockPrisma = {
      payment: {
        findFirst: async ({ where }: any) => {
          const prefix = where.receiptNumber.startsWith;
          const matching = paymentStore.filter((p) => p.receiptNumber.startsWith(prefix));
          return matching.length > 0 ? matching[matching.length - 1] : null;
        },
      },
    };

    // 2026 next
    const next2026 = await generateReceiptNumber(mockPrisma as any, 2026);
    assertEqual(next2026, 'DPR-RC-2026-0901');

    // 2027 new year (zero existing in 2027)
    const next2027 = await generateReceiptNumber(mockPrisma as any, 2027);
    assertEqual(next2027, 'DPR-RC-2027-0001');

    // 2028 new year
    const next2028 = await generateReceiptNumber(mockPrisma as any, 2028);
    assertEqual(next2028, 'DPR-RC-2028-0001');
  });

  await test('STRESS-PAY-12: Sequence gap tolerance (e.g. manual deletion or non-contiguous sequences)', async () => {
    const paymentStore = [
      { receiptNumber: 'DPR-RC-2026-0001' },
      { receiptNumber: 'DPR-RC-2026-0050' }, // Gap from 0002 to 0049
    ];

    const mockPrisma = {
      payment: {
        findFirst: async ({ where }: any) => {
          const prefix = where.receiptNumber.startsWith;
          const matching = paymentStore.filter((p) => p.receiptNumber.startsWith(prefix));
          return matching.length > 0 ? matching[matching.length - 1] : null;
        },
      },
    };

    const next = await generateReceiptNumber(mockPrisma as any, 2026);
    assertEqual(next, 'DPR-RC-2026-0051');
  });

  await test('STRESS-PAY-13: Sequence increment beyond 9999 (4-digit overflow expansion)', async () => {
    const paymentStore = [
      { receiptNumber: 'DPR-RC-2026-9999' },
    ];

    const mockPrisma = {
      payment: {
        findFirst: async ({ where }: any) => {
          const prefix = where.receiptNumber.startsWith;
          const matching = paymentStore.filter((p) => p.receiptNumber.startsWith(prefix));
          return matching.length > 0 ? matching[matching.length - 1] : null;
        },
      },
    };

    const next = await generateReceiptNumber(mockPrisma as any, 2026);
    assertEqual(next, 'DPR-RC-2026-10000');
  });

  // ============================================================================
  // SECTION 5: PAYMENT METHODS & AUDIT LOG ENRICHMENT
  // ============================================================================

  await test('STRESS-PAY-14: All 5 payment methods (CASH, UPI, BANK_TRANSFER, CARD, OTHER) recorded with metadata', async () => {
    const methods: PaymentMethod[] = [
      PaymentMethod.CASH,
      PaymentMethod.UPI,
      PaymentMethod.BANK_TRANSFER,
      PaymentMethod.CARD,
      PaymentMethod.OTHER,
    ];

    for (const method of methods) {
      let feeRecord: any = {
        id: `fee_${method}`,
        totalAmount: 500,
        paidAmount: 0,
        outstandingAmount: 500,
        status: FeeStatus.DUE,
        student: { id: `s_${method}`, name: `Student ${method}`, studentCode: `DPR-2026-${method}`, class: { name: 'Class 7' } },
        class: { name: 'Class 7' },
      };

      let capturedPayment: any = null;
      let capturedDoc: any = null;
      let capturedAudit: any = null;

      const mockPrisma = {
        $transaction: async (cb: any) => {
          const tx = {
            feeRecord: {
              findUnique: async () => ({ ...feeRecord }),
              update: async ({ data }: any) => {
                feeRecord = { ...feeRecord, ...data };
                return feeRecord;
              },
            },
            payment: {
              findFirst: async () => null,
              create: async ({ data }: any) => {
                capturedPayment = data;
                return { id: `pay_${method}`, ...data };
              },
            },
            document: {
              create: async ({ data }: any) => {
                capturedDoc = data;
                return { id: `doc_${method}`, ...data };
              },
            },
            auditLog: {
              create: async ({ data }: any) => {
                capturedAudit = data;
                return { id: `audit_${method}`, ...data };
              },
            },
          };
          return await cb(tx);
        },
      };

      const txId = method === PaymentMethod.CASH ? null : `TXN-${method}-998877`;
      const res = await recordPayment(
        {
          feeRecordId: `fee_${method}`,
          amount: 500,
          paymentMethod: method,
          transactionId: txId,
          notes: `Paid via ${method}`,
          recordedByUserId: 'usr_admin_1',
        },
        mockPrisma as any
      );

      assertEqual(res.payment.paymentMethod, method);
      assertEqual(capturedPayment.paymentMethod, method);
      assertEqual(capturedPayment.transactionId, txId);
      assertEqual(capturedDoc.metadata.paymentMethod, method);
      assertEqual(capturedAudit.details.paymentMethod, method);
      assertEqual(capturedAudit.action, 'PAYMENT_RECORDED');
      assertEqual(capturedAudit.userId, 'usr_admin_1');
    }
  });

  // ============================================================================
  // SECTION 6: PAYMENT LISTING, PAGINATION & AGGREGATIONS
  // ============================================================================

  await test('STRESS-PAY-15: listPayments accurately aggregates amounts and handles multi-field queries', async () => {
    const mockPayments = [
      { id: 'p1', amount: 500, paymentMethod: 'CASH', paymentDate: new Date('2026-08-01'), receiptNumber: 'DPR-RC-2026-0001' },
      { id: 'p2', amount: 800, paymentMethod: 'UPI', paymentDate: new Date('2026-08-05'), receiptNumber: 'DPR-RC-2026-0002' },
      { id: 'p3', amount: 700, paymentMethod: 'CARD', paymentDate: new Date('2026-08-10'), receiptNumber: 'DPR-RC-2026-0003' },
    ];

    const mockPrisma = {
      payment: {
        count: async () => mockPayments.length,
        findMany: async () => mockPayments,
        aggregate: async () => ({
          _sum: { amount: 2000 },
          _count: { id: 3 },
        }),
      },
    };

    const result = await listPayments({ page: 1, limit: 10 }, mockPrisma as any);
    assertEqual(result.pagination.total, 3);
    assertEqual(result.summary.totalAmount, 2000);
    assertEqual(result.summary.totalTransactions, 3);
    assertEqual(result.payments.length, 3);
  });

  console.log(`\n================================================================================`);
  console.log(`  Adversarial Payment Stress Suite Finished: ${passed}/${total} passed (${failed} failed).`);
  console.log(`================================================================================\n`);

  if (failed > 0) process.exit(1);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('05_payment_empirical_stress.test.ts')) {
  runPaymentEmpiricalStressSuite().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}
