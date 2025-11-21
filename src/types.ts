/**
 * TypeScript type definitions for @hixbe/sig
 */

export type Algorithm =
  | 'sha256'
  | 'sha512'
  | 'sha3-256'
  | 'sha3-512'
  | 'blake2b512'
  | 'shake256'
  | 'kyber768'
  | 'dilithium3';

export type Mode = 'random' | 'hash' | 'hmac' | 'hybrid' | 'hmac-hash' | 'memory-hard';

export type CaseType = 'upper' | 'lower' | 'mixed';

export type HSMProvider = 'aws-cloudhsm' | 'azure-keyvault' | 'google-kms' | 'local';

export type QRNGProvider = 'anu' | 'idquantique' | 'local';

export type AuditLevel = 'none' | 'minimal' | 'full';

export type VerificationMethod =
  | 'checksum'
  | 'hmac'
  | 'timestamp'
  | 'signature'
  | 'expiry'
  | 'device'
  | 'geo';

export type ChecksumPosition = 'start' | 'end' | 'middle' | number[];

export interface RateLimitOptions {
  /** Maximum requests per window */
  maxRequests?: number;
  /** Time window in milliseconds */
  windowMs?: number;
  /** Identifier for rate limiting (IP, user, etc.) */
  identifier?: string;
}

export interface CollisionDetectionOptions {
  /** Enable collision detection */
  enabled?: boolean;
  /** Storage backend for collision tracking */
  storage?: 'memory' | 'redis' | 'database';
  /** Custom storage adapter */
  adapter?: CollisionStorageAdapter;
}

export interface CollisionStorageAdapter {
  has(id: string): Promise<boolean> | boolean;
  add(id: string): Promise<void> | void;
  remove(id: string): Promise<void> | void;
}

export interface HSMOptions {
  /** Enable HSM usage */
  enabled?: boolean;
  /** HSM provider */
  provider?: HSMProvider;
  /** HSM configuration */
  config?: Record<string, unknown>;
}

export interface AuditOptions {
  /** Enable audit logging */
  enabled?: boolean;
  /** Audit level */
  level?: AuditLevel;
  /** Custom audit logger */
  logger?: AuditLogger;
}

export interface AuditLogger {
  log(event: AuditEvent): Promise<void> | void;
}

export interface AuditEvent {
  timestamp: number;
  action: 'generate' | 'verify' | 'revoke';
  idHash: string;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export interface SecurityOptions {
  /** Enhance entropy with additional random cycles */
  enhanceEntropy?: boolean;
  /** Apply Argon2-like memory-hard stretching */
  memoryHard?: boolean;
  /** Apply double hashing for additional security */
  doubleHash?: boolean;
  /** Avoid ambiguous characters (0,O,I,l,1) */
  avoidAmbiguousChars?: boolean;
  /** Custom character set to use */
  enforceCharset?: string;
  /** Periodic entropy reseeding */
  reseed?: boolean;
  /** Embed timestamp to prevent replay attacks */
  timestampEmbed?: boolean;
  /** Embed monotonic counter */
  counterEmbed?: boolean;
  /** ID Time-to-Live in seconds */
  ttl?: number;
  /** Embed expiration timestamp */
  embedExpiry?: boolean;
  /** Rate limiting options */
  rateLimit?: RateLimitOptions;
  /** Collision detection options */
  collisionDetection?: CollisionDetectionOptions;
  /** Hardware Security Module options */
  hsm?: HSMOptions;
  /** Audit logging options */
  audit?: AuditOptions;
  /** Multi-factor verification methods */
  verifyMultiFactor?: VerificationMethod[];
  /** Embed geographic region */
  embedGeo?: boolean;
  /** Geographic region identifier */
  geoRegion?: string;
  /** Device binding */
  deviceBinding?: boolean;
  /** Device identifier */
  deviceId?: string;
  /** Check revocation list */
  checkRevocation?: boolean;
  /** Use quantum RNG */
  useQuantumRNG?: boolean;
  /** Quantum RNG provider */
  qrngProvider?: QRNGProvider;
  /** Enable steganography */
  steganography?: boolean;
  /** Hidden data for steganography */
  hiddenData?: string;
  /** Secure memory deletion */
  secureDelete?: boolean;
  /** Custom JSON metadata to embed */
  customMetadata?: Record<string, unknown>;
  /** Maximum size for custom metadata in bytes */
  customMetadataMaxSize?: number;
  /** Compress custom metadata using gzip */
  compressMetadata?: boolean;
}

export interface SecureIdOptions {
  /** Total ID length (excluding prefix/suffix) */
  length?: number;
  /** Hash algorithm to use */
  algorithm?: Algorithm;
  /** ID generation mode */
  mode?: Mode;
  /** Case formatting */
  case?: CaseType;
  /** Separator character(s) */
  separator?: string;
  /** Separator segment length (e.g., 2, 3, 4, 8) */
  separatorLength?: number;
  /** Enable cryptographic checksum */
  checksum?: boolean;
  /** Number of checksum segments */
  checksumCount?: number;
  /** Length of each checksum in characters (default: 1) */
  checksumLength?: number;
  /** Position of checksum blocks */
  checksumPosition?: ChecksumPosition;
  /** ID prefix */
  prefix?: string;
  /** ID suffix */
  suffix?: string;
  /** Secret key for HMAC/memory-hard modes */
  secret?: string;
  /** Per-ID salt */
  salt?: string;
  /** Global pepper (store externally) */
  pepper?: string;
  /** Advanced security options */
  security?: SecurityOptions;
}

export interface VerifyOptions extends SecureIdOptions {
  /** Original ID to verify against */
  originalId?: string;
}

export interface ParsedIdMetadata {
  timestamp?: number;
  counter?: number;
  expiry?: number;
  geoRegion?: string;
  deviceId?: string;
  hiddenData?: string;
}

export interface RevocationList {
  isRevoked(id: string): Promise<boolean> | boolean;
  revoke(id: string): Promise<void> | void;
  unrevoke(id: string): Promise<void> | void;
}
