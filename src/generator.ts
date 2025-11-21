/**
 * Core ID generation engine for @hixbe/sig
 */

import { gzipSync, gunzipSync } from 'zlib';
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
    customMetadata,
    customMetadataMaxSize = 1024, // 1KB default max
    compressMetadata = false,
  } = security;

  // ============================================================================
  // CONFIGURATION VALIDATION
  // ============================================================================

  // Validate custom metadata first (needed for length calculations)
  let customMetadataEncoded = '';
  let customMetadataLength = 0;
  if (customMetadata) {
    // Validate it's a valid object
    if (
      typeof customMetadata !== 'object' ||
      customMetadata === null ||
      Array.isArray(customMetadata)
    ) {
      throw new Error(
        `Configuration Error: customMetadata must be a valid object (non-null, non-array).`
      );
    }

    // Stringify and encode
    try {
      const jsonString = JSON.stringify(customMetadata);
      const jsonBytes = Buffer.from(jsonString, 'utf8').length;

      // Check size limit
      if (jsonBytes > customMetadataMaxSize) {
        throw new Error(
          `Configuration Error: customMetadata size (${jsonBytes} bytes) exceeds maximum allowed (${customMetadataMaxSize} bytes).\n` +
            `Solutions:\n` +
            `  1. Reduce metadata content\n` +
            `  2. Increase customMetadataMaxSize limit\n` +
            `  3. Remove unnecessary fields\n` +
            `  4. Enable compression (compressMetadata: true)`
        );
      }

      let dataToEncode: Buffer;
      let compressionInfo = '';

      if (compressMetadata) {
        // Compress with gzip
        const compressed = gzipSync(Buffer.from(jsonString, 'utf8'));
        dataToEncode = compressed;
        compressionInfo = ` (compressed from ${jsonBytes} to ${compressed.length} bytes, ${((1 - compressed.length / jsonBytes) * 100).toFixed(1)}% reduction)`;
      } else {
        dataToEncode = Buffer.from(jsonString, 'utf8');
      }

      // Encode to base64url (safe for IDs)
      customMetadataEncoded = dataToEncode
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      customMetadataLength = customMetadataEncoded.length;

      console.log(
        `ℹ️  Custom metadata: ${jsonBytes} bytes → ${customMetadataLength} chars (base64url)${compressionInfo}`
      );
    } catch (error) {
      throw new Error(
        `Configuration Error: Failed to encode customMetadata. ` +
          `Ensure it contains only JSON-serializable values. ` +
          `Error: ${(error as Error).message}`
      );
    }
  }

  // Validate length
  if (length < 8) {
    console.warn(
      `⚠️  Warning: Length (${length}) is less than recommended minimum of 8 characters. ` +
        `This may compromise security. Actual core ID will be at least 8 characters.`
    );
  }

  if (length > 256) {
    console.warn(
      `⚠️  Warning: Length (${length}) is unusually large. Consider using length ≤ 128 for performance.`
    );
  }

  // Validate checksum configuration
  if (checksum) {
    if (checksumCount < 1) {
      throw new Error('checksumCount must be at least 1 when checksum is enabled');
    }

    if (checksumLength < 1 || checksumLength > 64) {
      throw new Error('checksumLength must be between 1 and 64 characters');
    }

    // Calculate required length with all metadata
    let totalMetadata = checksumCount * checksumLength;
    if (timestampEmbed) totalMetadata += 8;
    if (embedExpiryFlag) totalMetadata += 8; // Expiry is 8 chars in base36
    if (embedGeo) totalMetadata += 8;
    if (deviceBinding) totalMetadata += 12;
    if (customMetadata) totalMetadata += customMetadataLength;

    const minCoreLength = 8;
    const requiredLength = minCoreLength + totalMetadata;

    if (length < requiredLength) {
      throw new Error(
        `Configuration Error: Length (${length}) is too short for the configured features.\n` +
          `Metadata breakdown:\n` +
          `  • Checksums: ${checksumCount * checksumLength} chars (${checksumCount} × ${checksumLength})\n` +
          `  • Timestamp: ${timestampEmbed ? 8 : 0} chars\n` +
          `  • Expiry: ${embedExpiryFlag ? 8 : 0} chars\n` +
          `  • Geo: ${embedGeo ? 8 : 0} chars\n` +
          `  • Device: ${deviceBinding ? 12 : 0} chars\n` +
          `  • Custom metadata: ${customMetadata ? customMetadataLength : 0} chars\n` +
          `  • Total metadata: ${totalMetadata} chars\n` +
          `  • Minimum core: ${minCoreLength} chars\n\n` +
          `Required minimum length: ${requiredLength} chars\n` +
          `Recommended length: ${Math.max(24, Math.ceil(requiredLength / 4) * 4)} chars or higher\n\n` +
          `Solution: Set length to ${Math.max(24, Math.ceil(requiredLength / 4) * 4)} or use fewer security features.`
      );
    }

    if (Array.isArray(checksumPosition)) {
      // Validate custom positions with actual calculated length
      const maxPosition = Math.max(...checksumPosition);
      const actualCoreLength = Math.max(minCoreLength, length - totalMetadata);
      const finalIdLength = actualCoreLength + checksumCount * checksumLength;

      if (maxPosition >= finalIdLength) {
        throw new Error(
          `Configuration Error: Checksum position ${maxPosition} exceeds ID length.\n` +
            `Calculated ID structure:\n` +
            `  • Core length: ${actualCoreLength} chars\n` +
            `  • Checksums: ${checksumCount * checksumLength} chars (${checksumCount} × ${checksumLength})\n` +
            `  • Final ID length: ${finalIdLength} chars\n` +
            `  • Maximum valid position: ${finalIdLength - checksumLength}\n\n` +
            `Solutions:\n` +
            `  1. Use checksumPosition: 'end' (recommended)\n` +
            `  2. Adjust positions to [${Math.floor(actualCoreLength / 3)}, ${Math.floor((actualCoreLength * 2) / 3)}]\n` +
            `  3. Increase length to ${requiredLength + 10} or more`
        );
      }

      if (checksumPosition.length < checksumCount) {
        console.warn(
          `⚠️  Warning: checksumPosition array has ${checksumPosition.length} positions ` +
            `but checksumCount is ${checksumCount}. Only ${checksumPosition.length} checksums will be placed.`
        );
      }
    }
  }

  // Validate mode requirements
  if ((mode === 'hmac' || mode === 'hmac-hash' || mode === 'memory-hard') && !secret) {
    throw new Error(
      `Secret is required for mode '${mode}'. Provide options.secret or set an environment variable.`
    );
  }

  // Validate security options
  if (embedExpiryFlag && !ttl) {
    throw new Error(
      'TTL is required when security.embedExpiry is enabled. Specify security.ttl in milliseconds.'
    );
  }

  if (embedExpiryFlag && ttl !== undefined && ttl < 1000) {
    console.warn(
      `⚠️  Warning: TTL (${ttl}ms) is very short (< 1 second). ` +
        `This may cause IDs to expire immediately. Consider using at least 60000ms (1 minute).`
    );
  }

  if (deviceBinding && !deviceId) {
    throw new Error(
      'deviceId is required when security.deviceBinding is enabled. Provide security.deviceId.'
    );
  }

  if (embedGeo && !geoRegion) {
    console.warn(
      `⚠️  Warning: security.embedGeo is enabled but geoRegion is not specified. ` +
        `The ID will be generated without geographic binding.`
    );
  }

  // Validate separator configuration
  if (separator) {
    if (separator.length > 3) {
      console.warn(
        `⚠️  Warning: Separator '${separator}' is ${separator.length} characters long. ` +
          `Long separators increase ID length. Consider using 1-2 character separators.`
      );
    }

    if (separatorLength < 2 || separatorLength > 16) {
      console.warn(
        `⚠️  Warning: separatorLength (${separatorLength}) is outside typical range (2-16). ` +
          `This may produce unusually formatted IDs.`
      );
    }
  }

  // Validate algorithm compatibility
  if ((algorithm === 'kyber768' || algorithm === 'dilithium3') && mode !== 'random') {
    console.warn(
      `⚠️  Warning: Post-quantum algorithm '${algorithm}' is typically used with mode 'random'. ` +
        `Current mode '${mode}' may not provide expected quantum resistance.`
    );
  }

  // Validate charset
  if (enforceCharset) {
    if (enforceCharset.length < 10) {
      console.warn(
        `⚠️  Warning: Custom charset has only ${enforceCharset.length} characters. ` +
          `Small charsets reduce entropy. Consider at least 16 characters for security.`
      );
    }

    const uniqueChars = new Set(enforceCharset).size;
    if (uniqueChars !== enforceCharset.length) {
      console.warn(
        `⚠️  Warning: Custom charset contains duplicate characters. ` +
          `This reduces entropy and may compromise security.`
      );
    }
  }

  // Validate steganography
  if (steganography && !hiddenData) {
    console.warn(
      `⚠️  Warning: security.steganography is enabled but hiddenData is empty. ` +
        `No hidden data will be embedded.`
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

  const charset = getCharset(avoidAmbiguousChars, enforceCharset);

  // Calculate actual ID length (excluding checksum, prefix, suffix, metadata)
  let coreIdLength = length;
  let metadataLength = 0;

  if (checksum) {
    const totalChecksumLength = checksumCount * checksumLength;
    metadataLength += totalChecksumLength;
  }
  if (timestampEmbed) metadataLength += 8;
  if (embedExpiryFlag) metadataLength += 8; // Expiry is 8 chars in base36
  if (embedGeo) metadataLength += 8;
  if (deviceBinding) metadataLength += 12;
  if (customMetadata) metadataLength += customMetadataLength;

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
  if (customMetadata) {
    embedData += customMetadataEncoded;
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

  // Apply case formatting to core BEFORE adding metadata
  idCore = applyCase(idCore, caseType);

  // Embed metadata directly into the ID (after case formatting to preserve metadata case)
  if (embedData) {
    idCore = idCore + embedData;
  }

  // Add checksums if requested
  let finalId = idCore;
  if (checksum) {
    finalId = addChecksums(
      idCore,
      checksumCount,
      checksumLength,
      checksumPosition,
      algorithm,
      secret
    );
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
        finalId = addChecksums(
          idCore,
          checksumCount,
          checksumLength,
          checksumPosition,
          algorithm,
          secret
        );
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
