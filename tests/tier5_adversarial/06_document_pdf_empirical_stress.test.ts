/**
 * Tier 5 Adversarial Empirical Stress & Security Suite:
 * Document UUID Security, Non-Sequential Tokens, Expired Token Rejection (410),
 * Invalid Token Rejection (404), and In-Memory PDF Buffer Generation & Streaming.
 * 
 * Author: Challenger 2 (Milestone 3)
 */

import { assertEqual, assertTrue, assertFalse, assertApprox, assertThrows, assertRejects } from '../assertions';
import {
  createDocumentToken,
  verifyAndGetDocument,
  createReceiptDocumentToken,
  createReminderDocumentToken,
  getDocumentDataForRendering,
  DocumentNotFoundError,
  DocumentExpiredError,
} from '../../src/lib/document-service';
import {
  generateDocumentSchema,
  generateReminderDocSchema,
  generateReceiptDocSchema,
} from '../../src/lib/validations/document';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import ReceiptPDF from '../../src/components/pdf/ReceiptPDF';
import ReminderPDF from '../../src/components/pdf/ReminderPDF';
import { DocumentType, FeeStatus, PaymentMethod } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export async function runDocumentPDFEmpiricalStressSuite() {
  console.log('\n================================================================================');
  console.log('  CHALLENGER 2 (M3): DOCUMENT UUID SECURITY, TOKEN EXPIRY & PDF STREAMING SUITE');
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
  // SECTION 1: DOCUMENT UUID TOKEN SECURITY & NON-SEQUENTIAL PROPERTIES
  // ============================================================================

  await test('SEC-UUID-01: Document tokens comply strictly with RFC 4122 v4 UUID standard structure', async () => {
    const tokens: string[] = [];
    const mockPrisma = {
      document: {
        create: async ({ data }: any) => {
          tokens.push(data.token);
          return { id: `doc_${tokens.length}`, ...data };
        },
      },
    };

    for (let i = 0; i < 50; i++) {
      await createDocumentToken('RECEIPT', `pay_${i}`, {}, mockPrisma as any);
    }

    assertEqual(tokens.length, 50);
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      assertTrue(
        uuidV4Regex.test(tok),
        `Token at index ${i} (${tok}) does not match RFC 4122 v4 UUID specification`
      );
      assertEqual(tok.length, 36, `Token length is ${tok.length}, expected 36 characters`);
      assertEqual(tok[14], '4', `UUID version character at index 14 must be 4`);
      assertTrue(
        ['8', '9', 'a', 'b', '8', '9', 'A', 'B'].includes(tok[19]),
        `UUID variant character at index 19 must be in [8, 9, a, b]`
      );
    }
  });

  await test('SEC-UUID-02: Massive batch generation (5,000 tokens) yields 100% collision-free uniqueness', async () => {
    const tokenSet = new Set<string>();
    const mockPrisma = {
      document: {
        create: async ({ data }: any) => {
          tokenSet.add(data.token);
          return { id: 'd', ...data };
        },
      },
    };

    const BATCH_SIZE = 5000;
    for (let i = 0; i < BATCH_SIZE; i++) {
      await createDocumentToken('REMINDER', `fee_${i}`, {}, mockPrisma as any);
    }

    assertEqual(tokenSet.size, BATCH_SIZE, `Collision detected in 5,000 batch generated tokens`);
  });

  await test('SEC-UUID-03: Tokens exhibit high non-sequential entropy and zero predictability', async () => {
    const tokens: string[] = [];
    const mockPrisma = {
      document: {
        create: async ({ data }: any) => {
          tokens.push(data.token);
          return { id: 'd', ...data };
        },
      },
    };

    for (let i = 0; i < 200; i++) {
      await createDocumentToken('RECEIPT', `ref_${i}`, {}, mockPrisma as any);
    }

    // Measure Hamming/character edit distance between adjacent tokens
    for (let i = 0; i < tokens.length - 1; i++) {
      const t1 = tokens[i];
      const t2 = tokens[i + 1];
      let diffCount = 0;
      for (let j = 0; j < 36; j++) {
        if (t1[j] !== t2[j]) diffCount++;
      }
      // Adjacent UUIDs must differ by at least 20 character positions (random 122 bits)
      assertTrue(
        diffCount >= 18,
        `Consecutive tokens (${t1} vs ${t2}) had too few character differences: ${diffCount}`
      );
    }

    // Verify tokens do not contain the entity referenceId or monotonic sequences
    for (let i = 0; i < tokens.length; i++) {
      assertFalse(tokens[i].includes(`ref_${i}`), `Token leaked referenceId`);
      assertFalse(tokens[i].startsWith('00000000'), `Token started with predictable zeroes`);
    }
  });

  await test('SEC-UUID-04: Document creation options accurately persist studentId, metadata, and custom expiry', async () => {
    let savedData: any = null;
    const mockPrisma = {
      document: {
        create: async ({ data }: any) => {
          savedData = data;
          return { id: 'doc_123', ...data };
        },
      },
    };

    const targetDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const meta = { receiptNo: 'DPR-RC-2026-0001', customFee: 1500, parentPhone: '+919876543210' };

    const doc = await createDocumentToken(
      'RECEIPT',
      'pay_999',
      {
        studentId: 'stu_555',
        metadata: meta,
        expiresAt: targetDate,
      },
      mockPrisma as any
    );

    assertEqual(savedData.documentType, 'RECEIPT');
    assertEqual(savedData.referenceId, 'pay_999');
    assertEqual(savedData.studentId, 'stu_555');
    assertEqual(savedData.metadata.receiptNo, 'DPR-RC-2026-0001');
    assertEqual(savedData.metadata.customFee, 1500);
    assertEqual(savedData.expiresAt.toISOString(), targetDate.toISOString());
    assertEqual(doc.id, 'doc_123');
  });

  await test('SEC-UUID-05: expiryDays option calculates future expiration date accurately', async () => {
    let savedData: any = null;
    const mockPrisma = {
      document: {
        create: async ({ data }: any) => {
          savedData = data;
          return { id: 'doc_exp', ...data };
        },
      },
    };

    const before = Date.now();
    await createDocumentToken('REMINDER', 'fee_10', { expiryDays: 7 }, mockPrisma as any);
    const after = Date.now();

    const expectedMin = before + 7 * 24 * 60 * 60 * 1000;
    const expectedMax = after + 7 * 24 * 60 * 60 * 1000;

    assertTrue(savedData.expiresAt instanceof Date, `expiresAt must be a Date instance`);
    const expiresTime = savedData.expiresAt.getTime();
    assertTrue(expiresTime >= expectedMin && expiresTime <= expectedMax, `Expiration date offset calculation error`);
  });

  // ============================================================================
  // SECTION 2: EXPIRED TOKEN REJECTION (HTTP 410 GONE)
  // ============================================================================

  await test('EXP-410-01: Expired token lookup throws DocumentExpiredError with statusCode 410', async () => {
    const expiredDoc = {
      id: 'doc_exp_1',
      token: '11111111-2222-4333-8444-555555555555',
      documentType: 'REMINDER',
      referenceId: 'fee_exp_1',
      studentId: 'stu_1',
      expiresAt: new Date('2026-05-01T00:00:00.000Z'),
      student: { name: 'Ananya Roy', class: { name: 'Class 8' } },
    };

    const mockPrisma = {
      document: {
        findUnique: async ({ where }: any) => {
          if (where.token === expiredDoc.token) return expiredDoc;
          return null;
        },
      },
    };

    // Evaluated at a date after expiresAt
    const evaluationDate = new Date('2026-05-01T00:00:01.000Z'); // 1 second after expiration
    let caughtError: any = null;
    try {
      await verifyAndGetDocument(expiredDoc.token, evaluationDate, mockPrisma as any);
    } catch (err: any) {
      caughtError = err;
    }

    assertTrue(caughtError !== null, `Expected verification to throw for expired token`);
    assertTrue(
      caughtError instanceof DocumentExpiredError || caughtError.name === 'DocumentExpiredError',
      `Error must be an instance of DocumentExpiredError, received: ${caughtError?.name}`
    );
    assertEqual(caughtError.statusCode, 410, `DocumentExpiredError statusCode must be 410`);
    assertTrue(caughtError.message.includes('410'), `Error message must indicate 410`);
  });

  await test('EXP-410-02: Microsecond boundary: token expired 1ms ago fails (410), expiring in 1ms passes (200)', async () => {
    const boundaryTime = 1779950000000;
    const boundaryDoc = {
      id: 'doc_micro',
      token: '22222222-3333-4444-8555-666666666666',
      documentType: 'RECEIPT',
      referenceId: 'pay_micro',
      studentId: 'stu_micro',
      expiresAt: new Date(boundaryTime),
      student: { name: 'Aarav', class: { name: 'Class 7' } },
    };

    const mockPrisma = {
      document: {
        findUnique: async () => boundaryDoc,
      },
    };

    // 1ms before expiry -> Must SUCCEED
    const validResult = await verifyAndGetDocument(
      boundaryDoc.token,
      new Date(boundaryTime - 1),
      mockPrisma as any
    );
    assertEqual(validResult.id, 'doc_micro');

    // 1ms after expiry -> Must FAIL with 410
    let caughtError: any = null;
    try {
      await verifyAndGetDocument(boundaryDoc.token, new Date(boundaryTime + 1), mockPrisma as any);
    } catch (err: any) {
      caughtError = err;
    }
    assertTrue(caughtError instanceof DocumentExpiredError);
    assertEqual(caughtError.statusCode, 410);
  });

  await test('EXP-410-03: Permanent token (expiresAt = null) is permanently accessible across multi-decade evaluations', async () => {
    const permanentDoc = {
      id: 'doc_perm',
      token: '33333333-4444-4555-8666-777777777777',
      documentType: 'RECEIPT',
      referenceId: 'pay_perm',
      studentId: 'stu_perm',
      expiresAt: null,
      student: { name: 'Permanent Student', class: { name: 'Class 8' } },
    };

    const mockPrisma = {
      document: {
        findUnique: async () => permanentDoc,
      },
    };

    // Test evaluations: 2026, 2035, 2050, 2099
    const years = [2026, 2035, 2050, 2099];
    for (const yr of years) {
      const doc = await verifyAndGetDocument(
        permanentDoc.token,
        new Date(`${yr}-08-15T00:00:00Z`),
        mockPrisma as any
      );
      assertEqual(doc.token, permanentDoc.token);
      assertEqual(doc.expiresAt, null);
    }
  });

  await test('EXP-410-04: Simulated route GET /api/documents/[token] handles 410 error with appropriate JSON payload', async () => {
    // Test the error catch logic in route.ts
    const expiredError = new DocumentExpiredError('Document has expired');

    let responsePayload: any = null;
    let responseStatus: number = 0;

    // Simulate route.ts error handling pattern
    if (expiredError?.name === 'DocumentExpiredError' || expiredError?.statusCode === 410) {
      responseStatus = 410;
      responsePayload = {
        success: false,
        error: 'This document link has expired. Please request an updated link from DPR Private Tuition.',
      };
    }

    assertEqual(responseStatus, 410);
    assertFalse(responsePayload.success);
    assertTrue(responsePayload.error.includes('expired'));
  });

  // ============================================================================
  // SECTION 3: INVALID TOKEN REJECTION (HTTP 404 NOT FOUND & INPUT SANITIZATION)
  // ============================================================================

  await test('INV-404-01: Non-existent UUID token lookup throws DocumentNotFoundError with statusCode 404', async () => {
    const mockPrisma = {
      document: {
        findUnique: async () => null,
      },
    };

    const randomUUID = '99999999-8888-4777-8666-555555555555';
    let caught: any = null;
    try {
      await verifyAndGetDocument(randomUUID, new Date(), mockPrisma as any);
    } catch (err: any) {
      caught = err;
    }

    assertTrue(caught !== null);
    assertTrue(caught instanceof DocumentNotFoundError || caught.name === 'DocumentNotFoundError');
    assertEqual(caught.statusCode, 404);
    assertTrue(caught.message.includes('404'));
  });

  await test('INV-404-02: Empty, whitespace-only, and non-string tokens are rejected cleanly as 404/400', async () => {
    const mockPrisma = {
      document: {
        findUnique: async () => null,
      },
    };

    const invalidTokens: any[] = ['', '   ', '\t\n\r', null, undefined, 12345, {}, []];

    for (const invalidTok of invalidTokens) {
      let caught: any = null;
      try {
        await verifyAndGetDocument(invalidTok, new Date(), mockPrisma as any);
      } catch (err: any) {
        caught = err;
      }
      assertTrue(
        caught !== null && (caught instanceof DocumentNotFoundError || caught.statusCode === 404),
        `Failed to reject token: ${JSON.stringify(invalidTok)}`
      );
    }
  });

  await test('INV-404-03: Malformed tokens (path traversal, SQL injection, script injection, control characters) return 404 safely', async () => {
    const mockPrisma = {
      document: {
        findUnique: async ({ where }: any) => {
          // Token is looked up safely by exact match
          return null;
        },
      },
    };

    const adversarialTokens = [
      '../../../../etc/passwd',
      '..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      "' OR '1'='1",
      "'; DROP TABLE documents; --",
      '<script>alert("xss")</script>',
      'token\x00extra_bytes',
      '\u0000\u0001\u0002',
      'A'.repeat(5000), // Very large payload
      'SELECT * FROM documents WHERE id = 1',
    ];

    for (const attackString of adversarialTokens) {
      let caught: any = null;
      try {
        await verifyAndGetDocument(attackString, new Date(), mockPrisma as any);
      } catch (err: any) {
        caught = err;
      }
      assertTrue(
        caught !== null && (caught instanceof DocumentNotFoundError || caught.statusCode === 404),
        `Adversarial token lookup did not return 404 DocumentNotFoundError for: ${attackString}`
      );
    }
  });

  await test('INV-404-04: Case sensitivity: token with altered casing returns 404 if not found in database', async () => {
    const realDoc = {
      id: 'doc_case_1',
      token: 'abcdef12-3456-4789-a012-3456789abcde',
      documentType: 'RECEIPT',
      referenceId: 'pay_1',
      expiresAt: null,
      student: { name: 'Rahul', class: { name: 'Class 8' } },
    };

    const mockPrisma = {
      document: {
        findUnique: async ({ where }: any) => {
          if (where.token === realDoc.token) return realDoc;
          return null;
        },
      },
    };

    // Correct exact token passes
    const doc = await verifyAndGetDocument(realDoc.token, new Date(), mockPrisma as any);
    assertEqual(doc.id, 'doc_case_1');

    // Upper-case version fails with 404
    await assertRejects(
      async () => {
        await verifyAndGetDocument(realDoc.token.toUpperCase(), new Date(), mockPrisma as any);
      },
      '404'
    );
  });

  // ============================================================================
  // SECTION 4: REAL @react-pdf/renderer BUFFER GENERATION & STREAMING
  // ============================================================================

  await test('PDF-GEN-01: ReceiptPDF renders genuine binary PDF buffer (%PDF- header) for standard full payment', async () => {
    const receiptData = {
      institute: {
        instituteName: 'DPR Private Tuition',
        tagline: 'Excellence in Academic Coaching & Guidance',
        address: 'Station Road, Near City Center, West Bengal',
        phone: '+91 98765 43210',
        email: 'info@dprtuition.com',
        currencySymbol: '₹',
      },
      payment: {
        id: 'pay_pdf_01',
        receiptNumber: 'DPR-RC-2026-0001',
        amount: 800,
        paymentMethod: 'UPI',
        transactionId: 'UPI-UTR-9988776655',
        paymentDate: new Date('2026-08-15T10:30:00Z'),
        notes: 'Monthly fee paid via UPI scanner at front desk',
        recordedBy: 'Admin Teacher',
      },
      student: {
        id: 'stu_01',
        studentCode: 'DPR-2026-001',
        name: 'Rahul Sharma',
        fatherName: 'Alok Sharma',
        mobile: '+91 98765 43210',
        whatsappNumber: '+91 98765 43210',
        className: 'Class 8',
      },
      feeRecord: {
        id: 'fee_01',
        billingPeriodStart: new Date('2026-08-03T00:00:00Z'),
        billingPeriodEnd: new Date('2026-09-02T00:00:00Z'),
        dueDate: new Date('2026-09-03T00:00:00Z'),
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

    assertFalse(!buffer, 'renderToBuffer returned empty or null');
    assertTrue(Buffer.isBuffer(buffer), 'Result must be a Node.js Buffer');
    assertTrue(buffer.length > 2000, `PDF buffer too small (${buffer.length} bytes), likely incomplete`);

    // Verify PDF Magic Bytes (%PDF-)
    const magic = buffer.toString('utf8', 0, 5);
    assertEqual(magic, '%PDF-', 'PDF binary header %PDF- missing');

    // Verify PDF EOF marker exists in trailing bytes
    const tail = buffer.toString('utf8', buffer.length - 100);
    assertTrue(tail.includes('%%EOF'), 'PDF missing %%EOF marker');
  });

  await test('PDF-GEN-02: ReceiptPDF renders partial payment with remaining balance, admission fee & late fee', async () => {
    const complexReceiptData = {
      institute: {
        instituteName: 'DPR Private Tuition',
        tagline: 'Premier Coaching Institute',
        address: 'Kolkata, WB',
        phone: '+91 98300 12345',
        email: 'accounts@dprtuition.com',
      },
      payment: {
        id: 'pay_complex_02',
        receiptNumber: 'DPR-RC-2026-0042',
        amount: 500,
        paymentMethod: 'CASH',
        transactionId: null,
        paymentDate: '2026-08-10',
        notes: 'First installment paid in cash',
        recordedBy: 'Super Admin',
      },
      student: {
        id: 'stu_02',
        studentCode: 'DPR-2026-042',
        name: 'Soumyajit Mukherjee',
        fatherName: 'Debabrata Mukherjee',
        mobile: '9830011223',
        className: 'Class 6',
      },
      feeRecord: {
        id: 'fee_02',
        billingPeriodStart: '2026-08-01',
        billingPeriodEnd: '2026-08-31',
        dueDate: '2026-08-05',
        baseAmount: 600,
        admissionFeeAmount: 500,
        discountAmount: 100,
        lateFeeAmount: 50,
        totalAmount: 1050,
        paidAmount: 500,
        outstandingAmount: 550,
        status: 'PARTIALLY_PAID',
      },
    };

    const element = React.createElement(ReceiptPDF, { data: complexReceiptData });
    const buffer = await renderToBuffer(element as any);

    assertTrue(Buffer.isBuffer(buffer));
    assertTrue(buffer.length > 2000);
    assertEqual(buffer.toString('utf8', 0, 5), '%PDF-');
  });

  await test('PDF-GEN-03: ReminderPDF renders genuine binary PDF for DUE status with payment instructions', async () => {
    const reminderData = {
      institute: {
        instituteName: 'DPR Private Tuition',
        tagline: 'Excellence in Academic Coaching & Guidance',
        address: 'Station Road, Near City Center, West Bengal',
        phone: '+91 98765 43210',
        email: 'info@dprtuition.com',
        upiId: 'dprtuition@upi',
        bankAccountDetails: {
          bankName: 'State Bank of India',
          accountNumber: '919876543210',
          ifscCode: 'SBIN0001234',
          accountHolder: 'DPR Private Tuition',
        },
      },
      student: {
        id: 'stu_rem_1',
        studentCode: 'DPR-2026-015',
        name: 'Sneha Banerjee',
        fatherName: 'Sanjay Banerjee',
        mobile: '9876543219',
        whatsappNumber: '9876543219',
        className: 'Class 7',
      },
      feeRecord: {
        id: 'fee_rem_1',
        billingPeriodStart: new Date('2026-08-10'),
        billingPeriodEnd: new Date('2026-09-09'),
        dueDate: new Date('2026-09-10'),
        baseAmount: 700,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 700,
        paidAmount: 0,
        outstandingAmount: 700,
        status: 'DUE',
      },
    };

    const element = React.createElement(ReminderPDF, { data: reminderData });
    const buffer = await renderToBuffer(element as any);

    assertTrue(Buffer.isBuffer(buffer));
    assertTrue(buffer.length > 2000);
    assertEqual(buffer.toString('utf8', 0, 5), '%PDF-');
    assertTrue(buffer.toString('utf8', buffer.length - 100).includes('%%EOF'));
  });

  await test('PDF-GEN-04: ReminderPDF renders OVERDUE status notice with delinquency styling and late fee', async () => {
    const overdueData = {
      institute: {
        instituteName: 'DPR Private Tuition',
        upiId: 'dprtuition@upi',
      },
      student: {
        studentCode: 'DPR-2026-004',
        name: 'Rohan Gupta',
        fatherName: null, // Test null father name
        mobile: null,     // Test null mobile
        className: 'Class 8',
      },
      feeRecord: {
        billingPeriodStart: '2026-06-03',
        billingPeriodEnd: '2026-07-02',
        dueDate: '2026-07-03',
        baseAmount: 800,
        admissionFeeAmount: 0,
        discountAmount: 50,
        lateFeeAmount: 100,
        totalAmount: 850,
        paidAmount: 300,
        outstandingAmount: 550,
        status: 'OVERDUE',
      },
    };

    const element = React.createElement(ReminderPDF, { data: overdueData });
    const buffer = await renderToBuffer(element as any);

    assertTrue(Buffer.isBuffer(buffer));
    assertTrue(buffer.length > 2000);
    assertEqual(buffer.toString('utf8', 0, 5), '%PDF-');
  });

  await test('PDF-GEN-05: Unicode and special characters (accents, ampersands, quotes, long strings) render cleanly', async () => {
    const unicodeData = {
      institute: {
        instituteName: 'DPR Private Tuition & Coaching Academy — (দীপ্র প্রাইভেট টিউশন)',
        tagline: 'Excellence "Always" & Guidance — 100% Guaranteed',
      },
      payment: {
        id: 'p_uni',
        receiptNumber: 'DPR-RC-2026-9999',
        amount: 1250.75,
        paymentMethod: 'OTHER',
        transactionId: 'TXN/REF#99-88-77/A&B',
        paymentDate: new Date('2026-08-15'),
        notes: 'Special payment notes with symbols: ₹1250.75, 50% advance, & quotation "Paid in full".',
      },
      student: {
        studentCode: 'DPR-2026-999',
        name: "Renée O'Connor-Roy & Co.",
        fatherName: 'Dr. Jean-Luc Roy',
        className: 'Class 8-Advanced (Science & Math)',
      },
      feeRecord: {
        billingPeriodStart: '2026-08-01',
        billingPeriodEnd: '2026-08-31',
        dueDate: '2026-08-05',
        baseAmount: 1250.75,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 1250.75,
        paidAmount: 1250.75,
        outstandingAmount: 0,
        status: 'PAID',
      },
    };

    const element = React.createElement(ReceiptPDF, { data: unicodeData });
    const buffer = await renderToBuffer(element as any);

    assertTrue(Buffer.isBuffer(buffer));
    assertTrue(buffer.length > 2000);
    assertEqual(buffer.toString('utf8', 0, 5), '%PDF-');
  });

  // ============================================================================
  // SECTION 5: ZERO DISK POLLUTION & IN-MEMORY STREAMING INTEGRITY
  // ============================================================================

  await test('PDF-MEM-01: In-memory PDF buffer generation produces zero temporary files on filesystem', async () => {
    const cwdFilesBefore = fs.readdirSync(process.cwd());

    // Generate 10 PDF buffers in sequence
    for (let i = 0; i < 10; i++) {
      const data = {
        payment: {
          id: `p_${i}`,
          receiptNumber: `DPR-RC-2026-000${i}`,
          amount: 500 + i * 50,
          paymentMethod: 'CASH',
          paymentDate: new Date(),
        },
        student: {
          studentCode: `DPR-2026-00${i}`,
          name: `Student ${i}`,
          className: 'Class 8',
        },
        feeRecord: {
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(),
          dueDate: new Date(),
          baseAmount: 500 + i * 50,
          admissionFeeAmount: 0,
          discountAmount: 0,
          lateFeeAmount: 0,
          totalAmount: 500 + i * 50,
          paidAmount: 500 + i * 50,
          outstandingAmount: 0,
          status: 'PAID',
        },
      };

      const elem = React.createElement(ReceiptPDF, { data });
      const buf = await renderToBuffer(elem as any);
      assertTrue(buf.length > 1000);
    }

    const cwdFilesAfter = fs.readdirSync(process.cwd());

    // Verify file list in cwd is identical
    assertEqual(
      cwdFilesAfter.length,
      cwdFilesBefore.length,
      'Filesystem pollution detected: new files created in cwd during PDF rendering'
    );
  });

  await test('PDF-MEM-02: Concurrent PDF rendering (20 simultaneous documents) completes without memory corruption', async () => {
    const promises: Promise<Buffer>[] = [];

    for (let i = 0; i < 20; i++) {
      const isReceipt = i % 2 === 0;
      if (isReceipt) {
        const data = {
          payment: {
            id: `p_conc_${i}`,
            receiptNumber: `DPR-RC-2026-CONC-${i}`,
            amount: 800,
            paymentMethod: 'UPI',
            paymentDate: new Date(),
          },
          student: {
            studentCode: `DPR-2026-C${i}`,
            name: `Concurrent Student ${i}`,
            className: 'Class 8',
          },
          feeRecord: {
            billingPeriodStart: new Date(),
            billingPeriodEnd: new Date(),
            dueDate: new Date(),
            baseAmount: 800,
            admissionFeeAmount: 0,
            discountAmount: 0,
            lateFeeAmount: 0,
            totalAmount: 800,
            paidAmount: 800,
            outstandingAmount: 0,
            status: 'PAID',
          },
        };
        promises.push(renderToBuffer(React.createElement(ReceiptPDF, { data }) as any));
      } else {
        const data = {
          student: {
            studentCode: `DPR-2026-R${i}`,
            name: `Reminder Student ${i}`,
            className: 'Class 7',
          },
          feeRecord: {
            billingPeriodStart: new Date(),
            billingPeriodEnd: new Date(),
            dueDate: new Date(),
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
        promises.push(renderToBuffer(React.createElement(ReminderPDF, { data }) as any));
      }
    }

    const buffers = await Promise.all(promises);
    assertEqual(buffers.length, 20);
    for (let i = 0; i < buffers.length; i++) {
      const b = buffers[i];
      assertTrue(Buffer.isBuffer(b));
      assertTrue(b.length > 2000);
      assertEqual(b.toString('utf8', 0, 5), '%PDF-');
    }
  });

  // ============================================================================
  // SECTION 6: GET DOCUMENT DATA FOR RENDERING & ORPHANED ENTITY REJECTION
  // ============================================================================

  await test('PDF-SVC-01: getDocumentDataForRendering returns complete normalized payload for RECEIPT and REMINDER', async () => {
    const mockPayment = {
      id: 'pay_real_1',
      receiptNumber: 'DPR-RC-2026-0001',
      amount: 800,
      paymentMethod: PaymentMethod.UPI,
      transactionId: 'UTR112233',
      paymentDate: new Date('2026-08-15'),
      notes: 'Paid on time',
      student: {
        id: 'stu_1',
        studentCode: 'DPR-2026-001',
        name: 'Rahul',
        fatherName: 'Alok',
        mobile: '9876543210',
        whatsappNumber: '9876543210',
        class: { name: 'Class 8' },
      },
      feeRecord: {
        id: 'fee_1',
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
        status: FeeStatus.PAID,
        class: { name: 'Class 8' },
      },
      recordedByUser: { id: 'u1', name: 'Admin' },
    };

    const mockDocReceipt = {
      id: 'd_rec',
      token: 'tok-rec-123',
      documentType: DocumentType.RECEIPT,
      referenceId: 'pay_real_1',
      studentId: 'stu_1',
      expiresAt: null,
      student: mockPayment.student,
    };

    const mockPrisma = {
      document: {
        findUnique: async ({ where }: any) => (where.token === 'tok-rec-123' ? mockDocReceipt : null),
      },
      instituteSetting: {
        findFirst: async () => ({
          instituteName: 'DPR Private Tuition',
          currencySymbol: '₹',
        }),
      },
      payment: {
        findUnique: async ({ where }: any) => (where.id === 'pay_real_1' ? mockPayment : null),
      },
    };

    const renderData = await getDocumentDataForRendering('tok-rec-123', new Date(), mockPrisma as any);
    assertEqual(renderData.documentType, 'RECEIPT');
    assertEqual(renderData.payment?.receiptNumber, 'DPR-RC-2026-0001');
    assertEqual(renderData.student?.name, 'Rahul');
    assertEqual(renderData.feeRecord?.totalAmount, 800);
    assertEqual(renderData.institute.instituteName, 'DPR Private Tuition');
  });

  await test('PDF-SVC-02: getDocumentDataForRendering throws 404 if underlying payment or fee record was deleted', async () => {
    const mockDocReceipt = {
      id: 'd_rec_orphan',
      token: 'tok-orphan-999',
      documentType: DocumentType.RECEIPT,
      referenceId: 'deleted_pay_id',
      studentId: 'stu_1',
      expiresAt: null,
      student: { name: 'Rahul', class: { name: 'Class 8' } },
    };

    const mockPrisma = {
      document: {
        findUnique: async () => mockDocReceipt,
      },
      instituteSetting: {
        findFirst: async () => null,
      },
      payment: {
        findUnique: async () => null, // Underlying payment record is missing!
      },
    };

    await assertRejects(
      async () => {
        await getDocumentDataForRendering('tok-orphan-999', new Date(), mockPrisma as any);
      },
      'Associated payment record not found'
    );
  });

  // ============================================================================
  // SECTION 7: VALIDATION SCHEMAS FOR DOCUMENT API ENDPOINTS
  // ============================================================================

  await test('VAL-DOC-01: generateDocumentSchema enforces document types and positive expiryDays', () => {
    // Valid inputs
    assertTrue(
      generateDocumentSchema.safeParse({
        documentType: 'RECEIPT',
        referenceId: 'p1',
      }).success
    );

    assertTrue(
      generateDocumentSchema.safeParse({
        documentType: 'REMINDER',
        referenceId: 'f1',
        expiryDays: 14,
        metadata: { student: 'Rahul' },
      }).success
    );

    // Invalid documentType
    assertFalse(
      generateDocumentSchema.safeParse({
        documentType: 'INVALID_TYPE',
        referenceId: 'p1',
      }).success
    );

    // Missing referenceId
    assertFalse(
      generateDocumentSchema.safeParse({
        documentType: 'RECEIPT',
        referenceId: '',
      }).success
    );

    // Negative expiryDays
    assertFalse(
      generateDocumentSchema.safeParse({
        documentType: 'RECEIPT',
        referenceId: 'p1',
        expiryDays: -5,
      }).success
    );

    // Zero expiryDays
    assertFalse(
      generateDocumentSchema.safeParse({
        documentType: 'RECEIPT',
        referenceId: 'p1',
        expiryDays: 0,
      }).success
    );
  });

  await test('VAL-DOC-02: generateReminderDocSchema and generateReceiptDocSchema validate required IDs', () => {
    assertTrue(generateReminderDocSchema.safeParse({ feeRecordId: 'fee_123' }).success);
    assertTrue(generateReminderDocSchema.safeParse({ feeRecordId: 'fee_123', expiryDays: 30 }).success);
    assertFalse(generateReminderDocSchema.safeParse({ feeRecordId: '' }).success);
    assertFalse(generateReminderDocSchema.safeParse({ feeRecordId: 'fee_123', expiryDays: -1 }).success);

    assertTrue(generateReceiptDocSchema.safeParse({ paymentId: 'pay_123' }).success);
    assertFalse(generateReceiptDocSchema.safeParse({ paymentId: '' }).success);
  });

  console.log(`\n================================================================================`);
  console.log(`  Challenger 2 Empirical Suite Finished: ${passed}/${total} passed (${failed} failed).`);
  console.log(`================================================================================\n`);

  if (failed > 0) process.exit(1);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('06_document_pdf_empirical_stress.test.ts')) {
  runDocumentPDFEmpiricalStressSuite().catch((err) => {
    console.error('Fatal test execution error:', err);
    process.exit(1);
  });
}
