/**
 * @package @hixbe/sig
 *
 * Quantum-Safe Cryptographically Secure ID Generator
 * For high-security applications: auth flows, distributed systems, payment IDs,
 * device IDs, API keys, gift cards, traceable logs.
 *
 * Language: TypeScript (build emits JS + type definitions)
 * Node.js target: 20+
 * Constant-time comparisons for all verifications
 *
 * ---------------------------------------------------
 * Core Features
 * ---------------------------------------------------
 * - CSPRNG-based ID generation with optional post-quantum DRBG hybrid
 * - Configurable algorithms: random bytes, hash, HMAC, hybrid, memory-hard
 * - HMAC signing for tamper-proof IDs
 * - Quantum-resilient hash algorithms: SHA3-256/512, BLAKE2b-512, SHAKE256/XOF
 * - Case control: upper, lower, mixed
 * - Flexible length with automatic entropy adjustment
 * - Checksums (cryptographic) with full positioning support
 * - Custom separators, prefixes, and suffixes
 * - Optional salt and global pepper
 * - Timing-safe verification helpers
 * - Replay and collision resistance (optional timestamp/counter)
 * - Entropy hardening: reseeding, memory-hard, extra randomness cycles
 * - CLI: generate and verify IDs
 *
 * ---------------------------------------------------
 * Example Usage
 * ---------------------------------------------------
 *
 * const id = generateId({
 *   length: 32,
 *   algorithm: 'sha3-512',
 *   mode: 'hmac-hash',
 *   separator: '-',
 *   checksum: true,
 *   checksumCount: 2,
 *   checksumPosition: [5, 10], // custom array positions
 *   prefix: 'HIXBE',
 *   suffix: 'ID',
 *   secret: process.env.SIG_SECRET,
 *   salt: generateRandomSalt(),
 *   pepper: process.env.SIG_PEPPER,
 *   case: 'mixed',
 *   security: {
 *     enhanceEntropy: true,
 *     memoryHard: true,
 *     doubleHash: true,
 *     avoidAmbiguousChars: true,
 *     enforceCharset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
 *     reseed: true,
 *     timestampEmbed: true,
 *   },
 * });
 *
 * console.log(id);
 *
 * ---------------------------------------------------
 * Options Type
 * ---------------------------------------------------
 *
 * @typedef {Object} SecureIdOptions
 *
 * @property {number}   [length=32]       Total ID length (excluding prefix/suffix)
 * @property {string}   [algorithm='sha256']  
 *      - 'sha256', 'sha512', 'sha3-256', 'sha3-512', 'blake2b512', 'shake256' (XOF)
 * @property {string}   [mode='random']   
 *      - 'random' | 'hash' | 'hmac' | 'hybrid' | 'hmac-hash' | 'memory-hard'
 * @property {string}   [case='mixed']   
 *      - 'upper' | 'lower' | 'mixed'
 * @property {string}   [separator='']   
 *      - Character(s) separating ID segments
 * @property {boolean}  [checksum=false]  
 *      - Enable cryptographic checksum blocks
 * @property {number}   [checksumCount=1] 
 *      - Number of checksum segments
 * @property {number[]|string} [checksumPosition='end'] 
 *      - 'start' | 'end' | 'middle' | [array of positions]
 * @property {string}   [prefix='']      
 * @property {string}   [suffix='']      
 * @property {string}   [secret='']      
 *      - Required for HMAC/memory-hard modes
 * @property {string}   [salt='']        
 *      - Optional per-ID salt
 * @property {string}   [pepper='']      
 *      - Global pepper (stored externally)
 * @property {Object}   [security]       
 *      - enhanceEntropy: boolean
 *      - memoryHard: boolean (Argon2-like stretching)
 *      - doubleHash: boolean
 *      - avoidAmbiguousChars: boolean
 *      - enforceCharset: string (custom charset)
 *      - reseed: boolean (periodic entropy reseeding)
 *      - timestampEmbed: boolean (prevents replay)
 *      - counterEmbed: boolean (optional monotonic counter)
 *
 * @returns {string} Quantum-hardened secure ID
 *
 * ---------------------------------------------------
 * Helper APIs
 * ---------------------------------------------------
 *
 * verifyChecksum(id, options) → boolean (timing-safe)
 * verifyHmac(id, secret) → boolean (timing-safe)
 * extractCoreId(id, options) → string (removes prefix/suffix/checksum)
 * verifyId(id, options) → boolean (full integrity + HMAC + checksum)
 *
 * ---------------------------------------------------
 * CLI
 * ---------------------------------------------------
 *
 * npx @hixbe/sig generate [options]
 * npx @hixbe/sig verify <id> [options]
 *
 * CLI Options:
 * - --length, --algorithm, --mode, --case
 * - --separator, --checksum, --checksum-count, --checksum-position
 * - --prefix, --suffix
 * - --secret, --salt, --pepper
 * - --security flags: enhanceEntropy, memoryHard, doubleHash, avoidAmbiguousChars, timestampEmbed
 *
 * ---------------------------------------------------
 * Security Notes
 * ---------------------------------------------------
 * - All verification uses crypto.timingSafeEqual
 * - Optional HKDF key derivation: derivedKey = HKDF(secret + pepper + salt)
 * - Quantum-resilient hashes (SHA3/BLAKE2b/SHAKE) recommended
 * - Avoid predictable salts/secrets; store peppers externally
 * - Optional timestamp/counter embeds prevent replay attacks
 * - Entropy reseeding mitigates CSPRNG exhaustion
 * - Use memory-hard modes for critical IDs to slow brute-force attempts
 */
