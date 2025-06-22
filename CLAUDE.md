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

## Documentation

Project documentation is organized as follows:

- **[Architecture](docs/architecture.md)** - System architecture and technical decisions
- **[Decision Records](docs/decisions.md)** - Architecture Decision Records (ADRs)
- **[Steganography](docs/steganography.md)** - Technical specifications for steganography implementation
- **[Deployment](docs/deployment.md)** - Deployment guides and infrastructure setup
- **Module READMEs** - Each folder (web/, mobile/, core/) contains specific setup documentation

## Development Commands

**IMPORTANT**: Always return to the project root directory after running commands in subdirectories. Use `cd /Users/griffinsloves/dev/MischiefMaker` or equivalent to ensure you're in the correct working directory for subsequent operations.

**TESTING**: Always run relevant tests after making code changes and before committing. Use `cd web && pnpm run test:run && cd ..` for web changes.

### Mobile Development
```bash
# React Native commands
npx react-native run-ios
npx react-native run-android
npm run test:mobile
```

### Web Development
```bash
# Navigate to web directory first
cd web/

# Web app commands (using pnpm)
pnpm run dev          # Start development server
pnpm run build        # Build for production
pnpm run preview      # Preview production build
pnpm run lint         # Run ESLint
pnpm run test:run     # Run tests once
pnpm run test         # Run tests in watch mode
pnpm run test:ui      # Run tests with UI

# Always return to root after subdirectory commands
cd ..
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
- **Current Status**: Basic React + TypeScript + Vite + TailwindCSS setup complete
- **Pending**: ShadCN UI components, React Router, Prettier configuration

### Shared Core
- Pure JavaScript/TypeScript functions
- No platform-specific dependencies
- Comprehensive error handling and validation