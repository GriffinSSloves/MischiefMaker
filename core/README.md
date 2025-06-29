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
- `npm run test:ui` - Run tests with UI interface
- `npm run coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Clean build artifacts
- `npm run pre-commit` - Run all pre-commit checks (format, lint, type-check, build)

## Usage Example

```typescript
import { SteganographyService } from '@mischiefmaker/core';

// Platform-specific implementations injected at runtime
const steganographyService = new SteganographyService({
  imageProcessor: webImageProcessor, // or mobileImageProcessor
  fileSystem: webFileSystem,
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

## Development Workflow

### Before Committing

Always run the pre-commit checks to ensure code quality:

```bash
npm run pre-commit
```

This command will:

- ✅ Check code formatting with Prettier
- ✅ Lint code with ESLint
- ✅ Type-check with TypeScript
- ✅ Build the project to catch any build errors

If any step fails, fix the issues before committing. For formatting issues, run:

```bash
npm run format
```

## Code Quality

This project uses **ESLint** and **Prettier** for code quality and formatting, matching the web app configuration.

## Testing

This project uses **Vitest** for unit testing with comprehensive coverage reporting.

### Running Tests

```bash
# Run tests in watch mode (recommended during development)
npm run test

# Run tests once (useful for CI/CD)
npm run test:run

# Run tests with interactive UI
npm run test:ui

# Run tests with coverage report
npm run coverage
```
