/**
 * Tier 5 Adversarial Stress & Correctness Suite:
 * Payment Transactions, Document Tokens & PDF In-Memory Streaming
 * Author: Worker M3
 */

import { assertEqual, assertTrue, assertFalse, assertThrows } from '../assertions';
import {
  generateReceiptNumber,
  recordPayment,
  getPaymentById,
  listPayments,
} from '../../src/lib/payment-service';
import {
  createDocumentToken,
  verifyAndGetDocument,
  createReceiptDocumentToken,
  createReminderDocumentToken,
  getDocumentDataForRendering,
  DocumentNotFoundError,
  DocumentExpiredError,
} from '../../src/lib/document-service';
import { recordPaymentSchema, paymentFilterSchema } from '../../src/lib/validations/payment';
import { generateDocumentSchema, generateReminderDocSchema } from '../../src/lib/validations/document';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import ReceiptPDF from '../../src/components/pdf/ReceiptPDF';
import ReminderPDF from '../../src/components/pdf/ReminderPDF';
import { FeeStatus, PaymentMethod } from '@prisma/client';

export async function runPaymentDocumentAdversarialSuite() {
  console.log('\n======================================================================');
  console.log('  CHALLENGER 3 (M3): PAYMENT ENGINE & PDF STREAMING ADVERSARIAL SUITE');
  console.log('======================================================================\n');

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

  // --- SECTION 1: Payment Service & Transaction Invariants ---
  await test('ADV-PAY-01: Receipt number generator increments sequence monotonically per year', async () => {
    const payments = [
      { receiptNumber: 'DPR-RC-2026-0041' },
      { receiptNumber: 'DPR-RC-2026-0042' },
    ];
    const mockPrisma = {
      payment: {
        findFirst: async ({ where }: any) => {
          const prefix = where.receiptNumber.startsWith;
          const matching = payments.filter((p) => p.receiptNumber.startsWith(prefix));
          return matching[matching.length - 1] || null;
        },
      },
    };

    const next2026 = await generateReceiptNumber(mockPrisma as any, 2026);
    assertEqual(next2026, 'DPR-RC-2026-0043');

    const next2027 = await generateReceiptNumber(mockPrisma as any, 2027);
    assertEqual(next2027, 'DPR-RC-2027-0001');
  });

  await test('ADV-PAY-02: Overpayment guard strictly rejects amounts exceeding outstanding balance', async () => {
    let feeRecordState: any = {
      id: 'fee_1',
      studentId: 'stu_1',
      classId: 'cls_1',
      totalAmount: 800,
      paidAmount: 200,
      outstandingAmount: 600,
      status: FeeStatus.PARTIALLY_PAID,
      student: { id: 'stu_1', name: 'Rahul', studentCode: 'DPR-2026-001', class: { name: 'Class 8' } },
      class: { name: 'Class 8' },
    };

    const mockPrisma = {
      $transaction: async (cb: any) => {
        const tx = {
          feeRecord: {
            findUnique: async () => feeRecordState,
            update: async ({ data }: any) => {
              feeRecordState = { ...feeRecordState, ...data };
              return feeRecordState;
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

    let threw = false;
    try {
      await recordPayment({ feeRecordId: 'fee_1', amount: 650, paymentMethod: 'CASH' }, mockPrisma as any);
    } catch (err: any) {
      threw = true;
      assertTrue(err.message.includes('cannot exceed'));
      assertTrue(err.message.includes('600'));
    }
    assertTrue(threw);
    assertEqual(feeRecordState.paidAmount, 200);
    assertEqual(feeRecordState.outstandingAmount, 600);
  });

  await test('ADV-PAY-03: Exact full payment updates status to PAID and outstanding to 0', async () => {
    let feeRecordState: any = {
      id: 'fee_1',
      studentId: 'stu_1',
      classId: 'cls_1',
      totalAmount: 800,
      paidAmount: 200,
      outstandingAmount: 600,
      status: FeeStatus.PARTIALLY_PAID,
      student: { id: 'stu_1', name: 'Rahul', studentCode: 'DPR-2026-001', class: { name: 'Class 8' } },
      class: { name: 'Class 8' },
    };

    const mockPrisma = {
      $transaction: async (cb: any) => {
        const tx = {
          feeRecord: {
            findUnique: async () => feeRecordState,
            update: async ({ data }: any) => {
              feeRecordState = { ...feeRecordState, ...data };
              return feeRecordState;
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

    const result = await recordPayment({ feeRecordId: 'fee_1', amount: 600, paymentMethod: 'UPI', transactionId: 'UTR123' }, mockPrisma as any);
    assertEqual(result.feeRecord.paidAmount, 800);
    assertEqual(result.feeRecord.outstandingAmount, 0);
    assertEqual(result.feeRecord.status, FeeStatus.PAID);
    assertTrue(result.receiptNumber.startsWith('DPR-RC-'));
    assertTrue(result.documentUrl.startsWith('/api/documents/'));
  });

  // --- SECTION 2: Document Service & Expiration ---
  await test('ADV-DOC-01: Document token lookup throws 404 for nonexistent token and 410 for expired token', async () => {
    const expiredDoc = {
      id: 'd1',
      token: 'tok-expired',
      documentType: 'REMINDER',
      referenceId: 'f1',
      expiresAt: new Date('2026-01-01T00:00:00Z'),
    };

    const mockPrisma = {
      document: {
        findUnique: async ({ where }: any) => {
          if (where.token === 'tok-expired') return expiredDoc;
          return null;
        },
      },
    };

    // Nonexistent token throws DocumentNotFoundError
    let threw404 = false;
    try {
      await verifyAndGetDocument('tok-invalid', new Date(), mockPrisma as any);
    } catch (err: any) {
      threw404 = true;
      assertTrue(err instanceof DocumentNotFoundError || err.message.includes('404'));
    }
    assertTrue(threw404);

    // Expired token throws DocumentExpiredError
    let threw410 = false;
    try {
      await verifyAndGetDocument('tok-expired', new Date('2026-05-01T00:00:00Z'), mockPrisma as any);
    } catch (err: any) {
      threw410 = true;
      assertTrue(err instanceof DocumentExpiredError || err.message.includes('410'));
    }
    assertTrue(threw410);
  });

  // --- SECTION 3: @react-pdf/renderer Real PDF Buffer Generation ---
  await test('ADV-PDF-01: ReceiptPDF component renders genuine binary PDF buffer with %PDF header', async () => {
    const receiptData = {
      institute: {
        instituteName: 'DPR Private Tuition',
        tagline: 'Excellence in Academic Coaching & Guidance',
        address: 'Station Road, Near City Center, West Bengal',
        phone: '+91 98765 43210',
        email: 'info@dprtuition.com',
      },
      payment: {
        id: 'pay_123',
        receiptNumber: 'DPR-RC-2026-0001',
        amount: 800,
        paymentMethod: 'UPI',
        transactionId: 'UTR9988776655',
        paymentDate: new Date('2026-08-15'),
        notes: 'Advance tuition fee payment',
      },
      student: {
        studentCode: 'DPR-2026-008',
        name: 'Rahul Sharma',
        fatherName: 'Alok Sharma',
        mobile: '9876543210',
        className: 'Class 8',
      },
      feeRecord: {
        billingPeriodStart: new Date('2026-08-03'),
        billingPeriodEnd: new Date('2026-09-02'),
        dueDate: new Date('2026-09-03'),
        baseAmount: 800,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 800,
        paidAmount: 800,
        outstandingAmount: 0,
        status: 'PAID',
      },
      authorizedSignature: 'DPR Authorized Signatory',
    };

    const element = React.createElement(ReceiptPDF, { data: receiptData });
    const buffer = await renderToBuffer(element as any);

    assertFalse(!buffer);
    assertTrue(buffer.length > 500); // Typical PDF is several KB
    const pdfMagic = buffer.toString('utf8', 0, 5);
    assertEqual(pdfMagic, '%PDF-');
  });

  await test('ADV-PDF-02: ReminderPDF component renders genuine binary PDF buffer with %PDF header', async () => {
    const reminderData = {
      institute: {
        instituteName: 'DPR Private Tuition',
        tagline: 'Excellence in Academic Coaching & Guidance',
        address: 'Station Road, Near City Center, West Bengal',
        phone: '+91 98765 43210',
        email: 'info@dprtuition.com',
        upiId: 'dprtuition@upi',
      },
      student: {
        studentCode: 'DPR-2026-014',
        name: 'Priya Das',
        fatherName: 'Ashok Das',
        mobile: '9832144556',
        className: 'Class 7',
      },
      feeRecord: {
        billingPeriodStart: new Date('2026-07-18'),
        billingPeriodEnd: new Date('2026-08-17'),
        dueDate: new Date('2026-08-18'),
        baseAmount: 700,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 700,
        paidAmount: 200,
        outstandingAmount: 500,
        status: 'DUE',
      },
    };

    const element = React.createElement(ReminderPDF, { data: reminderData });
    const buffer = await renderToBuffer(element as any);

    assertFalse(!buffer);
    assertTrue(buffer.length > 500);
    const pdfMagic = buffer.toString('utf8', 0, 5);
    assertEqual(pdfMagic, '%PDF-');
  });

  // --- SECTION 4: Input Validation Schemas ---
  await test('ADV-VAL-01: recordPaymentSchema validates positive amounts, payment methods and trims strings', () => {
    const invalidAmount = recordPaymentSchema.safeParse({
      feeRecordId: 'fee_1',
      amount: -50,
      paymentMethod: 'CASH',
    });
    assertFalse(invalidAmount.success);

    const invalidMethod = recordPaymentSchema.safeParse({
      feeRecordId: 'fee_1',
      amount: 500,
      paymentMethod: 'BITCOIN',
    });
    assertFalse(invalidMethod.success);

    const valid = recordPaymentSchema.safeParse({
      feeRecordId: 'fee_1',
      amount: 500,
      paymentMethod: 'UPI',
      transactionId: '  UPI-UTR-998877  ',
    });
    assertTrue(valid.success);
    if (valid.success) {
      assertEqual(valid.data.transactionId, 'UPI-UTR-998877');
    }
  });

  await test('ADV-VAL-02: generateDocumentSchema validates document types and expiry days', () => {
    const badType = generateDocumentSchema.safeParse({
      documentType: 'UNKNOWN_DOC',
      referenceId: 'ref_1',
    });
    assertFalse(badType.success);

    const valid = generateDocumentSchema.safeParse({
      documentType: 'REMINDER',
      referenceId: 'fee_123',
      expiryDays: 14,
    });
    assertTrue(valid.success);
  });

  console.log(`\nAdversarial Payment & Document Suite: ${passed}/${total} passed (${failed} failed).\n`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('04_payment_document_adversarial.test.ts')) {
  runPaymentDocumentAdversarialSuite().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}
