/**
 * Advanced security features examples for @webx/sig
 */

import { generateId } from './index';
import {
  verifyId,
  checkRateLimit,
  revokeId,
  isRevoked,
  setAuditLogger,
  embedExpiry,
  isExpired,
} from './index';
import type { AuditEvent } from './types';

async function runAdvancedExamples() {
  console.log('=== @webx/sig Advanced Security Examples ===\n');

  // Example 1: Rate Limiting
  console.log('1. Rate Limiting:');
  const rateLimitId = await generateId({
    length: 24,
    security: {
      rateLimit: {
        maxRequests: 5,
        windowMs: 60000,
        identifier: 'user-123',
      },
    },
  });
  console.log(`   Generated with rate limit: ${rateLimitId}`);
  console.log(
    `   Can generate: ${checkRateLimit({ maxRequests: 5, windowMs: 60000, identifier: 'user-123' })}\n`
  );

  // Example 2: Collision Detection
  console.log('2. Collision Detection:');
  const collisionId = await generateId({
    length: 24,
    security: {
      collisionDetection: {
        enabled: true,
        storage: 'memory',
      },
    },
  });
  console.log(`   Unique ID: ${collisionId}\n`);

  // Example 3: TTL and Expiry
  console.log('3. ID with Expiration (TTL):');
  const expiringId = await generateId({
    length: 32,
    security: {
      ttl: 3600, // 1 hour
      embedExpiry: true,
      timestampEmbed: true,
    },
  });
  console.log(`   Expiring ID: ${expiringId}`);
  const expiryStr = embedExpiry(3600);
  console.log(`   Expires: ${!isExpired(expiryStr) ? 'Not expired' : 'Expired'}\n`);

  // Example 4: Audit Logging
  console.log('4. Audit Logging:');
  setAuditLogger({
    log: (event: AuditEvent) => {
      console.log(
        `   [AUDIT] ${event.action.toUpperCase()} | ${event.success ? 'SUCCESS' : 'FAIL'} | ${event.idHash}`
      );
    },
  });
  const auditedId = await generateId({
    length: 24,
    security: {
      audit: {
        enabled: true,
        level: 'full',
      },
    },
  });
  console.log(`   ID: ${auditedId}\n`);

  // Example 5: Multi-Factor Verification
  console.log('5. Multi-Factor Verification:');
  const mfaId = await generateId({
    length: 32,
    checksum: true,
    secret: 'super-secret-key',
    mode: 'hmac',
    security: {
      timestampEmbed: true,
      verifyMultiFactor: ['checksum', 'hmac', 'timestamp'],
    },
  });
  console.log(`   MFA ID: ${mfaId}`);
  const mfaValid = verifyId(mfaId, {
    checksum: true,
    secret: 'super-secret-key',
    mode: 'hmac',
    security: {
      timestampEmbed: true,
      verifyMultiFactor: ['checksum', 'hmac', 'timestamp'],
    },
  });
  console.log(`   MFA Verified: ${mfaValid}\n`);

  // Example 6: Geolocation Embedding
  console.log('6. Geolocation Embedding:');
  const geoId = await generateId({
    length: 32,
    security: {
      embedGeo: true,
      geoRegion: 'us-east-1',
    },
  });
  console.log(`   Geo ID: ${geoId}`);
  console.log(`   Region embedded: us-east-1\n`);

  // Example 7: Device Binding
  console.log('7. Device Binding:');
  const deviceId = await generateId({
    length: 32,
    security: {
      deviceBinding: true,
      deviceId: 'device-uuid-12345',
    },
  });
  console.log(`   Device-bound ID: ${deviceId}\n`);

  // Example 8: Revocation
  console.log('8. Revocation List:');
  const revokableId = await generateId({
    length: 24,
    security: {
      checkRevocation: true,
    },
  });
  console.log(`   ID: ${revokableId}`);
  console.log(`   Is revoked: ${isRevoked(revokableId)}`);
  revokeId(revokableId);
  console.log(`   After revocation: ${isRevoked(revokableId)}\n`);

  // Example 9: Steganography
  console.log('9. Steganography (Hidden Data):');
  const stegoId = await generateId({
    length: 40,
    security: {
      steganography: true,
      hiddenData: 'secret-metadata',
    },
  });
  console.log(`   ID with hidden data: ${stegoId}\n`);

  // Example 10: Quantum RNG
  console.log('10. Quantum Random Number Generator:');
  const quantumId = await generateId({
    length: 32,
    security: {
      useQuantumRNG: true,
      qrngProvider: 'local',
    },
  });
  console.log(`   Quantum-random ID: ${quantumId}\n`);

  // Example 11: Secure Memory Deletion
  console.log('11. Secure Memory Deletion:');
  const secureId = await generateId({
    length: 24,
    secret: 'sensitive-secret',
    mode: 'hmac',
    security: {
      secureDelete: true,
    },
  });
  console.log(`   ID with secure deletion: ${secureId}`);
  console.log(`   Secret will be securely wiped from memory\n`);

  // Example 12: Enterprise-Grade ID
  console.log('12. Enterprise-Grade ID (All Features):');
  const enterpriseId = await generateId({
    length: 48,
    algorithm: 'sha3-512',
    mode: 'hmac-hash',
    checksum: true,
    checksumCount: 2,
    prefix: 'ENT',
    suffix: 'PROD',
    separator: '-',
    secret: 'enterprise-secret-key',
    salt: 'per-id-salt-value',
    pepper: 'global-pepper-value',
    security: {
      enhanceEntropy: true,
      memoryHard: true,
      doubleHash: true,
      avoidAmbiguousChars: true,
      timestampEmbed: true,
      counterEmbed: true,
      ttl: 7200,
      embedExpiry: true,
      rateLimit: {
        maxRequests: 100,
        windowMs: 60000,
        identifier: 'enterprise-app',
      },
      collisionDetection: {
        enabled: true,
        storage: 'memory',
      },
      audit: {
        enabled: true,
        level: 'full',
      },
      verifyMultiFactor: ['checksum', 'hmac', 'expiry'],
      embedGeo: true,
      geoRegion: 'us-west-2',
      deviceBinding: true,
      deviceId: 'enterprise-device-001',
      checkRevocation: true,
      secureDelete: true,
    },
  });
  console.log(`   ${enterpriseId}`);
  console.log(`   This ID includes ALL security features!\n`);

  // Example 11: Post-Quantum Cryptography
  console.log('11. Post-Quantum Cryptography:');
  const { generatePostQuantumKey, postQuantumSign, postQuantumVerify } = await import('./index');

  // Generate quantum-resistant key
  const pqKey = generatePostQuantumKey('kyber768');
  console.log(`   Kyber768 Key: ${pqKey.toString('hex').substring(0, 32)}...`);

  // Create quantum-resistant signature
  const data = Buffer.from('Important payment transaction data');
  const pqSignature = postQuantumSign(data, 'dilithium3');
  console.log(`   Dilithium3 Signature: ${pqSignature.toString('hex').substring(0, 32)}...`);

  // Verify signature
  const isValid = postQuantumVerify(
    data,
    pqSignature,
    generatePostQuantumKey('dilithium3'),
    'dilithium3'
  );
  console.log(`   Signature valid: ${isValid}`);

  // Use in ID generation
  const pqId = await generateId({
    length: 32,
    algorithm: 'shake256', // Quantum-resistant hash
    mode: 'hmac-hash',
    secret: process.env.SECRET_KEY || 'test-secret',
    security: {
      enhanceEntropy: true,
    },
  });
  console.log(`   Quantum-resistant ID: ${pqId}\n`);

  console.log('=== Advanced Examples Complete ===');
}

// Run examples
runAdvancedExamples().catch(console.error);
