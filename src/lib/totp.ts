import QRCode from 'qrcode';
import crypto from 'crypto';

const ENCRYPTION_KEY_STRING = process.env.TOTP_ENCRYPTION_KEY || 'edu-saas-totp-encryption-secret-32b-key!';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY_STRING).digest();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Base32 encoder for standard RFC 3548 / RFC 4648.
 */
function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Base32 decoder.
 */
function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;

    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates an RFC 6238 TOTP code for a secret and counter step.
 */
function generateHOTP(secretBuffer: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = code % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Generates a random Base32 secret string (20 bytes / 160 bits = 32 chars).
 */
export function generateSecret(): string {
  const bytes = crypto.randomBytes(20);
  return base32Encode(bytes);
}

/**
 * Generates standard OTPAuth Key URI.
 */
export function generateKeyUri(label: string, issuer: string, secret: string): string {
  const cleanIssuer = encodeURIComponent(issuer.trim());
  const cleanLabel = encodeURIComponent(label.trim());
  return `otpauth://totp/${cleanIssuer}:${cleanLabel}?secret=${secret}&issuer=${cleanIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Encrypts sensitive string (e.g. TOTP secret or recovery codes) using AES-256-GCM.
 */
export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM encrypted string.
 */
export function decryptSecret(encryptedPayload: string): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }
  const [ivHex, authTagHex, encryptedText] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Generates a new TOTP secret, otpauth keyuri, and QR Code Data URL.
 */
export async function generateTotpSetup(email: string, issuer: string = 'Education SaaS') {
  const secret = generateSecret();
  const otpauthUrl = generateKeyUri(email, issuer, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    margin: 2,
    width: 250,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  };
}

/**
 * Verifies a 6-digit TOTP code against a secret with time drift tolerance window.
 * Supports polymorphic argument order (token, secret) or (secret, token).
 * Default window = 2 (±60 seconds clock drift tolerance).
 */
export function verifyTotpCode(
  arg1: string,
  arg2: string,
  window: number = 2
): boolean {
  if (!arg1 || !arg2) return false;

  let token = '';
  let secret = '';

  if (/^\d{6}$/.test(arg1.trim())) {
    token = arg1.trim();
    secret = arg2.trim();
  } else {
    secret = arg1.trim();
    token = arg2.trim();
  }

  if (!/^\d{6}$/.test(token)) {
    return false;
  }

  const secretBuffer = base32Decode(secret);
  const currentStep = Math.floor(Date.now() / 1000 / 30);

  for (let i = -window; i <= window; i++) {
    const expected = generateHOTP(secretBuffer, currentStep + i);
    if (expected === token) {
      return true;
    }
  }

  return false;
}

/**
 * Generates 8 cryptographically secure single-use backup recovery codes.
 */
export function generateRecoveryCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const p1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const p2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    codes.push(`${p1}-${p2}`);
  }
  return codes;
}

/**
 * Verifies a recovery code against encrypted recovery codes array.
 * If valid, consumes (removes) the code and returns the new encrypted string and remaining count.
 */
export function verifyAndConsumeRecoveryCode(
  encryptedRecoveryCodesPayload: string,
  enteredCode: string
): { isValid: boolean; updatedEncryptedPayload?: string; remainingCount?: number } {
  try {
    if (!encryptedRecoveryCodesPayload || !enteredCode) {
      return { isValid: false };
    }

    const plainCodesJson = decryptSecret(encryptedRecoveryCodesPayload);
    const codes: string[] = JSON.parse(plainCodesJson);

    // Normalize code format (e.g. A1B2-C3D4 or a1b2c3d4)
    const rawClean = enteredCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const codeIndex = codes.findIndex((c) => c.replace(/[^A-Z0-9]/g, '') === rawClean);

    if (codeIndex === -1) {
      return { isValid: false };
    }

    // Remove single-use code
    codes.splice(codeIndex, 1);
    const updatedEncryptedPayload = encryptSecret(JSON.stringify(codes));

    return {
      isValid: true,
      updatedEncryptedPayload,
      remainingCount: codes.length,
    };
  } catch (error) {
    console.error('Error verifying recovery code:', error);
    return { isValid: false };
  }
}

export const TotpEngine = {
  generateSecret,
  generateKeyUri,
  encryptSecret,
  decryptSecret,
  generateTotpSetup,
  verifyTotpCode,
  generateRecoveryCodes,
  verifyAndConsumeRecoveryCode,
};

export default TotpEngine;
