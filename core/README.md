# MischiefMaker Core

Core steganography engine for MischiefMaker, designed to be platform-agnostic and used across web and mobile implementations.

## Current Status

**✅ JP3G Fork Implementation Working**

The jp3g fork DCT coefficient steganography implementation is now functional, except for minor visual improvements:

- **✅ DCT Coefficient Manipulation**: Direct JPEG DCT coefficient modification working
- **✅ Full JPEG Encoder/Decoder**: Complete JPEG processing pipeline implemented
- **✅ Message Embedding/Extraction**: Core steganography functionality operational
- **✅ Comprehensive Testing**: 275+ tests passing with extensive coverage
- **🔄 Minor Visual Improvements**: Some quality optimizations remaining

**Legacy LSB Implementation**: The original pixel-domain LSB implementation (275 tests passing) remains available but cannot survive JPEG compression used by messaging services.

The jp3g fork provides true messaging service compatibility (iMessage, WhatsApp, SMS/MMS) by working directly with JPEG's frequency domain coefficients.

## Tech Stack

- **TypeScript** - Type safety and better DX
- **Vitest** - Testing framework
- **ESLint** - Code linting
- **Interface-driven design** - Platform abstraction through dependency injection

## Coding Standards

### Interface Naming Convention

- **All interfaces must start with `I`** (e.g., `IImageProcessor`, `ISteganographyEngine`)
- This clearly distinguishes interfaces from classes and types

### Import Convention

- **Avoid internal `index.ts` files** - import directly from source files
- **Use explicit imports** to show exactly where types/interfaces come from

```typescript
// ✅ Good - direct imports
import { PixelData } from '../types/DataTypes';
import { ISteganographyEngine } from '../interfaces/ISteganographyEngine';

// ❌ Avoid - internal index.ts redirections
import { PixelData } from '../types';
import { ISteganographyEngine } from '../interfaces';
```

**Exception**: The main `src/index.ts` is the **public API entry point** and is required for package exports.

## Architecture

The core module follows clean architecture principles with well-defined interfaces to ensure cross-platform compatibility.

### Design Principles

- **Platform Agnostic**: Core logic is independent of specific platform implementations
- **Dependency Injection**: Platform-specific clients are injected at runtime
- **Minimal Interfaces**: Only essential functions exposed, extensible as needed
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Automatic Method Selection**: Engine handles encoding method complexity transparently

## Project Structure

Example files, does not reflect all current files.

```
core/
├── README.md
├── package.json
├── src/
│   ├── interfaces/           # Abstract interfaces for platform dependencies
│   │   ├── FileSystem.ts
│   │   ├── ImageProcessor.ts
│   ├── types/               # Type definitions (atomized into individual files)
│   │   ├── SteganographyHeader.ts
│   │   ├── PixelData.ts
│   ├── utils/               # Utility classes (each in own folder)
│   │   ├── BitOperations/
│   │   │   ├── BitOperations.ts
│   │   │   └── BitOperations.test.ts
│   └── algorithms/          # Algorithm implementations (planned)
│       └── utils/
// todo, add the test folder w/ integration and utils subfolders here.
```

## Technical Documentation

For detailed algorithm specifications and implementation details:

- **[Algorithm Specification](docs/algorithm.md)** - DCT coefficient steganography algorithm design and implementation strategy
- **[Image Technical Considerations](docs/image-technical-considerations.md)** - Detailed DCT implementation guide, library requirements, and technical deep-dive
- **[JP3G Fork Documentation](src/jp3gFork/README.md)** - Comprehensive documentation for the working DCT steganography implementation

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm package manager

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Build the library:

```bash
pnpm run build
```

## Available Scripts

- `pnpm run build` - Build the library
- `pnpm run dev` - Build in watch mode
- `pnpm run test` - Run tests in watch mode
- `pnpm run test:run` - Run tests once
- `pnpm run test:ui` - Run tests with UI interface
- `pnpm run coverage` - Run tests with coverage report
- `pnpm run lint` - Run ESLint
- `pnpm run lint:fix` - Run ESLint with auto-fix
- `pnpm run format` - Format code with Prettier
- `pnpm run format:check` - Check code formatting
- `pnpm run type-check` - Run TypeScript type checking
- `pnpm run clean` - Clean build artifacts
- `pnpm run pre-commit` - Run all pre-commit checks (format, lint, type-check, build)

## Usage Example

### In Web Package

```typescript
// web/src/utils/steganography.ts
import { SteganographyEngine } from '@mischiefmaker/core';

// Platform-specific implementations injected at runtime
const steganographyEngine = new SteganographyEngine(
  webImageProcessor // Canvas API implementation
);

// Encode a message
const result = await steganographyEngine.encodeMessage(
  inputImageBuffer,
  'Secret message',
  { quality: 85, maxSize: 1024 * 1024 } // Optional compression options
);

// Decode a message
const decoded = await steganographyEngine.decodeMessage(steganographicImageBuffer);

// Check capacity before encoding
const capacity = await steganographyEngine.checkCapacity(imageBuffer, message.length);
```

### Workspace Development

The core package is automatically linked during development:

- Changes to core are instantly reflected in web/mobile packages
- No manual building or publishing required
- Hot reloading works across packages

## Core Features

### SteganographyEngine (Deprecated - Needs DCT Implementation)

Current pixel-domain implementation (275 tests passing) but requires DCT coefficient rewrite:

- ✅ **Solid foundation** - Complete utilities, interfaces, and architecture
- ✅ **Comprehensive testing** - 275 tests with full coverage and error handling
- ❌ **Pixel-domain limitation** - Cannot survive JPEG compression by messaging services
- 🔄 **Requires DCT pivot** - Need platform-specific JPEG libraries for coefficient manipulation

### ImageProcessor Interface (Needs DCT Update)

Current interface designed for pixel-domain processing, will be updated for DCT coefficient manipulation:

- **Future: DCT coefficient extraction** - Parse JPEG structure and extract coefficients
- **Future: AC coefficient modification** - Modify frequency domain coefficients
- **Future: JPEG rebuilding** - Reconstruct JPEG from modified coefficients
- **Current: Basic image processing** - Compression, format conversion (still useful)

### FileSystem Interface

Basic file operations:

- Read/write files
- File existence checks

## Supported Formats

- **PNG** (recommended for lossless encoding)
- **JPEG** (with quality considerations)

## Development

This module is designed to be consumed by the web and mobile applications. Platform-specific implementations should provide concrete implementations of the core interfaces.

## Development Workflow

### Before Committing

Always run the pre-commit checks to ensure code quality:

```bash
pnpm run pre-commit
```

This command will:

- ✅ Check code formatting with Prettier
- ✅ Lint code with ESLint
- ✅ Type-check with TypeScript
- ✅ Build the project to catch any build errors

If any step fails, fix the issues before committing. For formatting issues, run:

```bash
pnpm run format
```

## Code Quality

This project uses **ESLint** and **Prettier** for code quality and formatting, matching the web app configuration.

## Testing

This project uses **Vitest** for unit testing with comprehensive coverage reporting.

### Running Tests

```bash
# Run tests in watch mode (recommended during development)
pnpm run test

# Run tests once (useful for CI/CD)
pnpm run test:run

# Run tests with interactive UI
pnpm run test:ui

# Run tests with coverage report
pnpm run coverage
```
