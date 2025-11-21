/**
 * Examples for using @hixbe/sig
 */

import { generateId, verifyId, parseId, generateRandomSalt } from './index';

async function runExamples() {
  console.log('=== @hixbe/sig Examples ===\n');

  // Example 1: Simple random ID
  console.log('1. Simple Random ID:');
  const simpleId = await generateId();
  console.log(`   ${simpleId}\n`);

  // Example 2: Custom length
  console.log('2. Custom Length (16):');
  const shortId = await generateId({ length: 16 });
  console.log(`   ${shortId}\n`);

  // Example 3: With separator
  console.log('3. With Separator:');
  const separatedId = await generateId({
    length: 32,
    separator: '-',
  });
  console.log(`   ${separatedId}\n`);

  // Example 3.5: Custom separator segments
  console.log('3.5 Custom Separator Segments:');
  const customSegments = await generateId({
    length: 24,
    separator: '-',
    separatorLength: 3, // Segment every 3 characters
  });
  console.log(`   ${customSegments}`);
  const customSegments2 = await generateId({
    length: 20,
    separator: ':',
    separatorLength: 4, // Segment every 4 characters
  });
  console.log(`   ${customSegments2}\n`);

  // Example 4: With prefix and suffix
  console.log('4. With Prefix and Suffix:');
  const brandedId = await generateId({
    length: 24,
    prefix: 'HIXBE',
    suffix: 'ID',
    separator: '_',
    case: 'upper',
  });
  console.log(`   ${brandedId}\n`);

  // Example 5: With checksum
  console.log('5. With Checksum:');
  const checksumId = await generateId({
    length: 24,
    checksum: true,
    checksumCount: 1,
    algorithm: 'sha3-256',
  });
  console.log(`   ${checksumId}`);
  const isValid = verifyId(checksumId, {
    checksum: true,
    checksumCount: 1,
    algorithm: 'sha3-256',
  });
  console.log(`   Valid: ${isValid}\n`);

  // Example 6: HMAC-signed ID
  console.log('6. HMAC-Signed ID:');
  const secret = 'my-secret-key-12345';
  const hmacId = await generateId({
    length: 32,
    mode: 'hmac',
    algorithm: 'blake2b512',
    secret,
    separator: '-',
  });
  console.log(`   ${hmacId}`);
  const hmacValid = verifyId(hmacId, {
    mode: 'hmac',
    algorithm: 'blake2b512',
    secret,
    separator: '-',
  });
  console.log(`   Valid: ${hmacValid}\n`);

  // Example 6.5: Using Salt and Pepper
  console.log('6.5 Using Salt and Pepper:');
  const randomSalt = generateRandomSalt();
  const globalPepper = process.env.SIG_PEPPER || 'global-secret-pepper-value'; // Store securely!

  console.log(`   Salt (per-ID): ${randomSalt.substring(0, 32)}...`);
  console.log(`   Pepper (global): ${globalPepper.substring(0, 20)}...`);

  const saltPepperId = await generateId({
    length: 24,
    mode: 'hmac-hash', // Best mode for salt+pepper
    algorithm: 'sha3-256',
    secret: 'my-secret-key', // Application secret
    salt: randomSalt, // Per-ID randomness (store with ID)
    pepper: globalPepper, // Global secret (never store with ID)
    separator: '-',
  });
  console.log(`   ID: ${saltPepperId}\n`);

  // Example 7: High-security ID
  console.log('7. High-Security ID (all features):');
  const salt = generateRandomSalt();
  const highSecId = await generateId({
    length: 32,
    algorithm: 'sha3-512',
    mode: 'hmac-hash',
    separator: '-',
    checksum: true,
    checksumCount: 2,
    checksumPosition: 'end',
    prefix: 'HSI',
    suffix: 'END',
    secret: 'super-secret-key',
    salt,
    pepper: 'global-pepper-value',
    case: 'mixed',
    security: {
      enhanceEntropy: true,
      memoryHard: false,
      doubleHash: true,
      avoidAmbiguousChars: true,
      timestampEmbed: true,
    },
  });
  console.log(`   ${highSecId}`);

  const parsed = parseId(highSecId, {
    separator: '-',
    checksum: true,
    checksumCount: 2,
    prefix: 'HSI',
    suffix: 'END',
  });
  console.log('   Parsed:');
  console.log(`     Core: ${parsed.coreId}`);
  console.log(`     Checksums: ${parsed.checksums?.join(', ')}`);
  console.log(`     Total Length: ${parsed.totalLength} (${parsed.contentLength} content + ${parsed.totalLength - parsed.contentLength} separators)\n`);

  // Example 8: API Key style
  console.log('8. API Key Style:');
  const apiKey = await generateId({
    length: 40,
    mode: 'hybrid',
    algorithm: 'blake2b512',
    prefix: 'sk',
    separator: '_',
    case: 'lower',
    security: {
      enhanceEntropy: true,
      avoidAmbiguousChars: true,
    },
  });
  console.log(`   ${apiKey}\n`);

  // Example 9: Transaction ID
  console.log('9. Transaction ID:');
  const txId = await generateId({
    length: 24,
    mode: 'hash',
    algorithm: 'sha3-512',
    prefix: 'TXN',
    checksum: true,
    case: 'upper',
    security: {
      timestampEmbed: true,
      avoidAmbiguousChars: true,
    },
  });
  console.log(`   ${txId}\n`);

  // Example 10: Multiple IDs
  console.log('10. Generate 5 IDs:');
  for (let i = 0; i < 5; i++) {
    const id = await generateId({ length: 20, case: 'upper' });
    console.log(`    ${i + 1}. ${id}`);
  }

  console.log('\n=== Examples Complete ===');
}

// Run examples
runExamples().catch(console.error);
