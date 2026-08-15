/**
 * Comprehensive Assertion Utilities for DPR Fee Management Test Suite
 */

export class AssertionError extends Error {
  constructor(message: string, public actual?: any, public expected?: any) {
    super(message);
    this.name = 'AssertionError';
  }
}

export function assert(condition: boolean, message?: string): void {
  if (!condition) {
    throw new AssertionError(message || 'Assertion failed: expected true, got false', false, true);
  }
}

export function assertTrue(val: any, message?: string): void {
  if (val !== true) {
    throw new AssertionError(message || `Expected true, got ${JSON.stringify(val)}`, val, true);
  }
}

export function assertFalse(val: any, message?: string): void {
  if (val !== false) {
    throw new AssertionError(message || `Expected false, got ${JSON.stringify(val)}`, val, false);
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new AssertionError(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      actual,
      expected
    );
  }
}

export function assertNotEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual === expected) {
    throw new AssertionError(
      message || `Expected value to differ from ${JSON.stringify(expected)}, but got equal values`,
      actual,
      expected
    );
  }
}

export function assertDeepEqual(actual: any, expected: any, message?: string): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new AssertionError(
      message || `Deep equal mismatch:\nExpected: ${expectedStr}\nActual:   ${actualStr}`,
      actual,
      expected
    );
  }
}

export function assertApprox(actual: number, expected: number, tolerance = 0.001, message?: string): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new AssertionError(
      message || `Expected ${actual} to be approximately ${expected} (within ±${tolerance})`,
      actual,
      expected
    );
  }
}

export function assertMatches(actual: string, regex: RegExp, message?: string): void {
  if (!regex.test(actual)) {
    throw new AssertionError(
      message || `String "${actual}" did not match pattern ${regex}`,
      actual,
      regex.toString()
    );
  }
}

export function assertContains(actual: string | any[], expected: any, message?: string): void {
  if (typeof actual === 'string') {
    if (!actual.includes(String(expected))) {
      throw new AssertionError(
        message || `Expected string "${actual}" to contain "${expected}"`,
        actual,
        expected
      );
    }
  } else if (Array.isArray(actual)) {
    if (!actual.some((item) => JSON.stringify(item) === JSON.stringify(expected) || item === expected)) {
      throw new AssertionError(
        message || `Expected array ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`,
        actual,
        expected
      );
    }
  } else {
    throw new AssertionError('assertContains requires string or array as first argument');
  }
}

export function assertDefined<T>(val: T | null | undefined, message?: string): asserts val is T {
  if (val === undefined || val === null) {
    throw new AssertionError(message || `Expected value to be defined, got ${val}`);
  }
}

export function assertNull(val: any, message?: string): void {
  if (val !== null) {
    throw new AssertionError(message || `Expected null, got ${JSON.stringify(val)}`, val, null);
  }
}

export function assertThrows(fn: () => any, expectedErrorSubstring?: string, message?: string): void {
  let threw = false;
  let errorObj: any = null;
  try {
    fn();
  } catch (err: any) {
    threw = true;
    errorObj = err;
  }

  if (!threw) {
    throw new AssertionError(message || 'Expected function to throw an error, but it returned normally');
  }

  if (expectedErrorSubstring && errorObj) {
    const errorMsg = errorObj.message || String(errorObj);
    if (!errorMsg.toLowerCase().includes(expectedErrorSubstring.toLowerCase())) {
      throw new AssertionError(
        message || `Expected error message to contain "${expectedErrorSubstring}", got "${errorMsg}"`,
        errorMsg,
        expectedErrorSubstring
      );
    }
  }
}

export async function assertRejects(
  fn: () => Promise<any>,
  expectedErrorSubstring?: string,
  message?: string
): Promise<void> {
  let threw = false;
  let errorObj: any = null;
  try {
    await fn();
  } catch (err: any) {
    threw = true;
    errorObj = err;
  }

  if (!threw) {
    throw new AssertionError(message || 'Expected async function to reject, but it resolved successfully');
  }

  if (expectedErrorSubstring && errorObj) {
    const errorMsg = errorObj.message || String(errorObj);
    if (!errorMsg.toLowerCase().includes(expectedErrorSubstring.toLowerCase())) {
      throw new AssertionError(
        message || `Expected rejection message to contain "${expectedErrorSubstring}", got "${errorMsg}"`,
        errorMsg,
        expectedErrorSubstring
      );
    }
  }
}
