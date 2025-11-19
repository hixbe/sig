/**
 * Synchronous wrapper for generateId
 */

import { generateId as generateIdAsync } from './generator';
import { SecureIdOptions } from './types';

/**
 * Synchronous version of generateId (blocks on async operations)
 */
export function generateIdSync(options: SecureIdOptions = {}): string {
  // For synchronous usage, disable features that require async
  const syncOptions = { ...options };
  if (syncOptions.security) {
    syncOptions.security = {
      ...syncOptions.security,
      useQuantumRNG: false, // Disable QRNG for sync
    };
  }

  // Check if algorithm requires async
  if (
    syncOptions.algorithm === 'kyber768' ||
    syncOptions.algorithm === 'dilithium3' ||
    syncOptions.security?.useQuantumRNG
  ) {
    throw new Error(
      'Post-quantum algorithms and Quantum RNG require async. Use generateId() instead.'
    );
  }

  let result: string | undefined;
  let error: Error | undefined;

  // Run async function synchronously (not recommended for production)
  generateIdAsync(syncOptions).then(
    (id) => {
      result = id;
    },
    (err) => {
      error = err;
    }
  );

  // Busy wait (not ideal, but necessary for sync wrapper)
  const start = Date.now();
  while (result === undefined && error === undefined && Date.now() - start < 5000) {
    // Wait up to 5 seconds
  }

  if (error) throw error;
  if (result === undefined) throw new Error('Timeout generating ID');

  return result;
}

/**
 * Export async version as default
 */
export { generateIdAsync as generateId };
