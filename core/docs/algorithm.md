# Steganography Algorithm Documentation

## Overview

MischiefMaker uses **DCT coefficient steganography** for JPEG images, designed for messaging service compatibility. This approach modifies JPEG compression coefficients directly, ensuring hidden messages survive additional JPEG compression by iMessage, WhatsApp, SMS/MMS, and other messaging services.

## Core Strategy

### **DCT Coefficient Manipulation**

1. **Parse JPEG structure** - Extract DCT coefficients without full decompression
2. **Modify AC coefficients** - Embed message bits in less significant AC coefficients
3. **Preserve DC coefficients** - Maintain image quality and visual integrity
4. **Rebuild JPEG** - Generate new JPEG with embedded message

### **Why This Works**

- **Messaging services** perform JPEG-to-JPEG compression
- **DCT coefficient changes** are preserved during re-compression
- **AC coefficient LSBs** are less perceptually significant
- **No pixel-domain artifacts** from compression/decompression cycles

## Technical Foundation

### **JPEG Compression Process**

```
Original Image → DCT Transform → Quantization → Entropy Encoding → JPEG File
```

### **Our Steganography Process**

```
JPEG File → Parse Structure → Extract DCT Coefficients → Modify AC Coefficients → Rebuild JPEG
```

### **Why Pixel-Domain LSB Fails**

The previous approach (pixel-domain LSB) cannot work with JPEG compression:

1. **DCT Transform** - Pixels converted to frequency coefficients
2. **Quantization** - Throws away "less important" frequency data (lossy)
3. **Inverse DCT** - Reconstructs pixels with completely different values
4. **LSB destruction** - Original LSB relationships are completely lost

**Example:**

```
Original pixel: 150 (LSB = 0)
After JPEG:     142 (LSB = 0) ✓ Sometimes preserved by chance
After JPEG:     157 (LSB = 1) ❌ LSB flipped - message destroyed
```

## DCT Coefficient Steganography

### **Algorithm Strategy**

**Target**: AC coefficients in JPEG DCT blocks
**Method**: Modify least significant bits of non-zero AC coefficients
**Preservation**: Keep DC coefficients unchanged for image quality

### **Implementation Approach**

1. **Parse JPEG** - Extract DCT coefficients using specialized libraries
2. **Identify AC coefficients** - Find non-zero AC coefficients suitable for modification
3. **Embed message** - Modify coefficient LSBs with message bits
4. **Maintain structure** - Preserve JPEG compression structure
5. **Rebuild JPEG** - Generate new JPEG with modified coefficients

### **Coefficient Selection Strategy**

- **Skip DC coefficients** - Preserve image luminance and color
- **Target AC coefficients** - Modify frequency domain coefficients
- **Avoid zero coefficients** - Only modify non-zero coefficients
- **Redundancy encoding** - Use error correction for reliability

## Data Structure

```
[Magic Signature: 32 bits]  # "MSCH" - MischiefMaker identifier
[Version: 8 bits]           # Algorithm version
[Message Length: 32 bits]   # Payload size in bytes
[Encoding Method: 8 bits]   # DCT coefficient method used
[Checksum: 32 bits]         # CRC32 for error detection
[Message: Variable]         # Actual secret message
```

**Header Size**: 14 bytes (encoded in DCT coefficients)

## Messaging Service Compatibility

### **Target Standards**

// TODO: Add max size, based on online reports, remove coefficient preservation since it's fluff.
| Service | JPEG Quality | Coefficient Preservation |
| -------- | ------------ | ------------------------------- |
| iMessage | 75% quality | High AC coefficient stability |
| WhatsApp | 65% quality | Medium AC coefficient stability |
| SMS/MMS | 45% quality | Lower but predictable stability |
| Telegram | 75% quality | High AC coefficient stability |

**Strategy**: Embed in AC coefficients that remain stable across quality ranges.

## Platform-Specific Implementation

### **Required Libraries**

**Web Platform:**

- **mozjpeg.js** - JPEG parsing and DCT coefficient access
- **jpegjs** - Alternative JPEG processing library
- **Custom WASM** - For performance-critical operations

**Mobile Platform:**

- **libjpeg-turbo** - Native JPEG processing
- **React Native bindings** - Bridge to native libraries
- **Platform-specific** - iOS/Android native implementations

**Node.js Platform:**

- **sharp** - High-performance image processing
- **libjpeg-turbo** - Direct native bindings
- **Custom modules** - For DCT coefficient access

### **Interface Definition**

```typescript
interface IDCTProcessor {
  // Parse JPEG and extract DCT coefficients
  extractDCTCoefficients(jpeg: Buffer): Promise<DCTCoefficients>;

  // Modify DCT coefficients with message data
  modifyCoefficients(coefficients: DCTCoefficients, message: Buffer): DCTCoefficients;

  // Rebuild JPEG from modified coefficients
  rebuildJPEG(coefficients: DCTCoefficients): Promise<Buffer>;

  // Calculate capacity based on available AC coefficients
  calculateCapacity(coefficients: DCTCoefficients): number;
}

interface DCTCoefficients {
  blocks: DCTBlock[];
  width: number;
  height: number;
  quality: number;
}

interface DCTBlock {
  dc: number; // DC coefficient (preserved)
  ac: number[]; // AC coefficients (modified)
  quantTable: number[]; // Quantization table
}
```

## Algorithm Implementation

### **Encoding Process**

```typescript
async function encodeMessage(jpegImage: Buffer, message: string): Promise<Buffer> {
  // 1. Parse JPEG structure
  const coefficients = await extractDCTCoefficients(jpegImage);

  // 2. Validate capacity
  const capacity = calculateCapacity(coefficients);
  if (message.length > capacity) {
    throw new Error(`Message too large. Max: ${capacity} bytes`);
  }

  // 3. Create header
  const messageBytes = new TextEncoder().encode(message);
  const checksum = calculateCRC32(messageBytes);
  const header = createHeader(messageBytes.length, 'dct-ac', checksum);

  // 4. Embed header + message in AC coefficients
  const dataToEmbed = concatenateBytes(header, messageBytes);
  const modifiedCoefficients = modifyCoefficients(coefficients, dataToEmbed);

  // 5. Rebuild JPEG
  return await rebuildJPEG(modifiedCoefficients);
}
```

### **Decoding Process**

```typescript
async function decodeMessage(jpegImage: Buffer): Promise<string> {
  // 1. Parse JPEG structure
  const coefficients = await extractDCTCoefficients(jpegImage);

  // 2. Extract and validate header
  const header = extractHeaderFromCoefficients(coefficients);
  if (header.magic !== MAGIC_SIGNATURE) {
    throw new Error('Not a MischiefMaker image');
  }

  // 3. Extract message from AC coefficients
  const messageBytes = extractMessageFromCoefficients(coefficients, header);

  // 4. Validate checksum
  const calculatedChecksum = calculateCRC32(messageBytes);
  if (calculatedChecksum !== header.checksum) {
    throw new Error('Message corrupted - checksum mismatch');
  }

  // 5. Convert to string
  return new TextDecoder().decode(messageBytes);
}
```

## Configuration

```typescript
const ALGORITHM_CONFIG = {
  MAGIC_SIGNATURE: 0x4d534348, // "MSCH"
  CURRENT_VERSION: 2, // DCT coefficient version
  ENCODING_METHOD: 'dct-ac', // DCT AC coefficient method
  MIN_COEFFICIENT_VALUE: 2, // Skip small coefficients
  MAX_COEFFICIENT_MODIFICATION: 1, // ±1 modification limit
  REDUNDANCY_FACTOR: 3, // Triple redundancy for reliability
  SKIP_DC_COEFFICIENTS: true, // Preserve image quality
  TARGET_QUALITY_RANGE: [45, 85], // Compatible quality range
};
```

## Reliability Strategy

### **Error Correction**

- **Triple redundancy** - Each bit stored in 3 different AC coefficients
- **Majority voting** - Decode using most common value
- **Coefficient validation** - Skip coefficients too small to modify reliably
- **Checksum verification** - CRC32 validation for data integrity

### **Quality Preservation**

- **DC coefficient preservation** - Maintain image brightness and color
- **Minimal modifications** - Only ±1 changes to AC coefficients
- **Quantization awareness** - Respect existing quantization tables
- **Visual quality testing** - Ensure changes remain imperceptible

## Testing Strategy

### **Quality Assurance**

- **PSNR/SSIM testing** - Measure image quality degradation
- **Visual inspection** - Human perceptibility testing
- **Coefficient stability** - Track coefficient changes across quality levels
- **Capacity optimization** - Maximize message capacity while maintaining reliability

## Implementation Phases

### **Phase 1: Research & Library Selection**

- Evaluate JPEG DCT libraries for each platform
- Test coefficient extraction and modification capabilities
- Benchmark performance and compatibility

### **Phase 2: Core Algorithm Development**

- Implement DCT coefficient parsing and modification
- Build error correction and redundancy systems
- Create comprehensive test suite

### **Phase 3: Platform Integration**

- Integrate with web, mobile, and Node.js platforms
- Implement platform-specific optimizations
- Validate messaging service compatibility

### **Phase 4: Production Optimization**

- Performance optimization for real-time usage
- Memory optimization for mobile platforms
- User experience polish and error handling

## References

- **JPEG Standard**: ISO/IEC 10918-1 (DCT-based compression)
- **DCT Steganography**: "Steganography in JPEG compressed images" research
- **libjpeg-turbo**: High-performance JPEG library
- **mozjpeg**: Mozilla's JPEG encoder optimizations
