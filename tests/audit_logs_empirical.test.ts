/**
 * Empirical Audit Log Query API & Service Verification Suite
 * Stress-tests src/lib/audit.ts and src/app/api/audit-logs/route.ts
 */

import { createAuditLog, listAuditLogs } from '../src/lib/audit';
import { GET as getAuditLogsRoute } from '../src/app/api/audit-logs/route';
import { NextRequest } from 'next/server';

// Lightweight in-memory test double for Prisma audit log client
class MockAuditPrismaClient {
  public logs: any[] = [];
  public users: any[] = [
    { id: 'usr_admin_1', email: 'admin@dprtuition.com', name: 'Super Admin', role: 'ADMIN' },
    { id: 'usr_staff_2', email: 'staff@dprtuition.com', name: 'Staff User', role: 'STAFF' },
  ];

  public auditLog = {
    create: async ({ data }: { data: any }) => {
      const record = {
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: data.userId || null,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId || null,
        details: data.details || null,
        ipAddress: data.ipAddress || null,
        timestamp: new Date(),
        user: this.users.find((u) => u.id === data.userId) || null,
      };
      this.logs.unshift(record); // newest first
      return record;
    },

    count: async ({ where }: { where: any }) => {
      return this.filterLogs(where).length;
    },

    findMany: async ({ where, skip = 0, take = 25, orderBy }: { where: any; skip?: number; take?: number; orderBy?: any }) => {
      const filtered = this.filterLogs(where);
      // Order by timestamp desc
      filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      return filtered.slice(skip, skip + take);
    },
  };

  private filterLogs(where: any = {}) {
    return this.logs.filter((log) => {
      if (where.action && log.action !== where.action) return false;
      if (where.entity && log.entity !== where.entity) return false;
      if (where.entityId && log.entityId !== where.entityId) return false;
      if (where.userId && log.userId !== where.userId) return false;

      if (where.timestamp) {
        if (where.timestamp.gte && log.timestamp < where.timestamp.gte) return false;
        if (where.timestamp.lte && log.timestamp > where.timestamp.lte) return false;
      }

      if (where.OR && Array.isArray(where.OR)) {
        const matchesOr = where.OR.some((clause: any) => {
          if (clause.action?.contains) {
            return log.action.toLowerCase().includes(clause.action.contains.toLowerCase());
          }
          if (clause.entity?.contains) {
            return log.entity.toLowerCase().includes(clause.entity.contains.toLowerCase());
          }
          if (clause.entityId?.contains) {
            return (log.entityId || '').toLowerCase().includes(clause.entityId.contains.toLowerCase());
          }
          return false;
        });
        if (!matchesOr) return false;
      }

      return true;
    });
  }
}

async function runAuditLogEmpiricalTests() {
  console.log('Starting Empirical Audit Log API & Service Test Suite...\n');
  const mockClient = new MockAuditPrismaClient();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`  ✖ FAIL: ${msg}`);
      failed++;
      throw new Error(`Assertion failed: ${msg}`);
    } else {
      console.log(`  ✔ PASS: ${msg}`);
      passed++;
    }
  }

  // --- Test Suite 1: createAuditLog ---
  console.log('▶ Test Suite 1: createAuditLog Contract');

  const entry1 = await createAuditLog({
    userId: 'usr_admin_1',
    action: 'STUDENT_CREATE',
    entity: 'Student',
    entityId: 'stu_101',
    details: { name: 'Aarav Sharma', class: 'Class 10', baseFee: 1200 },
    ipAddress: '192.168.1.50',
    prismaClient: mockClient as any,
  });

  assert(entry1 !== null, 'createAuditLog returns created record');
  assert(entry1?.action === 'STUDENT_CREATE', 'action field correctly assigned');
  assert(entry1?.entityId === 'stu_101', 'entityId field correctly assigned');
  assert(entry1?.details.name === 'Aarav Sharma', 'details json metadata preserved');
  assert(entry1?.ipAddress === '192.168.1.50', 'ipAddress recorded');

  // Test optional/nullable parameters
  const entry2 = await createAuditLog({
    action: 'LOGIN_FAILURE',
    entity: 'Auth',
    prismaClient: mockClient as any,
  });
  assert(entry2?.userId === null, 'userId defaults to null when omitted');
  assert(entry2?.entityId === null, 'entityId defaults to null when omitted');
  assert(entry2?.details === null, 'details defaults to null when omitted');
  assert(entry2?.ipAddress === null, 'ipAddress defaults to null when omitted');

  // Test Unicode and special characters
  const entry3 = await createAuditLog({
    userId: 'usr_admin_1',
    action: 'FEE_PAYMENT',
    entity: 'Payment',
    entityId: 'pay_999',
    details: {
      student: "Deblina Ghosh-Roy O'Connor",
      notes: 'Payment via UPI: ₹1,500 & reference #1234/XYZ <script>alert("xss")</script>',
    },
    prismaClient: mockClient as any,
  });
  assert(entry3?.details.student === "Deblina Ghosh-Roy O'Connor", 'Preserves quotes, hyphens, Unicode in details');
  assert(entry3?.details.notes.includes('₹1,500'), 'Preserves currency symbol in audit details');

  // --- Test Suite 2: listAuditLogs Filtering & Pagination ---
  console.log('\n▶ Test Suite 2: listAuditLogs Filter, Search & Pagination');

  // Populate 30 diverse audit records
  for (let i = 1; i <= 30; i++) {
    await createAuditLog({
      userId: i % 2 === 0 ? 'usr_admin_1' : 'usr_staff_2',
      action: i % 3 === 0 ? 'FEE_PAYMENT' : i % 3 === 1 ? 'STUDENT_CREATE' : 'CLASS_UPDATE',
      entity: i % 3 === 0 ? 'Payment' : i % 3 === 1 ? 'Student' : 'Class',
      entityId: `ent_${i}`,
      details: { index: i, amount: i * 100 },
      ipAddress: `10.0.0.${i}`,
      prismaClient: mockClient as any,
    });
  }

  // Test default pagination
  const page1 = await listAuditLogs({ page: 1, limit: 10 }, mockClient as any);
  assert(page1.logs.length === 10, 'page 1 returns exactly limit=10 records');
  assert(page1.pagination.total >= 33, 'pagination total matches overall count');
  assert(page1.pagination.totalPages >= 4, 'pagination totalPages calculated accurately');
  assert(page1.pagination.hasMore === true, 'hasMore is true when records remain');

  // Test Action filtering
  const paymentsOnly = await listAuditLogs({ action: 'FEE_PAYMENT' }, mockClient as any);
  assert(paymentsOnly.logs.every((l: any) => l.action === 'FEE_PAYMENT'), 'Filters exclusively by action=FEE_PAYMENT');

  // Test Entity filtering
  const studentsOnly = await listAuditLogs({ entity: 'Student' }, mockClient as any);
  assert(studentsOnly.logs.every((l: any) => l.entity === 'Student'), 'Filters exclusively by entity=Student');

  // Test EntityId filtering
  const singleEntity = await listAuditLogs({ entityId: 'ent_15' }, mockClient as any);
  assert(singleEntity.logs.length === 1 && singleEntity.logs[0].entityId === 'ent_15', 'Filters exact entityId');

  // Test User filtering
  const staffOnly = await listAuditLogs({ userId: 'usr_staff_2' }, mockClient as any);
  assert(staffOnly.logs.every((l: any) => l.userId === 'usr_staff_2'), 'Filters exclusively by userId');

  // Test Search query across action/entity/entityId
  const searchResults = await listAuditLogs({ search: 'ent_2' }, mockClient as any);
  assert(searchResults.logs.length > 0, 'Text search matches entityId pattern');
  assert(searchResults.logs.every((l: any) => l.entityId.includes('ent_2') || l.action.includes('ent_2')), 'Search matches valid fields');

  // --- Test Suite 3: NextRequest Route Handler GET /api/audit-logs ---
  console.log('\n▶ Test Suite 3: Route Handler GET /api/audit-logs Simulation');

  // Simulating NextRequest with searchParams
  const reqUrl = 'http://localhost:3000/api/audit-logs?page=2&limit=5&action=FEE_PAYMENT';
  const req = new NextRequest(reqUrl);

  const routeResponse = await getAuditLogsRoute(req);
  assert(routeResponse.status === 200, 'Route handler returns HTTP 200 OK');

  const jsonBody = await routeResponse.json();
  assert(jsonBody.success === true, 'Response body success is true');
  assert(Array.isArray(jsonBody.data), 'Response body data is an array of audit logs');
  assert(jsonBody.pagination.page === 2, 'Response pagination page matches requested page');
  assert(jsonBody.pagination.limit === 5, 'Response pagination limit matches requested limit');

  // Boundary condition: Invalid pagination params (NaN / negative values)
  const invalidParamsReq = new NextRequest('http://localhost:3000/api/audit-logs?page=-5&limit=abc');
  const invalidRouteResponse = await getAuditLogsRoute(invalidParamsReq);
  assert(invalidRouteResponse.status === 200, 'Invalid pagination strings gracefully fallback to defaults');
  const invalidBody = await invalidRouteResponse.json();
  assert(invalidBody.pagination.page === 1, 'Negative page falls back to 1');
  assert(invalidBody.pagination.limit === 25, 'NaN limit falls back to 25');

  // Boundary condition: Exceeding max limit (e.g. limit=500 clamped to 100)
  const excessiveLimitReq = new NextRequest('http://localhost:3000/api/audit-logs?limit=500');
  const excessiveResponse = await getAuditLogsRoute(excessiveLimitReq);
  const excessiveBody = await excessiveResponse.json();
  assert(excessiveBody.pagination.limit === 100, 'Excessive limit > 100 is clamped to 100 max');

  console.log(`\nAll Audit Log Empirical Tests Completed: ${passed} passed, ${failed} failed.\n`);
}

runAuditLogEmpiricalTests().catch((err) => {
  console.error('Fatal error in audit log test execution:', err);
  process.exit(1);
});
