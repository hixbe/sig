/**
 * Main entry point for @webx/sig
 */

export { generateId } from './generator';
export {
  verifyChecksum,
  verifyHmac,
  verifyId,
  extractCoreId,
  extractChecksums,
  parseId,
} from './helpers';
export { generateRandomSalt, generateRandomBytes, resetCounter } from './crypto-utils';
export {
  checkRateLimit,
  resetRateLimit,
  getPooledEntropy,
  mixEntropyPool,
  secureDelete,
  secureDeleteString,
  constantTimeLength,
  constantTimeCharAt,
  checkCollision,
  recordCollision,
  removeCollision,
  setAuditLogger,
  setRevocationList,
  isRevoked,
  revokeId,
  unrevokeId,
  embedExpiry,
  extractExpiry,
  isExpired,
  embedGeoRegion,
  extractGeoRegion,
  embedDeviceId,
  verifyDeviceId,
  embedHiddenData,
  extractHiddenData,
  generatePostQuantumKey,
  postQuantumSign,
  postQuantumVerify,
} from './advanced-security';
export * from './types';
