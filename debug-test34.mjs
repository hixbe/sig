import { generateId, parseId } from './dist/index.js';

console.log('Debug Test 34: Payment ID expiry\n');

const config = {
  length: 32,
  checksum: true,
  mode: 'hybrid',
  prefix: 'PAY',
  separator: '-',
  separatorLength: 4,
  case: 'UPPER',
  security: {
    timestampEmbed: true,
    embedExpiry: true,
    ttl: 1800, // 30 min
  },
};

console.log('Config:', JSON.stringify(config, null, 2));

const id = await generateId(config);
console.log('\nGenerated ID:', id);

const parsed = parseId(id, config);
console.log('\nParsed:');
console.log('  hasExpiry:', parsed.hasExpiry);
console.log('  expiresAt:', parsed.expiresAt);
console.log('  expiresAt date:', parsed.expiresAt ? new Date(parsed.expiresAt).toISOString() : 'undefined');
console.log('  isExpired:', parsed.isExpired);
console.log('  Current time:', Date.now());
console.log('  Expiry - now:', parsed.expiresAt ? (parsed.expiresAt - Date.now()) : 'N/A');
