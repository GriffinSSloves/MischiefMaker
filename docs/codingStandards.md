# Coding Standards

## Interface Naming Convention

- **All interfaces must start with `I`** (e.g., `IImageProcessor`, `ISteganographyEngine`, `ICapacityCalculator`)
- This clearly distinguishes interfaces from classes and types across all packages
- Apply consistently across web, mobile, and core packages

## Import Conventions

- **Use direct imports from source files** - avoid internal `index.ts` redirections
- **Main package `src/index.ts`** - required as public API entry point for npm packages
- **Benefits**: Clearer code, explicit dependencies, easier refactoring

**Avoid unnecessary aliasing**

- Do not rename imports unless it is _strictly_ required to resolve a name collision.

```typescript
// ✅ Good - direct imports
import { PixelData } from '../types/DataTypes';
import { ISteganographyEngine } from '../interfaces/ISteganographyEngine';
// ✅ Good – keeps original name
import { fDCTQuant } from './dctUtils';

// ❌ Avoid - internal index.ts redirections
import { PixelData } from '../types';
import { ISteganographyEngine } from '../interfaces';
// ❌ Bad – unnecessary alias
import { fDCTQuant as dctQuant } from './dctUtils';
```

When a collision truly exists, use an alias **and** add a short inline comment explaining the reason.

**Exception**: Main package `src/index.ts` files are required as public API entry points for npm packages.

## Separation of Concerns

- **Engine handles complexity** - automatic method selection, no user intervention
- **Clean interfaces** - focused responsibilities, minimal surface area
- **Transparent operations** - results show what happened without exposing complexity
- **Users shouldn't choose encoding methods manually** - engines handle this intelligently
- **Results can show what happened** but users don't need to decide implementation details

## Code Organization

### Co-location Strategy

Tests and related files should be co-located using folder-based organization:

```
src/
├── components/
│   ├── Layout/
│   │   ├── Layout.tsx
│   │   └── Layout.test.tsx
├── utils/
│   ├── CapacityCalculator/
│   │   ├── CapacityCalculator.ts
│   │   └── CapacityCalculator.test.ts
└── interfaces/
    ├── IImageProcessor.ts
    └── ISteganographyEngine.ts
```

### Platform-Agnostic Design

For the core library:

- **No Environment Assumptions**: Don't assume Node.js, browser, or React Native globals
- **Dependency Injection**: Platform-specific operations injected via interfaces
- **Universal JavaScript**: Use only standard JavaScript features available everywhere
- **Interface-Driven**: All platform-specific functionality abstracted behind interfaces

## Error Handling

- **Explicit error types** - use custom error classes with specific error codes
- **Validation at boundaries** - validate inputs at public API entry points
- **Graceful degradation** - provide fallback behavior when possible
- **Clear error messages** - include context and suggested actions

## Testing Standards

- **Comprehensive test coverage** for all utilities and core functionality
- **Real-world scenarios** - test with realistic data sizes and edge cases
- **Bidirectional testing** - for any encode/decode or convert/reconstruct operations
- **Error condition testing** - ensure proper error handling and validation

## Type Safety

- **TypeScript strict mode** - use strict TypeScript configuration
- **Explicit return types** - especially for public API methods
- **Branded types** when needed to prevent primitive obsession
- **Generic constraints** to ensure type safety in utility functions

## Performance Considerations

- **Efficient algorithms** - choose algorithms appropriate for the data size
- **Memory management** - be mindful of large image data in memory
- **Lazy evaluation** when possible to avoid unnecessary computation
- **Parallel operations** where safe and beneficial

## Documentation Standards

- **JSDoc comments** for all public APIs
- **Implementation notes** for complex algorithms
- **Example usage** in documentation
- **Decision rationale** for architectural choices

## Functional Programming Preferences

### Pure Functions Over Static Classes

**Prefer pure functions over classes filled with static methods:**

- **Pure functions** - easier to test, reason about, and compose
- **Avoid static classes** - they're harder to mock and test in isolation
- **Functional composition** - enables better code reuse and modularity
- **Immutable by default** - functions should not modify input parameters

```typescript
// ✅ Good - pure functions
export function calculateCapacity(width: number, height: number): number {
  return width * height * 3; // 3 channels (RGB)
}

export function validatePixelData(pixelData: PixelData): ValidationResult {
  // Pure function that returns validation result without side effects
  return { isValid: true, errors: [] };
}

// ❌ Avoid - static class pattern
export class ImageUtils {
  static calculateCapacity(width: number, height: number): number {
    return width * height * 3;
  }

  static validatePixelData(pixelData: PixelData): ValidationResult {
    return { isValid: true, errors: [] };
  }
}
```

**Benefits of pure functions:**

- **Easier testing** - no need to mock class instances
- **Better tree-shaking** - bundlers can eliminate unused functions
- **Simpler imports** - import only what you need
- **Functional composition** - functions can be easily combined
- **Predictable behavior** - same input always produces same output

**When to use classes:**

- **State management** - when you need to maintain internal state
- **Interface implementation** - when implementing complex interfaces
- **Dependency injection** - when you need to inject dependencies
- **Complex lifecycle** - when you need initialization/cleanup
