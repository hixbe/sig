# Quick Start Guide - @webx/sig v2.0

Get started with @webx/sig in 5 minutes.

## Installation

```bash
npm install @webx/sig
```

## Development Setup

```bash
git clone <repository>
cd sig
npm install
npm run build
```

## Test the Package

### 1. Run Examples
```bash
node dist/examples.js
```

### 2. Try CLI Commands

Generate a simple ID:
```bash
node dist/cli.js generate
```

Generate with options:
```bash
node dist/cli.js generate --length 32 --prefix "API" --separator "-" --case upper
```

Generate with custom separator segments:
```bash
node dist/cli.js generate --length 24 --separator "-" --separator-length 3 --prefix "ID"
```

Generate multiple IDs:
```bash
node dist/cli.js generate --count 5 --length 20
```

Generate with checksum:
```bash
node dist/cli.js generate --length 24 --checksum --checksum-count 1
```

Verify an ID:
```bash
node dist/cli.js verify "YOUR-ID-HERE" --prefix "YOUR" --separator "-"
```

Parse an ID:
```bash
node dist/cli.js parse "YOUR-ID-HERE" --prefix "YOUR" --separator "-"
```

### 3. Use in Code

Create a test file `test.mjs`:
```javascript
import { generateId, verifyId } from '@webx/sig';

async function test() {
  // Generate ID (async in v2.0)
  const id = await generateId({
    length: 32,
    prefix: 'TEST',
    separator: '-',
    checksum: true,
  });

  console.log('Generated:', id);

  // Verify ID (synchronous)
  const isValid = verifyId(id, {
    prefix: 'TEST',
    separator: '-',
    checksum: true,
  });

  console.log('Valid:', isValid);
}

test().catch(console.error);
```

Run it:
```bash
node test.mjs
```

## Package Structure

```
sig/
├── src/              # TypeScript source files
│   ├── index.ts      # Main entry point
│   ├── types.ts      # Type definitions
│   ├── generator.ts  # ID generation logic
│   ├── helpers.ts    # Verification helpers
│   ├── crypto-utils.ts # Cryptographic utilities
│   ├── cli.ts        # CLI implementation
│   └── examples.ts   # Usage examples
├── dist/             # Compiled JavaScript (after build)
├── package.json      # Package configuration
├── tsconfig.json     # TypeScript configuration
├── README.md         # Full documentation
└── LICENSE           # MIT License
```

## Development

Watch mode (auto-rebuild on changes):
```bash
npm run dev
```

Build:
```bash
npm run build
```

## Common Use Cases

### API Keys
```javascript
const apiKey = await generateId({
  length: 48,
  mode: 'hmac',
  prefix: 'sk',
  separator: '_',
  separatorLength: 8,  // Segments of 8 characters
  secret: process.env.API_SECRET,
});
// Result: sk_mK7P9n2v_L8wR4tY6_uI3oE5aS1_dF0gH...
```

### Session Tokens
```javascript
const sessionId = await generateId({
  length: 32,
  security: {
    ttl: 3600,
    embedExpiry: true,
  },
});
```

### Transaction IDs
```javascript
const txId = await generateId({
  length: 24,
  prefix: 'TXN',
  checksum: true,
  security: {
    timestampEmbed: true,
  },
});
```

### Using Salt and Pepper (Maximum Security)
```javascript
import { generateId, generateRandomSalt } from '@webx/sig';

// Salt: Random per-ID value (store with the ID in database)
const salt = generateRandomSalt();

// Pepper: Global secret value (store in environment variable, NEVER in database)
const pepper = process.env.SIG_PEPPER || 'global-secret-pepper-value';

const id = await generateId({
  length: 32,
  mode: 'hmac-hash',     // Best mode for salt+pepper
  algorithm: 'sha3-256',
  secret: process.env.SECRET_KEY,  // Application secret
  salt,                             // Per-ID randomness
  pepper,                           // Global secret
  separator: '-',
  checksum: true,
});

// Store in database
database.save({ 
  userId: '123',
  id,
  salt,        // ✅ Store salt with ID
  // ❌ NEVER store pepper in database
});
```

**Salt vs Pepper:**
- **Salt**: Random per-ID, stored WITH the ID in your database
- **Pepper**: Global secret, stored in ENV variables or secrets manager
- **Secret**: Application key for HMAC signing

**Why use both?**
- **Salt** prevents rainbow table attacks and ensures uniqueness
- **Pepper** adds a global secret layer that attackers can't access even if they breach your database
- Together they provide defense-in-depth security

## Next Steps

1. Read the full [README.md](./README.md) for comprehensive documentation
2. Explore [advanced features](./ADVANCED.md) - rate limiting, TTL, revocation, etc.
3. Check [examples.ts](./src/examples.ts) for basic patterns
4. See [examples-advanced.ts](./src/examples-advanced.ts) for enterprise features
5. Try different algorithms: sha3-256, sha3-512, blake2b512, shake256
6. Review [PUBLISHING.md](./PUBLISHING.md) for deployment guide

## Key Changes in v2.0

- **Async by default**: `generateId()` returns `Promise<string>`
- **15+ new security features**: Rate limiting, TTL, revocation, MFA, etc.
- **Better performance**: Entropy pool management
- **Enhanced verification**: Multi-factor support

## Publishing

To publish to npm:
```bash
npm publish --access public
```

Or use it locally by linking:
```bash
npm link
```

Then in another project:
```bash
npm link @webx/sig
```
