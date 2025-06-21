# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MischiefMaker is a cross-platform application for sending secret messages through pictures using steganography. The project targets:
- iOS and Android via React Native
- Web platform with shared core logic
- Shared cryptographic and steganography utilities

## Architecture

This is a monorepo structure designed to share core steganography and cryptographic logic across platforms:

### Core Components
- **Steganography Engine**: Image manipulation and message embedding/extraction
- **Cryptography Layer**: Message encryption/decryption before embedding
- **Shared Business Logic**: Message handling, user management, and validation
- **Platform-Specific UI**: React Native for mobile, React for web

### Directory Structure
```
/
├── core/                  # Shared business logic, steganography, and crypto utilities
├── mobile/                # React Native app
└── web/                   # Web React app
```

## Key Technical Considerations

### Steganography Implementation
- LSB (Least Significant Bit) manipulation for image data
- Support for PNG and JPEG formats
- Canvas API for web, native image libraries for mobile
- Message size limits based on image resolution

### Cross-Platform Shared Code
- Use TypeScript for type safety across platforms
- Abstract platform-specific APIs behind interfaces
- Shared validation and business logic
- Common cryptographic functions

### Security Requirements
- End-to-end encryption before steganography
- Secure key generation and management
- No plaintext message storage
- Secure deletion of temporary data

## Development Commands

Since this is a new repository, common commands will be established as the project grows. Typical patterns will include:

### Mobile Development
```bash
# React Native commands
npx react-native run-ios
npx react-native run-android
npm run test:mobile
```

### Web Development
```bash
# Web app commands
npm run dev:web
npm run build:web
npm run test:web
```

### Shared Package Development
```bash
# Core package testing
npm run test:core
npm run test:steganography
npm run test:crypto
```

## Testing Strategy

- Unit tests for steganography algorithms
- Integration tests for cross-platform shared code
- End-to-end tests for message encoding/decoding workflows
- Security testing for cryptographic implementations
- Visual regression tests for UI components

## Platform-Specific Notes

### React Native
- Use Expo for development convenience
- Native modules may be required for advanced image processing
- Consider memory management for large image files

### Web
- Canvas API for image manipulation
- File API for image upload/download
- Web Workers for CPU-intensive steganography operations

### Shared Core
- Pure JavaScript/TypeScript functions
- No platform-specific dependencies
- Comprehensive error handling and validation