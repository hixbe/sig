import { generateId, verifyId, parseId } from './dist/index.js';

console.log('Debug Test 7: Four checksums\n');

const config = {
  length: 32,
  checksum: true,
  checksumCount: 4,
  checksumLength: 4,
  checksumPosition: [6, 12, 18, 24],
};

const id = await generateId(config);
console.log('Generated ID:', id);
console.log('ID length:', id.length);

const parsed = parseId(id, config);
console.log('\nParsed:');
console.log('  Core:', parsed.coreId);
console.log('  Core length:', parsed.coreLength);
console.log('  Checksums:', parsed.checksums);
console.log('  Checksum count:', parsed.checksums?.length);

const verified = verifyId(id, config);
console.log('\nVerification:', verified);

// Test with position 'end' instead
console.log('\n---\nTest with position "end":\n');
const config2 = {
  length: 32,
  checksum: true,
  checksumCount: 4,
  checksumLength: 4,
  checksumPosition: 'end',
};

const id2 = await generateId(config2);
console.log('Generated ID:', id2);
const verified2 = verifyId(id2, config2);
console.log('Verification:', verified2);
