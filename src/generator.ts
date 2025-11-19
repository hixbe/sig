/**
 * Core ID generation engine for @webx/sig
 */

import {
  generateRandomBytes,
  hashData,
  hmacSign,
  deriveKey,
  memoryHardDerive,
  bufferToBase,
  getCharset,
  applyCase,
  generateTimestamp,
  getCounter,
} from './crypto-utils';
import { SecureIdOptions, Algorithm } from './types';
import {
  checkRateLimit,
  getPooledEntropy,
  secureDelete,
  checkCollision,
  recordCollision,
  logAudit,
  createAuditEvent,
  embedExpiry,
  embedGeoRegion,
  embedDeviceId,
  embedHiddenData,
  getQuantumRandomBytes,
  postQuantumSign,
} from './advanced-security';

/**
 * Generate quantum-safe cryptographically secure ID
 */
export async function generateId(options: SecureIdOptions = {}): Promise<string> {
  const {
    length = 32,
    algorithm = 'sha256',
    mode = 'random',
    case: caseType = 'upper',
    separator = '',
    separatorLength = 8,
    checksum = false,
    checksumCount = 1,
    checksumLength = 1,
    checksumPosition = 'end',
    prefix = '',
    suffix = '',
    secret = '',
    salt = '',
    pepper = '',
    security = {},
  } = options;

  const {
    enhanceEntropy = false,
    memoryHard = false,
    doubleHash = false,
    avoidAmbiguousChars = false,
    enforceCharset,
    reseed = false,
    timestampEmbed = false,
    counterEmbed = false,
    ttl,
    embedExpiry: embedExpiryFlag = false,
    rateLimit,
    collisionDetection,
    audit,
    embedGeo = false,
    geoRegion = '',
    deviceBinding = false,
    deviceId = '',
    useQuantumRNG = false,
    qrngProvider = 'local',
    steganography = false,
    hiddenData = '',
    secureDelete: secureDeleteFlag = false,
  } = security;

  // Warn if length is less than 8
  if (length < 8) {
    console.warn(
      `Warning: Specified length (${length}) is less than the recommended minimum of 8 characters. ` +
        `This may compromise security. The actual core ID will be at least 8 characters.`
    );
  }

  // Rate limiting check
  if (rateLimit) {
    if (!checkRateLimit(rateLimit)) {
      const error = new Error('Rate limit exceeded');
      if (audit?.enabled) {
        logAudit(createAuditEvent('generate', 'rate-limited', false, { reason: 'rate_limit' }));
      }
      throw error;
    }
  }

  // Validate requirements
  if ((mode === 'hmac' || mode === 'hmac-hash' || mode === 'memory-hard') && !secret) {
    throw new Error(`Secret is required for mode: ${mode}`);
  }

  if (embedExpiryFlag && !ttl) {
    throw new Error('TTL is required when embedExpiry is enabled');
  }

  if (deviceBinding && !deviceId) {
    throw new Error('deviceId is required when deviceBinding is enabled');
  }

  const charset = getCharset(avoidAmbiguousChars, enforceCharset);

  // Calculate actual ID length (excluding checksum, prefix, suffix, metadata)
  let coreIdLength = length;
  let metadataLength = 0;

  if (checksum) {
    const totalChecksumLength = checksumCount * checksumLength;
    metadataLength += totalChecksumLength;
  }
  if (embedExpiryFlag) metadataLength += 10;
  if (embedGeo) metadataLength += 8;
  if (deviceBinding) metadataLength += 12;

  coreIdLength = Math.max(8, length - metadataLength);

  // Embed timestamp/counter if requested
  let embedData = '';
  if (timestampEmbed) {
    embedData += generateTimestamp();
  }
  if (counterEmbed) {
    embedData += getCounter().toString(36);
  }
  if (embedExpiryFlag && ttl) {
    embedData += embedExpiry(ttl);
  }
  if (embedGeo && geoRegion) {
    embedData += embedGeoRegion(geoRegion);
  }
  if (deviceBinding && deviceId) {
    embedData += embedDeviceId(deviceId);
  }

  let idCore: string;

  // Handle post-quantum algorithms
  if (algorithm === 'kyber768' || algorithm === 'dilithium3') {
    const pqData = await generatePostQuantumId(coreIdLength, charset, algorithm, embedData);
    idCore = pqData;
  } else if (useQuantumRNG) {
    idCore = await generateQuantumRandomId(coreIdLength, charset, qrngProvider, embedData);
  } else {
    switch (mode) {
      case 'random':
        idCore = generateRandomId(coreIdLength, charset, enhanceEntropy, reseed);
        break;

      case 'hash':
        idCore = generateHashId(coreIdLength, charset, algorithm, embedData, doubleHash);
        break;

      case 'hmac':
        idCore = generateHmacId(coreIdLength, charset, secret, salt, pepper, algorithm, embedData);
        break;

      case 'hybrid':
        idCore = generateHybridId(
          coreIdLength,
          charset,
          algorithm,
          secret,
          salt,
          pepper,
          embedData
        );
        break;

      case 'hmac-hash':
        idCore = generateHmacHashId(
          coreIdLength,
          charset,
          algorithm,
          secret,
          salt,
          pepper,
          embedData,
          doubleHash
        );
        break;

      case 'memory-hard':
        idCore = generateMemoryHardId(coreIdLength, charset, secret, embedData, memoryHard);
        break;

      default:
        idCore = generateRandomId(coreIdLength, charset, enhanceEntropy, reseed);
    }
  }

  // Apply case formatting
  idCore = applyCase(idCore, caseType);

  // Add checksums if requested
  let finalId = idCore;
  if (checksum) {
    finalId = addChecksums(idCore, checksumCount, checksumLength, checksumPosition, algorithm, secret);
  }

  // Collision detection
  if (collisionDetection?.enabled) {
    let attempts = 0;
    const maxAttempts = 10;
    while (checkCollision(finalId) && attempts < maxAttempts) {
      // Regenerate with different counter
      embedData += getCounter().toString(36);
      idCore = generateRandomId(coreIdLength, charset, enhanceEntropy, reseed);
      finalId = idCore;
      if (checksum) {
        finalId = addChecksums(idCore, checksumCount, checksumLength, checksumPosition, algorithm, secret);
      }
      attempts++;
    }
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique ID after maximum attempts');
    }
    recordCollision(finalId);
  }

  // Apply steganography
  if (steganography && hiddenData) {
    finalId = embedHiddenData(finalId, hiddenData);
  }

  // Add separator
  if (separator) {
    finalId = insertSeparators(finalId, separator, separatorLength);
  }

  // Add prefix and suffix
  if (prefix) {
    finalId = prefix + (separator || '') + finalId;
  }
  if (suffix) {
    finalId = finalId + (separator || '') + suffix;
  }

  // Secure deletion of sensitive data
  if (secureDeleteFlag && (secret || salt || pepper)) {
    setImmediate(() => {
      if (secret) secureDelete(Buffer.from(secret));
      if (salt) secureDelete(Buffer.from(salt));
      if (pepper) secureDelete(Buffer.from(pepper));
    });
  }

  // Audit logging
  if (audit?.enabled) {
    const auditLevel = audit.level || 'minimal';
    const metadata: Record<string, unknown> = {};
    if (auditLevel === 'full') {
      metadata.algorithm = algorithm;
      metadata.mode = mode;
      metadata.length = length;
      metadata.hasChecksum = checksum;
      metadata.hasExpiry = embedExpiryFlag;
      metadata.hasGeo = embedGeo;
      metadata.hasDevice = deviceBinding;
    }
    logAudit(createAuditEvent('generate', finalId, true, metadata));
  }

  return finalId;
}

/**
 * Generate random ID using CSPRNG
 */
function generateRandomId(
  length: number,
  charset: string,
  enhance: boolean,
  reseed: boolean
): string {
  let randomBytes = generateRandomBytes(Math.ceil(length * 2));

  if (enhance) {
    // Additional entropy cycles
    for (let i = 0; i < 3; i++) {
      const extraBytes = generateRandomBytes(Math.ceil(length * 2));
      randomBytes = Buffer.concat([randomBytes, extraBytes]);
    }
  }

  if (reseed) {
    // Periodic reseeding (simulate by adding more randomness)
    randomBytes = Buffer.concat([randomBytes, generateRandomBytes(32)]);
  }

  return bufferToBase(randomBytes, charset, length);
}

/**
 * Generate hash-based ID
 */
function generateHashId(
  length: number,
  charset: string,
  algorithm: Algorithm,
  embedData: string,
  doubleHash: boolean
): string {
  const input = generateRandomBytes(64).toString('hex') + embedData;
  let hash = hashData(input, algorithm);

  if (doubleHash) {
    hash = hashData(hash, algorithm);
  }

  return bufferToBase(hash, charset, length);
}

/**
 * Generate HMAC-based ID
 */
function generateHmacId(
  length: number,
  charset: string,
  secret: string,
  salt: string,
  pepper: string,
  algorithm: Algorithm,
  embedData: string
): string {
  const derivedKey = pepper ? deriveKey(secret, salt, pepper, algorithm).toString('hex') : secret;
  const data = generateRandomBytes(64).toString('hex') + salt + embedData;
  const hmac = hmacSign(data, derivedKey, algorithm);

  return bufferToBase(hmac, charset, length);
}

/**
 * Generate hybrid ID (random + hash)
 */
function generateHybridId(
  length: number,
  charset: string,
  algorithm: Algorithm,
  secret: string,
  salt: string,
  pepper: string,
  embedData: string
): string {
  const halfLength = Math.ceil(length / 2);
  const randomPart = generateRandomId(halfLength, charset, false, false);
  const hashPart = secret
    ? generateHmacId(length - halfLength, charset, secret, salt, pepper, algorithm, embedData)
    : generateHashId(length - halfLength, charset, algorithm, embedData, false);

  return randomPart + hashPart;
}

/**
 * Generate HMAC-hash combined ID
 */
function generateHmacHashId(
  length: number,
  charset: string,
  algorithm: Algorithm,
  secret: string,
  salt: string,
  pepper: string,
  embedData: string,
  doubleHash: boolean
): string {
  const randomData = generateRandomBytes(64).toString('hex') + embedData;
  let hash = hashData(randomData, algorithm);

  if (doubleHash) {
    hash = hashData(hash, algorithm);
  }

  const derivedKey = pepper ? deriveKey(secret, salt, pepper, algorithm).toString('hex') : secret;
  const hmac = hmacSign(hash, derivedKey, algorithm);

  return bufferToBase(hmac, charset, length);
}

/**
 * Generate memory-hard ID
 */
function generateMemoryHardId(
  length: number,
  charset: string,
  secret: string,
  embedData: string,
  memoryHard: boolean
): string {
  const input = generateRandomBytes(64).toString('hex') + embedData;
  const iterations = memoryHard ? 100000 : 10000;
  const derived = memoryHardDerive(input, secret, iterations);

  return bufferToBase(derived, charset, length);
}

/**
 * Add checksums to ID
 */
function addChecksums(
  id: string,
  count: number,
  length: number,
  position: string | number[],
  algorithm: Algorithm,
  secret: string
): string {
  const checksums: string[] = [];

  for (let i = 0; i < count; i++) {
    const checksumData = id + i.toString();
    const checksumHash = secret
      ? hmacSign(checksumData, secret, algorithm)
      : hashData(checksumData, algorithm);
    const checksumStr = checksumHash.toString('hex').substring(0, length).toUpperCase();
    checksums.push(checksumStr);
  }

  // Insert checksums based on position
  if (Array.isArray(position)) {
    let result = id;
    let offset = 0;
    for (let i = 0; i < checksums.length && i < position.length; i++) {
      const pos = position[i] + offset;
      result = result.slice(0, pos) + checksums[i] + result.slice(pos);
      offset += checksums[i].length;
    }
    return result;
  } else if (position === 'start') {
    return checksums.join('') + id;
  } else if (position === 'middle') {
    const mid = Math.floor(id.length / 2);
    return id.slice(0, mid) + checksums.join('') + id.slice(mid);
  } else {
    // 'end' or default
    return id + checksums.join('');
  }
}

/**
 * Insert separators into ID
 */
function insertSeparators(id: string, separator: string, segmentLength: number = 8): string {
  const segments: string[] = [];
  for (let i = 0; i < id.length; i += segmentLength) {
    segments.push(id.slice(i, i + segmentLength));
  }
  return segments.join(separator);
}

/**
 * Generate Post-Quantum ID
 */
async function generatePostQuantumId(
  length: number,
  charset: string,
  algorithm: 'kyber768' | 'dilithium3',
  embedData: string
): Promise<string> {
  const data = Buffer.from(generateRandomBytes(64).toString('hex') + embedData);
  const signature = postQuantumSign(data, algorithm);
  return bufferToBase(signature, charset, length);
}

/**
 * Generate Quantum Random ID
 */
async function generateQuantumRandomId(
  length: number,
  charset: string,
  provider: string,
  embedData: string
): Promise<string> {
  const qrngBytes = await getQuantumRandomBytes(Math.ceil(length * 2), provider);
  const mixedData = Buffer.from(qrngBytes.toString('hex') + embedData);
  return bufferToBase(mixedData, charset, length);
}
