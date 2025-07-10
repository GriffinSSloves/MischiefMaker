# MischiefMaker Core

Core steganography engine for MischiefMaker, designed to be platform-agnostic and used across web and mobile implementations.

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

- **[Algorithm Specification](docs/algorithm.md)** - LSB steganography algorithm design and implementation strategy
- **[Image Technical Considerations](docs/image-technical-considerations.md)** - Detailed calculations, implementation examples, and technical deep-dive

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
import { SteganographyService } from '@mischiefmaker/core';

// Platform-specific implementations injected at runtime
const steganographyService = new SteganographyService({
  imageProcessor: webImageProcessor, // Canvas API implementation
  fileSystem: webFileSystem, // File API implementation
});

// Encode a message
const result = await steganographyService.encode({
  message: 'Secret message',
  imageData: inputImageBuffer,
  format: 'png',
});

// Decode a message
const decoded = await steganographyService.decode({
  imageData: steganographicImageBuffer,
});
```

### Workspace Development

The core package is automatically linked during development:

- Changes to core are instantly reflected in web/mobile packages
- No manual building or publishing required
- Hot reloading works across packages

## Core Interfaces

### ImageProcessor Interface

Minimal interface for image manipulation operations with clear, workflow-specific function names:

- **Preprocess images** - Convert any format to JPEG with steganography-optimized compression
- **Decompress JPEGs** - Convert JPEG to intermediate format for processing
- **Convert pixel data** - Transform intermediate format to LSB-ready pixel data
- **Apply modifications** - Update intermediate format with modified pixel data
- **Compress to JPEG** - Generate final JPEG output

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
