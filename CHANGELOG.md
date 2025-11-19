# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-11-19

### Added
- ✨ Customizable checksum length (default: 1 char, range: 1-64 chars)
- ✨ `checksumLength` parameter in all functions and CLI
- ⚡ Reduced minimum core ID length from 16 to 8 characters
- ⚠️ Warning for length < 8 characters
- 📖 Session token usage examples and documentation
- 🤖 Automated versioning and tagging scripts
- 🚀 Automated release workflow on version changes

### Changed
- 💥 **BREAKING:** Default checksum length changed from 8 to 1 character
- 💥 **BREAKING:** Minimum core ID length reduced from 16 to 8 characters
- 📝 Updated README with checksum length examples
- 🔧 CLI now includes `--checksum-length` option for all commands

### Fixed
- 🐛 Verification now correctly handles variable checksum lengths
- 🐛 `extractCoreId` properly removes checksums of any length
- 🐛 `extractChecksums` dynamically extracts based on specified length

## [1.0.0] - 2024-11-18

### Added
- 🎉 Initial release
- 🔐 Quantum-safe cryptographic ID generation
- 🌈 8 algorithms: SHA-256/512, SHA3-256/512, BLAKE2b-512, SHAKE256, Kyber768, Dilithium3
- 🎯 6 generation modes: random, hash, hmac, hybrid, hmac-hash, memory-hard
- ✅ 15 advanced security features
- 🔒 Post-quantum cryptography support
- 🎨 Customizable separators and formatting
- 📦 CLI tool with full feature support
- 📚 Comprehensive documentation
- 🔍 Enterprise-grade security assessment
