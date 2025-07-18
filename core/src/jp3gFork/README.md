# JP3G Fork - DCT Coefficient Steganography

A comprehensive JPEG steganography implementation that operates directly on DCT (Discrete Cosine Transform) coefficients for true messaging service compatibility.

## Overview

The JP3G Fork is a complete JPEG encoder/decoder library modified to support steganographic message embedding in the frequency domain. Unlike pixel-domain methods that fail under JPEG compression, this implementation works directly with DCT coefficients that survive re-compression by messaging services.

### Key Features

- ** Complete JPEG Processing Pipeline**: Full encoder and decoder with DCT coefficient access
- ** DCT Coefficient Steganography**: Direct manipulation of frequency domain coefficients
- ** Messaging Service Compatible**: Survives JPEG re-compression by iMessage, WhatsApp, SMS/MMS
- ** Comprehensive Testing**: 23+ test files with smoke, integration, and end-to-end tests
- ** Memory Efficient**: Optimized memory management for large images
- ** TypeScript Native**: Full type safety with modern TypeScript patterns

## Architecture

The JP3G Fork consists of four main components:

### 1. JPEG Decoder (`decoder/`)

Based on the industry-standard notmasteryet JPEG decoder with steganography extensions:

- **Huffman Decoding**: Complete implementation of JPEG Huffman tables
- **DCT Block Access**: Direct access to 8x8 DCT coefficient blocks
- **Memory Management**: Efficient allocation and cleanup for large images
- **Marker Parsing**: Full JPEG marker support (JFIF, Adobe, comments)

### 2. JPEG Encoder (`encoder/`)

Fork of Adobe's JPEG encoder optimized for coefficient manipulation:

- **DCT Quantization**: Configurable quality settings and quantization tables
- **Huffman Encoding**: Standard and custom Huffman table generation
- **Bit-level Writing**: Precise control over JPEG bitstream construction
- **Color Space Conversion**: RGB � YUV conversion with lookup tables

### 3. Steganography Client (`client/`)

High-level interface for message embedding and extraction:

- **Message Embedding**: Robust coefficient modification with error detection
- **Message Extraction**: Reliable message recovery with integrity validation
- **DCT Analysis**: Coefficient extraction and analysis utilities
- **Format Validation**: JPEG structure integrity checks

### 4. Utilities and Constants (`utils/`, `constants/`)

Supporting infrastructure:

- **Mathematical Functions**: IDCT, quantization, and zigzag operations
- **Data Tables**: Standard JPEG quantization and Huffman tables
- **Type Definitions**: Complete TypeScript interfaces for all components

## Getting Started

### Basic Usage

```typescript
import { Jp3gForkClient } from './jp3gFork/client/jp3gForkClient';

const client = new Jp3gForkClient();

// Load a JPEG image
const imageBuffer = new Uint8Array(jpegFileData);

// Embed a message
const embedResult = await client.embedMessage(imageBuffer, 'Secret message');
if (embedResult.success) {
  const modifiedJpeg = embedResult.modifiedJpeg;
  // Save or transmit modifiedJpeg
}

// Extract a message
const extractResult = await client.extractMessage(modifiedJpeg);
if (extractResult.success) {
  console.log('Hidden message:', extractResult.message);
}
```

### Advanced DCT Analysis

```typescript
// Parse JPEG and access DCT coefficients directly
const parseResult = await client.parseWithInternalAccess(imageBuffer);
if (parseResult.success) {
  const { dctCoefficients, jpegStructure } = parseResult;

  console.log(`Image: ${jpegStructure.width}x${jpegStructure.height}`);
  console.log(`DCT blocks: ${dctCoefficients.totalBlocks}`);

  // Analyze frequency domain content
  dctCoefficients.blocks.forEach((block, index) => {
    console.log(`Block ${index}: DC=${block.dc}, AC coefficients:`, block.ac);
  });
}
```

## Technical Implementation

### DCT Coefficient Modification Strategy

The steganography algorithm uses a robust coefficient modification approach:

1. **Coefficient Selection**: Target mid-frequency AC coefficients that survive quantization
2. **Modification Pattern**: Use LSB modification with error correction
3. **Capacity Management**: Dynamically adjust based on image content and quality
4. **Integrity Validation**: Include checksums and headers for reliable extraction

### JPEG Compatibility

The implementation maintains full JPEG standard compliance:

- **Standard Quantization Tables**: Uses JPEG-standard quantization matrices
- **Huffman Coding**: Implements both standard and optimized Huffman tables
- **Marker Compliance**: Preserves all JPEG markers and metadata
- **Quality Preservation**: Minimal visual impact through careful coefficient selection

### Memory Management

Optimized for processing large images efficiently:

```typescript
// Memory allocation tracking
import { getBytesAllocated, resetMaxMemoryUsage } from './decoder/utils/memoryManager';

// Process image with memory monitoring
resetMaxMemoryUsage();
const result = await client.parseWithInternalAccess(largeImage);
console.log(`Peak memory usage: ${getBytesAllocated()} bytes`);
```

## Testing

The JP3G Fork includes comprehensive testing across multiple dimensions:

### Test Categories

1. **Unit Tests** (23 files): Individual component testing
   - `BitWriter.test.ts` - Bit-level encoding operations
   - `dctUtils.test.ts` - DCT mathematical functions
   - `huffmanFrequency.test.ts` - Huffman table generation
   - `memoryManager.test.ts` - Memory allocation tracking

2. **Integration Tests**: Component interaction testing
   - `jp3gForkClient.test.ts` - Complete workflow testing
   - `MessageEmbedder.test.ts` - Message embedding validation
   - `MessageExtractor.test.ts` - Message extraction accuracy

3. **Smoke Tests**: Real-world image validation
   - `jp3gForkClient.smoke.test.ts` - Tests with actual JPEG files
   - Multiple test images: FacebookPFP.jpg, IMG_3457.JPG, various formats

4. **End-to-End Tests**: Complete steganography workflows
   - `jp3gForkClient.e2e.test.ts` - Full embed/extract cycles
   - Messaging service compatibility validation

### Running Tests

```bash
# Run all jp3gfork tests
cd core/
pnpm test -- jp3gFork

# Run specific test categories
pnpm test -- jp3gFork/client         # Client tests only
pnpm test -- jp3gFork/encoder        # Encoder tests only
pnpm test -- jp3gFork/decoder        # Decoder tests only
```

## Project Structure

```
jp3gFork/
   README.md                    # This documentation
   client/                      # High-level steganography interface
      jp3gForkClient.ts       # Main client implementation
      jp3gForkClient.test.ts  # Unit tests
      jp3gForkClient.smoke.test.ts  # Real image tests
      jp3gForkClient.e2e.test.ts    # End-to-end tests
      utils/                   # Client utilities
   decoder/                     # JPEG decoder implementation
      jp3gDecoder.ts          # Main decoder (notmasteryet fork)
      utils/                  # Decoder utilities
   encoder/                     # JPEG encoder implementation
      jp3gEncoder.ts          # Main encoder (Adobe fork)
      utils/                  # Encoder utilities
   constants/                   # JPEG standard constants
   types/                       # TypeScript definitions
```

## Performance Characteristics

### Encoding Performance

- **Small images** (< 1MB): ~50-100ms
- **Medium images** (1-5MB): ~200-500ms
- **Large images** (> 5MB): ~1-2 seconds

### Memory Usage

- **Decoder**: ~2-3x image size during processing
- **Encoder**: ~4-5x image size during processing
- **Peak usage**: Automatically tracked and optimized

### Message Capacity

- **Typical capacity**: ~1-3 bytes per 8x8 DCT block
- **High-quality images**: Up to 5-10% of image size
- **Compressed images**: ~1-2% of image size (still functional)

## Messaging Service Compatibility

The JP3G Fork has been tested with various messaging services:

###  Confirmed Compatible

- **iMessage**: Messages survive Apple's JPEG processing
- **WhatsApp**: Compatible with WhatsApp's image compression
- **SMS/MMS**: Works with carrier JPEG processing
- **Email**: Compatible with most email client processing

### = Under Testing

- **Instagram DM**: Testing in progress
- **Facebook Messenger**: Testing in progress
- **Telegram**: Testing in progress

## Future Development

When splitting this into a separate package, consider:

### Package Structure

```
@mischiefmaker/jp3g-fork/
   package.json
   src/
      index.ts              # Public API exports
      client/               # Client interface
      encoder/              # JPEG encoder
      decoder/              # JPEG decoder
      utils/                # Shared utilities
   tests/
      images/               # Test image assets
      integration/          # Integration tests
   docs/
       api.md                # API documentation
       examples/             # Usage examples
```

### API Design

```typescript
// Simplified public API for standalone package
export { Jp3gForkClient as JpegSteganography } from './client/jp3gForkClient';
export type { IJp3gForkEmbedResult as EmbedResult, IJp3gForkParseResult as ParseResult } from './client/jp3gForkClient';

// Advanced API for direct DCT access
export { jp3gDecoder, JPEGEncoder } from './decoder/jp3gDecoder';
export type { JpegImage, DecoderComponent } from './decoder/jp3gDecoder';
```

### Dependencies

- **Runtime**: Only buffer polyfill for browser compatibility
- **Development**: Vitest, TypeScript, ESLint for quality assurance
- **Optional**: Image test assets for validation

## Contributing

When working with the JP3G Fork:

1. **Test Coverage**: Maintain comprehensive test coverage for all changes
2. **Memory Efficiency**: Profile memory usage for large image processing
3. **JPEG Compliance**: Ensure all modifications maintain JPEG standard compliance
4. **Cross-Platform**: Test on both Node.js and browser environments
5. **Documentation**: Update this README for any architectural changes

## License

The JP3G Fork maintains the original licenses of its components:

- **Decoder**: Apache License 2.0 (notmasteryet JPEG decoder)
- **Encoder**: Adobe BSD License (Adobe JPEG encoder)
- **Steganography Extensions**: MIT License (MischiefMaker modifications)

See individual source files for detailed license information.
