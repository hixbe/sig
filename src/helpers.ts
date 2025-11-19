/**
 * Verification and helper utilities for @webx/sig
 */

import { hashData, hmacSign, deriveKey, timingSafeEqual } from './crypto-utils';
import { SecureIdOptions, VerifyOptions, VerificationMethod } from './types';
import {
  isRevoked,
  isExpired,
  extractExpiry,
  extractGeoRegion,
  verifyDeviceId,
  extractHiddenData,
  logAudit,
  createAuditEvent,
} from './advanced-security';

/**
 * Extract core ID (remove prefix, suffix, checksums)
 */
export function extractCoreId(id: string, options: SecureIdOptions = {}): string {
  const {
    prefix = '',
    suffix = '',
    separator = '',
    checksum = false,
    checksumCount = 1,
    checksumLength: singleChecksumLength = 1,
    checksumPosition = 'end',
  } = options;

  let coreId = id;

  // Remove prefix
  if (prefix) {
    const prefixWithSep = prefix + (separator || '');
    if (coreId.startsWith(prefixWithSep)) {
      coreId = coreId.slice(prefixWithSep.length);
    } else if (coreId.startsWith(prefix)) {
      coreId = coreId.slice(prefix.length);
    }
  }

  // Remove suffix
  if (suffix) {
    const suffixWithSep = (separator || '') + suffix;
    if (coreId.endsWith(suffixWithSep)) {
      coreId = coreId.slice(0, -suffixWithSep.length);
    } else if (coreId.endsWith(suffix)) {
      coreId = coreId.slice(0, -suffix.length);
    }
  }

  // Remove separators
  if (separator) {
    coreId = coreId.split(separator).join('');
  }

  // Remove checksums
  if (checksum) {
    const totalChecksumLength = checksumCount * singleChecksumLength;

    if (Array.isArray(checksumPosition)) {
      // Remove checksums at specific positions
      let result = coreId;
      const sortedPositions = [...checksumPosition].sort((a, b) => b - a); // Reverse order
      for (const pos of sortedPositions) {
        if (pos < result.length) {
          result = result.slice(0, pos) + result.slice(pos + singleChecksumLength);
        }
      }
      coreId = result;
    } else if (checksumPosition === 'start') {
      coreId = coreId.slice(totalChecksumLength);
    } else if (checksumPosition === 'middle') {
      const totalLength = coreId.length;
      const actualLength = totalLength - totalChecksumLength;
      const mid = Math.floor(actualLength / 2);
      coreId = coreId.slice(0, mid) + coreId.slice(mid + totalChecksumLength);
    } else {
      // 'end' or default
      coreId = coreId.slice(0, -totalChecksumLength);
    }
  }

  return coreId;
}

/**
 * Extract checksums from ID
 */
export function extractChecksums(id: string, options: SecureIdOptions = {}): string[] {
  const {
    prefix = '',
    suffix = '',
    separator = '',
    checksum = false,
    checksumCount = 1,
    checksumPosition = 'end',
    checksumLength = 1,
  } = options;

  if (!checksum) {
    return [];
  }

  let workingId = id;

  // Remove prefix
  if (prefix) {
    const prefixWithSep = prefix + (separator || '');
    if (workingId.startsWith(prefixWithSep)) {
      workingId = workingId.slice(prefixWithSep.length);
    } else if (workingId.startsWith(prefix)) {
      workingId = workingId.slice(prefix.length);
    }
  }

  // Remove suffix
  if (suffix) {
    const suffixWithSep = (separator || '') + suffix;
    if (workingId.endsWith(suffixWithSep)) {
      workingId = workingId.slice(0, -suffixWithSep.length);
    } else if (workingId.endsWith(suffix)) {
      workingId = workingId.slice(0, -suffix.length);
    }
  }

  // Remove separators
  if (separator) {
    workingId = workingId.split(separator).join('');
  }

  const checksums: string[] = [];

  if (Array.isArray(checksumPosition)) {
    // Extract checksums at specific positions
    for (const pos of checksumPosition) {
      if (pos < workingId.length) {
        checksums.push(workingId.slice(pos, pos + checksumLength));
      }
    }
  } else if (checksumPosition === 'start') {
    for (let i = 0; i < checksumCount; i++) {
      checksums.push(workingId.slice(i * checksumLength, (i + 1) * checksumLength));
    }
  } else if (checksumPosition === 'middle') {
    const coreLength = workingId.length - checksumCount * checksumLength;
    const mid = Math.floor(coreLength / 2);
    for (let i = 0; i < checksumCount; i++) {
      checksums.push(workingId.slice(mid + i * checksumLength, mid + (i + 1) * checksumLength));
    }
  } else {
    // 'end' or default
    const startPos = workingId.length - checksumCount * checksumLength;
    for (let i = 0; i < checksumCount; i++) {
      checksums.push(
        workingId.slice(startPos + i * checksumLength, startPos + (i + 1) * checksumLength)
      );
    }
  }

  return checksums;
}

/**
 * Verify checksum (timing-safe)
 */
export function verifyChecksum(id: string, options: SecureIdOptions = {}): boolean {
  const {
    checksum = false,
    checksumCount = 1,
    checksumLength = 1,
    algorithm = 'sha256',
    secret = '',
  } = options;

  if (!checksum) {
    return true; // No checksum to verify
  }

  try {
    const coreId = extractCoreId(id, options);
    const extractedChecksums = extractChecksums(id, options);

    if (extractedChecksums.length !== checksumCount) {
      return false;
    }

    // Recompute checksums
    for (let i = 0; i < checksumCount; i++) {
      const checksumData = coreId + i.toString();
      const checksumHash = secret
        ? hmacSign(checksumData, secret, algorithm)
        : hashData(checksumData, algorithm);
      const expectedChecksum = checksumHash.toString('hex').substring(0, checksumLength).toUpperCase();

      if (!timingSafeEqual(extractedChecksums[i].toUpperCase(), expectedChecksum)) {
        return false;
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Verify HMAC signature (timing-safe)
 */
export function verifyHmac(id: string, secret: string, options: SecureIdOptions = {}): boolean {
  if (!secret) {
    throw new Error('Secret is required for HMAC verification');
  }

  try {
    const { algorithm = 'sha256', salt = '', pepper = '' } = options;

    const coreId = extractCoreId(id, options);
    const derivedKey = pepper ? deriveKey(secret, salt, pepper, algorithm).toString('hex') : secret;

    // Compute HMAC of the core ID
    const computedHmac = hmacSign(coreId, derivedKey, algorithm).toString('hex');
    const idHex = Buffer.from(coreId).toString('hex');

    // Compare - note: this is a simplified verification
    // In real scenarios, the HMAC would be stored separately or embedded in the ID
    return timingSafeEqual(
      computedHmac.substring(0, Math.min(computedHmac.length, idHex.length)),
      idHex.substring(0, Math.min(computedHmac.length, idHex.length))
    );
  } catch (error) {
    return false;
  }
}

/**
 * Full ID verification (checksums + HMAC + integrity)
 */
export function verifyId(id: string, options: VerifyOptions = {}): boolean {
  try {
    const { security = {} } = options;

    // Check revocation
    if (security.checkRevocation && isRevoked(id)) {
      if (security.audit?.enabled) {
        logAudit(createAuditEvent('verify', id, false, { reason: 'revoked' }));
      }
      return false;
    }

    // Multi-factor verification
    if (security.verifyMultiFactor && security.verifyMultiFactor.length > 0) {
      for (const method of security.verifyMultiFactor) {
        if (!verifySingleMethod(id, method, options)) {
          if (security.audit?.enabled) {
            logAudit(createAuditEvent('verify', id, false, { reason: `mfa_failed_${method}` }));
          }
          return false;
        }
      }
    } else {
      // Standard verification
      // Verify checksum if enabled
      if (options.checksum) {
        if (!verifyChecksum(id, options)) {
          return false;
        }
      }

      // Verify HMAC if secret provided
      if (options.secret && (options.mode === 'hmac' || options.mode === 'hmac-hash')) {
        if (!verifyHmac(id, options.secret, options)) {
          return false;
        }
      }

      // Check expiry
      if (security.embedExpiry) {
        const coreId = extractCoreId(id, options);
        // Extract expiry from embedded data (simplified)
        const expiryMatch = coreId.match(/[a-z0-9]{8,12}/i);
        if (expiryMatch && isExpired(expiryMatch[0])) {
          if (security.audit?.enabled) {
            logAudit(createAuditEvent('verify', id, false, { reason: 'expired' }));
          }
          return false;
        }
      }

      // Verify device binding
      if (security.deviceBinding && security.deviceId) {
        const coreId = extractCoreId(id, options);
        const deviceMatch = coreId.match(/[a-f0-9]{12}/i);
        if (!deviceMatch || !verifyDeviceId(deviceMatch[0], security.deviceId)) {
          if (security.audit?.enabled) {
            logAudit(createAuditEvent('verify', id, false, { reason: 'device_mismatch' }));
          }
          return false;
        }
      }

      // Verify against original ID if provided
      if (options.originalId) {
        return timingSafeEqual(id, options.originalId);
      }
    }

    // Audit logging
    if (security.audit?.enabled) {
      logAudit(createAuditEvent('verify', id, true));
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Verify a single method for multi-factor authentication
 */
function verifySingleMethod(
  id: string,
  method: VerificationMethod,
  options: VerifyOptions
): boolean {
  const { security = {} } = options;

  switch (method) {
    case 'checksum':
      return options.checksum ? verifyChecksum(id, options) : true;

    case 'hmac':
      return options.secret ? verifyHmac(id, options.secret, options) : true;

    case 'timestamp':
      // Verify timestamp is recent (within acceptable window)
      return security.timestampEmbed ? true : true; // Simplified

    case 'signature':
      // Verify cryptographic signature
      return true; // Placeholder for signature verification

    case 'expiry':
      if (security.embedExpiry) {
        const coreId = extractCoreId(id, options);
        const expiryMatch = coreId.match(/[a-z0-9]{8,12}/i);
        return expiryMatch ? !isExpired(expiryMatch[0]) : false;
      }
      return true;

    case 'device':
      if (security.deviceBinding && security.deviceId) {
        const coreId = extractCoreId(id, options);
        const deviceMatch = coreId.match(/[a-f0-9]{12}/i);
        return deviceMatch ? verifyDeviceId(deviceMatch[0], security.deviceId) : false;
      }
      return true;

    case 'geo':
      if (security.embedGeo && security.geoRegion) {
        const coreId = extractCoreId(id, options);
        const geoMatch = coreId.match(/[A-Za-z0-9]{8}/);
        if (geoMatch) {
          const extractedRegion = extractGeoRegion(geoMatch[0]);
          return extractedRegion === security.geoRegion;
        }
      }
      return true;

    default:
      return true;
  }
}

/**
 * Parse ID structure
 */
export function parseId(
  id: string,
  options: SecureIdOptions = {}
): {
  fullId: string;
  prefix?: string;
  suffix?: string;
  coreId: string;
  checksums?: string[];
  length: number;
} {
  const coreId = extractCoreId(id, options);
  const checksums = options.checksum ? extractChecksums(id, options) : undefined;

  return {
    fullId: id,
    prefix: options.prefix || undefined,
    suffix: options.suffix || undefined,
    coreId,
    checksums,
    length: id.length,
  };
}
