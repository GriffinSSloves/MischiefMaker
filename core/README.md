# MischiefMaker Core

Core steganography engine for MischiefMaker, designed to be platform-agnostic and used across web and mobile implementations.

## Tech Stack

- **TypeScript** - Type safety and better DX
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Interface-driven design** - Platform abstraction through dependency injection

## Architecture

The core module follows clean architecture principles with well-defined interfaces to ensure cross-platform compatibility.

### Design Principles

- **Platform Agnostic**: Core logic is independent of specific platform implementations
- **Dependency Injection**: Platform-specific clients are injected at runtime
- **Minimal Interfaces**: Only essential functions exposed, extensible as needed
- **Type Safety**: Full TypeScript support with comprehensive type definitions

## Project Structure

```
core/
├── README.md
├── package.json
├── src/
│   ├── interfaces/           # Abstract interfaces for platform dependencies
│   │   ├── ImageProcessor.ts
│   │   └── FileSystem.ts
│   ├── services/            # Core steganography services
│   │   └── SteganographyService.ts
│   ├── algorithms/          # Steganography algorithm implementations
│   │   ├── LSBEncoder.ts
│   │   └── LSBDecoder.ts
│   ├── models/              # Data models and types
│   │   ├── SteganographyOptions.ts
│   │   └── ProcessingResult.ts
│   └── errors/              # Custom error types
│       └── SteganographyError.ts
└── tests/                   # Test files
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm package manager

### Installation

1. Install dependencies:

```bash
npm install
```

2. Build the library:

```bash
npm run build
```

## Available Scripts

- `npm run build` - Build the library
- `npm run dev` - Build in watch mode
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run lint` - Run ESLint
- `npm run clean` - Clean build artifacts

## Usage Example

```typescript
import { SteganographyService } from '@mischiefmaker/core';

// Platform-specific implementations injected at runtime
const steganographyService = new SteganographyService({
  imageProcessor: webImageProcessor, // or mobileImageProcessor
  fileSystem: webFileSystem
});

// Encode a message
const result = await steganographyService.encode({
  message: "Secret message",
  imageData: inputImageBuffer,
  format: "png"
});

// Decode a message
const decoded = await steganographyService.decode({
  imageData: steganographicImageBuffer
});
```

## Core Interfaces

### ImageProcessor Interface
Minimal interface for image manipulation operations:
- Load images from buffers
- Access and modify pixel data
- Convert images back to buffers

### FileSystem Interface
Basic file operations:
- Read/write files
- File existence checks

## Supported Formats

- **PNG** (recommended for lossless encoding)
- **JPEG** (with quality considerations)

## Development

This module is designed to be consumed by the web and mobile applications. Platform-specific implementations should provide concrete implementations of the core interfaces.

## Testing

Run tests to ensure everything works correctly:

```bash
# Run tests in watch mode (recommended during development)
npm run test

# Run tests once (useful for CI/CD)
npm run test:run
``` 