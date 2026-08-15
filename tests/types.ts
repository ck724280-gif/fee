/**
 * Core Type Definitions for 4-Tier Test Suite
 */

export interface TestResult {
  suiteName: string;
  testName: string;
  tier: number;
  passed: boolean;
  durationMs: number;
  error?: string;
  featureId?: number;
  featureName?: string;
}

export type TestFn = () => void | Promise<void>;

export interface TestCase {
  name: string;
  fn: TestFn;
  tier: number;
  featureId?: number;
  featureName?: string;
}

export interface TestSuite {
  name: string;
  tier: number;
  tests: TestCase[];
}

export interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  tierBreakdown: Record<number, { total: number; passed: number; failed: number }>;
  failures: TestResult[];
}
