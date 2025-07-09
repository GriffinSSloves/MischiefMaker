# Testing Strategy

## Overview

MischiefMaker uses a comprehensive testing strategy that emphasizes real behavior testing over implementation details. Our approach combines focused unit tests with integration tests to ensure reliable steganography functionality.

## Testing Philosophy

### 1. **Integration Tests + Focused Unit Tests > Over-Mocked Unit Tests**

**✅ Preferred Approach:**

- Integration tests for end-to-end workflows
- Unit tests that use real dependencies for core domain logic
- Minimal, strategic mocking only for external dependencies

**❌ Avoid:**

- Over-mocking that tests implementation details rather than behavior
- Brittle tests that break during refactoring
- Tests that pass but don't catch real bugs

### 2. **Test Real Behavior, Not Implementation Details**

```typescript
// ✅ GOOD: Testing actual behavior
const originalMessage = 'Hello, World!';
const encoder = new SimpleLSBEncoder();
const decoder = new SimpleLSBDecoder();

const encodedData = await encoder.encode(pixelData, messageData, header);
const decodedBytes = await decoder.decode(encodedData, header);
const decodedMessage = new TextDecoder().decode(decodedBytes);

expect(decodedMessage).toBe(originalMessage);

// ❌ BAD: Testing implementation details
expect(extractBits).toHaveBeenCalledWith(pixelData, 64);
expect(deserializeHeader).toHaveBeenCalledWith(headerBits);
```

## Testing Architecture

### Test Co-location Strategy

Tests are co-located with their corresponding code using folder-based organization:

```
src/
├── components/
│   ├── Layout/
│   │   ├── Layout.tsx
│   │   └── Layout.test.tsx
├── pages/
│   ├── Home/
│   │   ├── Home.tsx
│   │   └── Home.test.tsx
├── hooks/
│   ├── useExampleHook/
│   │   ├── useExampleHook.ts
│   │   └── useExampleHook.ts
└── lib/
    ├── exampleUtil/
    │   ├── exampleUtil.ts
    │   └── exampleUtil.test.ts
```

### Test Directory Structure

```
core/
├── src/
│   ├── algorithms/
│   │   ├── SimpleLSBEncoder.ts
│   │   ├── SimpleLSBEncoder.test.ts      # Unit tests
│   │   ├── SimpleLSBDecoder.ts
│   │   └── SimpleLSBDecoder.test.ts      # Unit tests
│   └── utils/
│       ├── BitOperations/
│       │   ├── BitOperations.ts
│       │   └── BitOperations.test.ts
└── tests/
    ├── integration/
    │   └── encode-decode.test.ts          # Integration tests
    └── utils/
        ├── testHelpers.ts                 # Shared test utilities
        └── pixelDataHelpers.ts            # Pixel data test helpers
```

## Testing Categories

### 1. Integration Tests (`tests/integration/`)

**Purpose:** Test complete encode-decode workflows with real data

**Characteristics:**

- Uses actual implementations of all components
- Tests multiple algorithms together
- Validates end-to-end functionality
- Catches integration issues between utilities
- Tests error handling with realistic scenarios

**Example:**

```typescript
describe('Integration: Encode-Decode Workflow', () => {
  it('should encode and decode a simple message', async () => {
    const originalMessage = 'Hello, World!';
    const pixelData = createDeterministicPixelData(100, 100);
    const messageData = new TextEncoder().encode(originalMessage);

    const encoder = new SimpleLSBEncoder();
    const decoder = new SimpleLSBDecoder();

    // 1. Encode the message
    const header = createHeader(originalMessage.length, 'simple-lsb', messageData);
    const encodedPixelData = await encoder.encode(pixelData, messageData, header);

    // 2. Decode the message
    const extractedHeader = await decoder.extractHeader(encodedPixelData);
    const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
    const decodedMessage = new TextDecoder().decode(decodedBytes);

    // 3. Verify round-trip success
    expect(decodedMessage).toBe(originalMessage);
  });
});
```

### 2. Unit Tests (co-located with source)

**Purpose:** Test individual components in isolation with minimal mocking

**Characteristics:**

- Uses real utility functions (BitOperations, HeaderUtility, etc.)
- Focuses on the component's specific responsibilities
- Uses realistic test data from helper functions
- Tests edge cases and error conditions
- Fast execution and reliable

**Example:**

```typescript
describe('SimpleLSBDecoder', () => {
  it('should extract valid header from encoded pixel data', async () => {
    // Create realistic test data
    const originalMessage = 'Hi';
    const messageData = new TextEncoder().encode(originalMessage);
    const pixelData = createTestPixelData(50, 50);

    // Use encoder to create valid encoded pixel data
    const encoder = new SimpleLSBEncoder();
    const header = createHeader(originalMessage.length, 'simple-lsb', messageData);
    const encodedPixelData = await encoder.encode(pixelData, messageData, header);

    // Test the decoder's header extraction
    const extractedHeader = await decoder.extractHeader(encodedPixelData);

    expect(extractedHeader.magicSignature).toBe(0x4d534348);
    expect(extractedHeader.encodingMethod).toBe('simple-lsb');
    expect(extractedHeader.messageLength).toBe(originalMessage.length);
  });
});
```

### 3. Utility Tests (co-located with utilities)

**Purpose:** Test utility functions with comprehensive edge case coverage

**Characteristics:**

- Test mathematical operations and bit manipulations
- Comprehensive input validation
- Performance-critical code paths
- Error handling for invalid inputs

## Mocking Strategy

### What to Mock vs. Not Mock

**✅ DON'T Mock (Core Domain Logic):**

- `BitOperations` - Fundamental bit manipulation
- `HeaderUtility` - Header parsing and validation
- `PixelDataUtility` - Pixel bit extraction
- `ChecksumUtility` - Checksum calculation
- Algorithm classes when testing other algorithms

**❌ DO Mock (External Dependencies):**

- File system operations
- Network calls
- External services
- Slow or unreliable operations
- Browser APIs (when testing in isolation)

### Mocking Guidelines

```typescript
// ✅ GOOD: Minimal, strategic mocking
const mockFileSystem = {
  readFile: vi.fn().mockResolvedValue(testImageBuffer),
  writeFile: vi.fn().mockResolvedValue(undefined),
};

// ❌ BAD: Over-mocking core logic
vi.mock('../utils/BitOperations/BitOperations', () => ({
  extractLSB: vi.fn().mockReturnValue(1),
  setLSB: vi.fn().mockReturnValue(255),
}));
```

## Test Data Management

### Shared Test Helpers (`tests/utils/`)

**Purpose:** Reusable test data generators and validation helpers

**pixelDataHelpers.ts:**

```typescript
/**
 * Create deterministic test pixel data for consistent testing
 */
export function createDeterministicPixelData(width: number, height: number): PixelData {
  const totalPixels = width * height;
  const red = new Array(totalPixels);
  const green = new Array(totalPixels);
  const blue = new Array(totalPixels);

  // Generate deterministic but varied pixel values
  for (let i = 0; i < totalPixels; i++) {
    red[i] = (i * 17) % 256;
    green[i] = (i * 31) % 256;
    blue[i] = (i * 47) % 256;
  }

  return { width, height, channels: { red, green, blue }, totalPixels };
}
```

**testHelpers.ts:**

```typescript
/**
 * Create pixel data with specific bits encoded in LSBs
 */
export function createPixelDataWithBits(width: number, height: number, bits: number[]): PixelData;

/**
 * Validate round-trip encode-decode operation
 */
export function validateRoundTrip(originalMessage: string, algorithm: string): Promise<void>;
```

## Testing Tools

### Framework Stack

- **Test Runner**: Vitest for fast, modern testing
- **Assertions**: Vitest's built-in expect API
- **Mocking**: Vitest's vi mocking utilities (when needed)
- **Coverage**: Vitest coverage reporting

### Test Commands

```bash
# Run all tests
pnpm run test:run

# Run specific test file
pnpm run test:run src/algorithms/SimpleLSBDecoder.test.ts

# Run integration tests only
pnpm run test:run tests/integration/

# Run with coverage
pnpm run test:coverage

# Watch mode for development
pnpm run test
```

## Best Practices

### 1. **Test Naming**

```typescript
// ✅ GOOD: Descriptive test names
it('should encode and decode a simple message', async () => {
it('should fail validation with corrupted message', async () => {
it('should handle maximum message length', async () => {

// ❌ BAD: Vague test names
it('should work', async () => {
it('should handle input', async () => {
```

### 2. **Test Structure**

```typescript
// ✅ GOOD: Clear Arrange-Act-Assert structure
it('should decode message successfully', async () => {
  // Arrange
  const originalMessage = 'Test';
  const pixelData = createTestPixelData(50, 50);
  const encoder = new SimpleLSBEncoder();

  // Act
  const encodedData = await encoder.encode(pixelData, messageData, header);
  const decodedBytes = await decoder.decode(encodedData, header);
  const decodedMessage = new TextDecoder().decode(decodedBytes);

  // Assert
  expect(decodedMessage).toBe(originalMessage);
});
```

### 3. **Error Testing**

```typescript
// ✅ GOOD: Test specific error conditions
it('should reject invalid encoding method', async () => {
  const invalidHeader = { ...validHeader, encodingMethod: 'wrong-method' };

  await expect(decoder.decode(pixelData, invalidHeader)).rejects.toThrow(
    'Invalid encoding method for SimpleLSBDecoder: wrong-method',
  );
});
```

### 4. **Edge Case Coverage**

```typescript
// ✅ GOOD: Test boundary conditions
it('should handle empty message', async () => {
it('should handle single character message', async () => {
it('should handle maximum message length', async () => {
it('should fail with insufficient pixel data', async () => {
```

## AI-Friendly Testing

When working with AI helpers, always use the non-interactive test command:

```bash
# ✅ AI-Friendly: Non-interactive, clean output
pnpm run test:run

# ❌ Avoid: Interactive watch mode
pnpm test
```

This ensures proper exit codes and structured output for automated analysis.

## Continuous Integration

### Test Requirements

- All tests must pass before merging
- Maintain test coverage above 80%
- Integration tests must validate core workflows
- No skipped tests in main branch

### Performance Guidelines

- Unit tests should complete in < 100ms each
- Integration tests should complete in < 1s each
- Total test suite should complete in < 30s
- Use deterministic test data for consistent performance

This testing strategy ensures reliable, maintainable tests that catch real bugs while supporting confident refactoring and feature development.
