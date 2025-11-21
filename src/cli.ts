#!/usr/bin/env node

/**
 * CLI for @hixbe/sig
 */

import { Command } from 'commander';
import { generateId } from './generator';
import { verifyId, parseId } from './helpers';
import { SecureIdOptions, Algorithm, Mode, CaseType } from './types';

const program = new Command();

program
  .name('sig')
  .description('Quantum-Safe Cryptographically Secure ID Generator')
  .version('1.0.0');

// Generate command
program
  .command('generate')
  .description('Generate a secure ID')
  .option('-l, --length <number>', 'ID length', '32')
  .option(
    '-a, --algorithm <algorithm>',
    'Hash algorithm (sha256, sha512, sha3-256, sha3-512, blake2b512, shake256)',
    'sha256'
  )
  .option(
    '-m, --mode <mode>',
    'Generation mode (random, hash, hmac, hybrid, hmac-hash, memory-hard)',
    'random'
  )
  .option('-c, --case <case>', 'Case formatting (upper, lower, mixed)', 'mixed')
  .option('--separator <separator>', 'Separator character(s)', '')
  .option('--separator-length <number>', 'Segment length for separators (2, 3, 4, 8, etc.)', '8')
  .option('--checksum', 'Enable checksums', false)
  .option('--checksum-count <number>', 'Number of checksums', '1')
  .option('--checksum-length <number>', 'Length of each checksum (1-64 chars)', '1')
  .option('--checksum-position <position>', 'Checksum position (start, end, middle)', 'end')
  .option('--prefix <prefix>', 'ID prefix', '')
  .option('--suffix <suffix>', 'ID suffix', '')
  .option('--secret <secret>', 'Secret key for HMAC/memory-hard modes', '')
  .option('--salt <salt>', 'Per-ID salt', '')
  .option('--pepper <pepper>', 'Global pepper', '')
  .option('--enhance-entropy', 'Enhance entropy', false)
  .option('--memory-hard', 'Memory-hard derivation', false)
  .option('--double-hash', 'Double hashing', false)
  .option('--avoid-ambiguous', 'Avoid ambiguous characters', false)
  .option('--charset <charset>', 'Custom character set', '')
  .option('--reseed', 'Periodic reseeding', false)
  .option('--timestamp', 'Embed timestamp', false)
  .option('--counter', 'Embed counter', false)
  .option('-n, --count <number>', 'Number of IDs to generate', '1')
  .action(async (options) => {
    try {
      const idOptions: SecureIdOptions = {
        length: parseInt(options.length),
        algorithm: options.algorithm as Algorithm,
        mode: options.mode as Mode,
        case: options.case as CaseType,
        separator: options.separator,
        separatorLength: parseInt(options.separatorLength),
        checksum: options.checksum,
        checksumCount: parseInt(options.checksumCount),
        checksumLength: parseInt(options.checksumLength),
        checksumPosition: options.checksumPosition,
        prefix: options.prefix,
        suffix: options.suffix,
        secret: options.secret || process.env.SIG_SECRET,
        salt: options.salt,
        pepper: options.pepper || process.env.SIG_PEPPER,
        security: {
          enhanceEntropy: options.enhanceEntropy,
          memoryHard: options.memoryHard,
          doubleHash: options.doubleHash,
          avoidAmbiguousChars: options.avoidAmbiguous,
          enforceCharset: options.charset,
          reseed: options.reseed,
          timestampEmbed: options.timestamp,
          counterEmbed: options.counter,
        },
      };

      const count = parseInt(options.count);
      for (let i = 0; i < count; i++) {
        const id = await generateId(idOptions);
        console.log(id);
      }
    } catch (error) {
      console.error('Error generating ID:', (error as Error).message);
      process.exit(1);
    }
  });

// Verify command
program
  .command('verify <id>')
  .description('Verify a secure ID')
  .option('-a, --algorithm <algorithm>', 'Hash algorithm', 'sha256')
  .option('-m, --mode <mode>', 'Generation mode', 'random')
  .option('--separator <separator>', 'Separator character(s)', '')
  .option('--separator-length <number>', 'Segment length for separators', '8')
  .option('--checksum', 'Verify checksums', false)
  .option('--checksum-count <number>', 'Number of checksums', '1')
  .option('--checksum-length <number>', 'Length of each checksum', '1')
  .option('--checksum-position <position>', 'Checksum position', 'end')
  .option('--prefix <prefix>', 'ID prefix', '')
  .option('--suffix <suffix>', 'ID suffix', '')
  .option('--secret <secret>', 'Secret key', '')
  .option('--salt <salt>', 'Per-ID salt', '')
  .option('--pepper <pepper>', 'Global pepper', '')
  .option('--original <original>', 'Original ID to compare', '')
  .action((id, options) => {
    try {
      const verifyOptions: SecureIdOptions = {
        algorithm: options.algorithm as Algorithm,
        mode: options.mode as Mode,
        separator: options.separator,
        separatorLength: parseInt(options.separatorLength),
        checksum: options.checksum,
        checksumCount: parseInt(options.checksumCount),
        checksumLength: parseInt(options.checksumLength),
        checksumPosition: options.checksumPosition,
        prefix: options.prefix,
        suffix: options.suffix,
        secret: options.secret || process.env.SIG_SECRET,
        salt: options.salt,
        pepper: options.pepper || process.env.SIG_PEPPER,
      };

      const isValid = verifyId(id, {
        ...verifyOptions,
        originalId: options.original,
      });

      console.log(`ID Verification: ${isValid ? 'VALID ✓' : 'INVALID ✗'}`);

      if (isValid) {
        const parsed = parseId(id, verifyOptions);
        console.log('\nID Structure:');
        console.log(`  Full ID: ${parsed.fullId}`);
        console.log(`  Core ID: ${parsed.coreId}`);
        if (parsed.prefix) console.log(`  Prefix: ${parsed.prefix}`);
        if (parsed.suffix) console.log(`  Suffix: ${parsed.suffix}`);
        if (parsed.checksums) console.log(`  Checksums: ${parsed.checksums.join(', ')}`);
        console.log(
          `  Total Length: ${parsed.totalLength} (${parsed.contentLength} content + ${parsed.totalLength - parsed.contentLength} separators)`
        );
      }

      process.exit(isValid ? 0 : 1);
    } catch (error) {
      console.error('Error verifying ID:', (error as Error).message);
      process.exit(1);
    }
  });

// Parse command
program
  .command('parse <id>')
  .description('Parse and display ID structure')
  .option('--separator <separator>', 'Separator character(s)', '')
  .option('--separator-length <number>', 'Segment length for separators', '8')
  .option('--checksum', 'Parse checksums', false)
  .option('--checksum-count <number>', 'Number of checksums', '1')
  .option('--checksum-length <number>', 'Length of each checksum', '1')
  .option('--checksum-position <position>', 'Checksum position', 'end')
  .option('--prefix <prefix>', 'ID prefix', '')
  .option('--suffix <suffix>', 'ID suffix', '')
  .action((id, options) => {
    try {
      const parseOptions: SecureIdOptions = {
        separator: options.separator,
        separatorLength: parseInt(options.separatorLength),
        checksum: options.checksum,
        checksumCount: parseInt(options.checksumCount),
        checksumLength: parseInt(options.checksumLength),
        checksumPosition: options.checksumPosition,
        prefix: options.prefix,
        suffix: options.suffix,
      };

      const parsed = parseId(id, parseOptions);
      console.log('ID Structure:');
      console.log(`  Full ID: ${parsed.fullId}`);
      console.log(`  Core ID: ${parsed.coreId}`);
      if (parsed.prefix) console.log(`  Prefix: ${parsed.prefix}`);
      if (parsed.suffix) console.log(`  Suffix: ${parsed.suffix}`);
      if (parsed.checksums) console.log(`  Checksums: ${parsed.checksums.join(', ')}`);
      console.log(
        `  Total Length: ${parsed.totalLength} (${parsed.contentLength} content + ${parsed.totalLength - parsed.contentLength} separators)`
      );
      console.log(`  Core Length: ${parsed.coreId.length}`);
    } catch (error) {
      console.error('Error parsing ID:', (error as Error).message);
      process.exit(1);
    }
  });

program.parse();
