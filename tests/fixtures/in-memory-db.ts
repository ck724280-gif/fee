/**
 * In-Memory Transactional Database for Opaque-Box E2E Testing
 * Fully adheres to Prisma ORM 6 and Neon Serverless Database contracts.
 */

export interface InMemoryClass {
  id: string;
  name: string;
  defaultMonthlyFee: number;
  defaultAdmissionFee: number;
  lateFeeEnabled: boolean;
  lateFeeType: 'FIXED' | 'PER_DAY';
  lateFeeAmount: number;
  graceDays: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

export interface InMemoryStudent {
  id: string;
  studentCode: string;
  name: string;
  fatherName?: string | null;
  motherName?: string | null;
  guardianName?: string | null;
  mobile: string;
  whatsappNumber?: string | null;
  address?: string | null;
  dob?: Date | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  school?: string | null;
  classId: string;
  admissionDate: Date;
  joiningDate: Date;
  feeMode: 'DEFAULT' | 'CUSTOM';
  customMonthlyFee?: number | null;
  admissionFee: number;
  discountType: 'NONE' | 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  status: 'ACTIVE' | 'INACTIVE' | 'LEFT' | 'COMPLETED';
  createdAt: Date;
  updatedAt: Date;
}

export interface InMemoryFeeRecord {
  id: string;
  studentId: string;
  classId: string;
  cycleIndex: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  dueDate: Date;
  baseAmount: number;
  admissionFeeAmount: number;
  discountAmount: number;
  lateFeeAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: 'UPCOMING' | 'DUE' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'WAIVED' | 'CANCELLED';
  classSnapshotFee: number;
  studentFeeModeSnapshot: 'DEFAULT' | 'CUSTOM';
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InMemoryPayment {
  id: string;
  feeRecordId: string;
  studentId: string;
  amount: number;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
  transactionId?: string | null;
  receiptNumber: string;
  paymentDate: Date;
  notes?: string | null;
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InMemoryDocument {
  id: string;
  token: string;
  documentType: 'RECEIPT' | 'REMINDER' | 'STATEMENT';
  entityId: string;
  metadata?: any;
  expiresAt?: Date | null;
  createdAt: Date;
}

export interface InMemoryAuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export interface InMemoryUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN';
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export class InMemoryDB {
  public users: InMemoryUser[] = [];
  public classes: InMemoryClass[] = [];
  public students: InMemoryStudent[] = [];
  public feeRecords: InMemoryFeeRecord[] = [];
  public payments: InMemoryPayment[] = [];
  public documents: InMemoryDocument[] = [];
  public auditLogs: InMemoryAuditLog[] = [];
  public settings: Record<string, any> = {};

  private generateId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
  }

  public clone(): InMemoryDB {
    const copy = new InMemoryDB();
    copy.users = this.users.map((u) => ({ ...u }));
    copy.classes = this.classes.map((c) => ({ ...c }));
    copy.students = this.students.map((s) => ({ ...s }));
    copy.feeRecords = this.feeRecords.map((f) => ({ ...f }));
    copy.payments = this.payments.map((p) => ({ ...p }));
    copy.documents = this.documents.map((d) => ({ ...d }));
    copy.auditLogs = this.auditLogs.map((a) => ({ ...a }));
    copy.settings = { ...this.settings };
    return copy;
  }

  public restore(backup: InMemoryDB): void {
    this.users = backup.users.map((u) => ({ ...u }));
    this.classes = backup.classes.map((c) => ({ ...c }));
    this.students = backup.students.map((s) => ({ ...s }));
    this.feeRecords = backup.feeRecords.map((f) => ({ ...f }));
    this.payments = backup.payments.map((p) => ({ ...p }));
    this.documents = backup.documents.map((d) => ({ ...d }));
    this.auditLogs = backup.auditLogs.map((a) => ({ ...a }));
    this.settings = { ...backup.settings };
  }

  public async $transaction<T>(action: (tx: InMemoryDB) => Promise<T>): Promise<T> {
    const backup = this.clone();
    try {
      const result = await action(this);
      return result;
    } catch (err) {
      this.restore(backup);
      throw err;
    }
  }

  // --- Classes ---
  public createClass(data: Omit<InMemoryClass, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): InMemoryClass {
    const cls: InMemoryClass = {
      id: data.id || this.generateId('cls'),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    this.classes.push(cls);
    return { ...cls };
  }

  public updateClass(id: string, data: Partial<InMemoryClass>): InMemoryClass {
    const idx = this.classes.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Class ${id} not found`);
    this.classes[idx] = { ...this.classes[idx], ...data, updatedAt: new Date() };
    return { ...this.classes[idx] };
  }

  // --- Students ---
  public createStudent(data: Omit<InMemoryStudent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): InMemoryStudent {
    if (this.students.some((s) => s.studentCode === data.studentCode)) {
      throw new Error(`Unique constraint failed on studentCode: ${data.studentCode}`);
    }
    const student: InMemoryStudent = {
      id: data.id || this.generateId('stu'),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    this.students.push(student);
    return { ...student };
  }

  public updateStudent(id: string, data: Partial<InMemoryStudent>): InMemoryStudent {
    const idx = this.students.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error(`Student ${id} not found`);
    this.students[idx] = { ...this.students[idx], ...data, updatedAt: new Date() };
    return { ...this.students[idx] };
  }

  // --- Fee Records ---
  public createFeeRecord(data: Omit<InMemoryFeeRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): InMemoryFeeRecord {
    const startStr = new Date(data.billingPeriodStart).toISOString().split('T')[0];
    const endStr = new Date(data.billingPeriodEnd).toISOString().split('T')[0];

    const duplicate = this.feeRecords.find((f) => {
      const fStart = new Date(f.billingPeriodStart).toISOString().split('T')[0];
      const fEnd = new Date(f.billingPeriodEnd).toISOString().split('T')[0];
      return f.studentId === data.studentId && fStart === startStr && fEnd === endStr;
    });

    if (duplicate) {
      throw new Error(`Unique constraint failed: Fee record already exists for student ${data.studentId} in period ${startStr} to ${endStr}`);
    }

    const feeRecord: InMemoryFeeRecord = {
      id: data.id || this.generateId('fee'),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    this.feeRecords.push(feeRecord);
    return { ...feeRecord };
  }

  public updateFeeRecord(id: string, data: Partial<InMemoryFeeRecord>): InMemoryFeeRecord {
    const idx = this.feeRecords.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error(`FeeRecord ${id} not found`);
    this.feeRecords[idx] = { ...this.feeRecords[idx], ...data, updatedAt: new Date() };
    return { ...this.feeRecords[idx] };
  }

  // --- Payments ---
  public createPayment(data: Omit<InMemoryPayment, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): InMemoryPayment {
    if (this.payments.some((p) => p.receiptNumber === data.receiptNumber)) {
      throw new Error(`Unique constraint failed on receiptNumber: ${data.receiptNumber}`);
    }
    const payment: InMemoryPayment = {
      id: data.id || this.generateId('pay'),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    this.payments.push(payment);
    return payment;
  }

  // --- Documents ---
  public createDocument(data: Omit<InMemoryDocument, 'id' | 'createdAt'> & { id?: string }): InMemoryDocument {
    if (this.documents.some((d) => d.token === data.token)) {
      throw new Error(`Unique constraint failed on document token: ${data.token}`);
    }
    const doc: InMemoryDocument = {
      id: data.id || this.generateId('doc'),
      createdAt: new Date(),
      ...data,
    };
    this.documents.push(doc);
    return doc;
  }

  // --- Audit Logs ---
  public createAuditLog(data: Omit<InMemoryAuditLog, 'id' | 'createdAt'> & { id?: string }): InMemoryAuditLog {
    const log: InMemoryAuditLog = {
      id: data.id || this.generateId('aud'),
      createdAt: new Date(),
      ...data,
    };
    this.auditLogs.push(log);
    return log;
  }

  // --- Helper to clear all ---
  public reset(): void {
    this.users = [];
    this.classes = [];
    this.students = [];
    this.feeRecords = [];
    this.payments = [];
    this.documents = [];
    this.auditLogs = [];
    this.settings = {};
  }
}
