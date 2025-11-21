/**
 * Cryptographic utilities for @hixbe/sig
 */

import * as crypto from 'crypto';
import { Algorithm } from './types';

/**
 * Generate cryptographically secure random bytes
 */
export function generateRandomBytes(length: number): Buffer {
  return crypto.randomBytes(length);
}

/**
 * Generate random salt
 */
export function generateRandomSalt(length: number = 32): string {
  return generateRandomBytes(length).toString('hex');
}

/**
 * Hash data using specified algorithm
 */
export function hashData(data: string | Buffer, algorithm: Algorithm): Buffer {
  switch (algorithm) {
    case 'sha256':
      return crypto.createHash('sha256').update(data).digest();
    case 'sha512':
      return crypto.createHash('sha512').update(data).digest();
    case 'sha3-256':
      return crypto.createHash('sha3-256').update(data).digest();
    case 'sha3-512':
      return crypto.createHash('sha3-512').update(data).digest();
    case 'blake2b512':
      return crypto.createHash('blake2b512').update(data).digest();
    case 'shake256':
      // XOF - eXtendable-Output Function
      return crypto.createHash('shake256', { outputLength: 64 }).update(data).digest();
    default:
      return crypto.createHash('sha256').update(data).digest();
  }
}

/**
 * HMAC signing
 */
export function hmacSign(data: string | Buffer, secret: string, algorithm: Algorithm): Buffer {
  // SHAKE256 doesn't support HMAC directly, use SHA3-256 instead
  if (algorithm === 'shake256') {
    return crypto.createHmac('sha3-256', secret).update(data).digest();
  }

  const hmacAlgorithm = algorithm.startsWith('sha3-')
    ? algorithm
    : algorithm === 'blake2b512'
      ? 'blake2b512'
      : `sha${algorithm.replace('sha', '')}`;

  return crypto.createHmac(hmacAlgorithm, secret).update(data).digest();
}

/**
 * HKDF key derivation
 */
export function deriveKey(
  secret: string,
  salt: string,
  pepper: string,
  algorithm: Algorithm
): Buffer {
  const info = 'hixbe-sig-v1';
  const keyLength = 32;
  const hashAlg = algorithm.startsWith('sha3-')
    ? 'sha256'
    : algorithm === 'blake2b512'
      ? 'sha512'
      : algorithm;

  return Buffer.from(
    crypto.hkdfSync(hashAlg.replace(/sha3-|shake/, 'sha'), secret + pepper, salt, info, keyLength)
  );
}

/**
 * Memory-hard key derivation (Argon2-like using PBKDF2)
 */
export function memoryHardDerive(
  input: string,
  secret: string,
  iterations: number = 100000
): Buffer {
  return crypto.pbkdf2Sync(input, secret, iterations, 64, 'sha512');
}

/**
 * Timing-safe comparison
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Convert buffer to base encoding
 */
export function bufferToBase(buffer: Buffer, charset: string, length: number): string {
  let result = '';
  const base = charset.length;
  let num = BigInt('0x' + buffer.toString('hex'));

  while (num > 0 && result.length < length) {
    const remainder = Number(num % BigInt(base));
    result = charset[remainder] + result;
    num = num / BigInt(base);
  }

  // Pad with random chars if needed
  while (result.length < length) {
    const randomIndex = crypto.randomInt(0, charset.length);
    result = charset[randomIndex] + result;
  }

  return result.slice(0, length);
}

/**
 * Get default charset based on options
 */
export function getCharset(avoidAmbiguous: boolean = false, enforceCharset?: string): string {
  if (enforceCharset) {
    return enforceCharset;
  }

  if (avoidAmbiguous) {
    return 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz';
  }

  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
}

/**
 * Apply case formatting
 */
export function applyCase(str: string, caseType: 'upper' | 'lower' | 'mixed'): string {
  switch (caseType) {
    case 'upper':
      return str.toUpperCase();
    case 'lower':
      return str.toLowerCase();
    case 'mixed':
    default:
      return str;
  }
}

/**
 * Generate timestamp embed
 */
export function generateTimestamp(): string {
  return Date.now().toString(36);
}

/**
 * Counter management (simple in-memory)
 */
let globalCounter = 0;
export function getCounter(): number {
  return globalCounter++;
}

export function resetCounter(): void {
  globalCounter = 0;
}
