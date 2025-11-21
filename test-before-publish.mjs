import { generateId, generateRandomSalt } from './dist/index.js';

console.log('🧪 Testing package before publish...\n');

// Test 1: Basic generation (no secrets needed)
const id1 = await generateId({ length: 16 });
console.log('✅ Test 1: Basic generation:', id1);

// Test 2: With environment variable (should not crash if empty)
const id2 = await generateId({
  secret: process.env.TEST_SECRET || undefined,
  mode: 'random'
});
console.log('✅ Test 2: Environment variable:', id2);

// Test 3: HMAC with secret
const id3 = await generateId({
  secret: 'test-secret',
  mode: 'hmac',
  length: 24
});
console.log('✅ Test 3: HMAC mode:', id3);

// Test 4: Salt generation
const salt = generateRandomSalt();
console.log('✅ Test 4: Random salt:', salt.substring(0, 32) + '...');

console.log('\n✅ All tests passed! Safe to publish.');