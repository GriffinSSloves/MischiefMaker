# Steganography Algorithm Documentation

## Overview

MischiefMaker uses LSB (Least Significant Bit) steganography with a JPEG-first approach designed for messaging service compatibility. All images are pre-compressed to SMS/MMS standards to prevent further compression by iMessage, WhatsApp, etc.

## Core Strategy

### **JPEG-First Approach**

1. **Pre-compress** images to SMS/MMS quality level (45%)
2. **Embed** message using combination strategy for maximum reliability
3. **Result**: Messaging services see "already compressed" and leave unchanged

### **Why This Works**

- **Messaging services** compress images automatically
- **Pre-compression** prevents additional quality loss
- **LSB modifications** remain invisible after compression
- **Combination strategy** ensures maximum reliability with optimal capacity usage

## Reliability Strategy: Combination Approach

### **Implementation Method**

**Primary Strategy**: Combination approach with automatic fallback

1. **First attempt**: Simple LSB encoding (100% capacity)
2. **If fails**: Fall back to triple redundancy (33% capacity, very high reliability)
3. **If needed**: Future adaptive LSB depth (variable capacity/reliability)

**Benefits**:

- **Optimal capacity**: Uses full capacity when possible
- **High reliability**: Falls back to triple redundancy when needed
- **Automatic selection**: Algorithm chooses best approach based on image characteristics

### **Fallback Sequence**

| Attempt | Method            | Capacity     | Reliability | Use Case                              |
| ------- | ----------------- | ------------ | ----------- | ------------------------------------- |
| 1st     | Simple LSB        | 100% (288KB) | Medium      | Clean images, small messages          |
| 2nd     | Triple Redundancy | 33% (96KB)   | Very High   | Compressed images, messaging services |
| 3rd     | Adaptive LSB      | Variable     | High        | Future enhancement for edge cases     |

**For MischiefMaker**: The combination approach maximizes both capacity and reliability, automatically selecting the best method for each image and message combination.

## Algorithm Components

### **Image Processing**

- **Input**: Any image format (PNG, JPEG, etc.)
- **Compression**: Convert to JPEG at 45% quality, max 1MB, max 1024px
- **Processing**: Load as RGB pixel array for LSB modification
- **Output**: JPEG optimized for messaging services

### **Data Structure**

```
[Magic Signature: 32 bits]  # "MSCH" - MischiefMaker identifier
[Version: 8 bits]           # Algorithm version
[Message Length: 32 bits]   # Payload size in bytes
[Checksum: 32 bits]         # CRC32 for error detection
[Message: Variable]         # Actual secret message
```

**Header Size**: 13 bytes (encoded with same method as message)

### **LSB Configuration**

- **Depth**: 1 LSB per channel (maximum invisibility)
- **Channels**: RGB (Red, Green, Blue)
- **Encoding**: Simple LSB first, triple redundancy fallback
- **Capacity**: 288KB max (simple), 96KB (triple redundancy)

## Messaging Service Compatibility

### **Target Standards**

Based on research and observed behavior:

| Service  | Compression Trigger | Our Pre-Compression |
| -------- | ------------------- | ------------------- |
| iMessage | >3MB → 75% quality  | 45% quality (safer) |
| WhatsApp | >16MB → 65% quality | 45% quality (safer) |
| SMS/MMS  | >1MB → 45% quality  | 45% quality (match) |
| Telegram | >10MB → 75% quality | 45% quality (safer) |

**Strategy**: Target SMS/MMS standards (most restrictive) for universal compatibility.

## Configuration

```typescript
const ALGORITHM_CONFIG = {
  JPEG_QUALITY: 45, // SMS/MMS compatible
  MAX_FILE_SIZE: 1024 * 1024, // 1MB universal limit
  MAX_DIMENSIONS: 1024, // Common dimension limit
  LSB_DEPTH: 1, // 1 LSB per channel
  REDUNDANCY_FACTOR: 3, // Triple encoding for fallback
  MAGIC_SIGNATURE: 0x4d534348, // "MSCH"
  CURRENT_VERSION: 1, // Algorithm version
  ENABLE_FALLBACK: true, // Enable combination strategy
};
```

## Combination Strategy Implementation

### **Encoding Process Overview**

```typescript
async function encodeMessage(image: Buffer, message: string): Promise<Buffer> {
  const jpegImage = await compressToJPEG(image, { quality: 45 });

  try {
    // 1. Try simple LSB first (full capacity)
    return await encodeWithSimpleLSB(jpegImage, message);
  } catch (capacityError) {
    try {
      // 2. Fall back to triple redundancy
      return await encodeWithTripleRedundancy(jpegImage, message);
    } catch (redundancyError) {
      // 3. Future: adaptive LSB depth
      throw new Error('Message too large for image');
    }
  }
}
```

### **Decoding Process Overview**

```typescript
async function decodeMessage(jpegImage: Buffer): Promise<string> {
  const pixelData = loadJPEGPixels(jpegImage);

  // Detect encoding method from header metadata
  const header = extractHeader(pixelData);

  switch (header.encodingMethod) {
    case 'simple':
      return decodeSimpleLSB(pixelData, header);
    case 'triple':
      return decodeTripleRedundancy(pixelData, header);
    default:
      throw new Error('Unsupported encoding method');
  }
}
```

## Key Technical Points

### **JPEG Processing Workflow**

1. Load JPEG file → Decompresses to RGB pixel array
2. Try simple LSB → If successful, use full capacity
3. If fails → Fall back to triple redundancy
4. Save as JPEG → Maintains compression level

### **File Size Impact**

- Hidden messages **replace** LSB data, don't add to file size
- 750KB JPEG + 100KB message = ~750KB ±5KB final file
- Message is encoded in existing pixels, not appended

### **Capacity Calculation**

- Based on **pixel dimensions**, not file size
- 1024×768 image = ~288KB (simple) or ~96KB (triple redundancy)
- Combination strategy maximizes capacity usage

## Implementation Requirements

### **Platform-Specific Interfaces**

```typescript
interface ImageProcessor {
  compressToJPEG(image: Buffer, quality: number): Buffer;
  loadJPEGPixels(jpeg: Buffer): Uint8Array;
  saveJPEGFromPixels(pixels: Uint8Array, width: number, height: number): Buffer;
}

interface SteganographyEngine {
  encodeMessage(image: Buffer, message: string): Promise<Buffer>;
  decodeMessage(image: Buffer): Promise<string>;
  checkCapacity(image: Buffer): Promise<number>;
}
```

### **Core Functions Needed**

- **Magic signature** detection and validation
- **CRC32 checksum** calculation and verification
- **Simple LSB embedding/extraction** (primary method)
- **Triple redundancy LSB embedding/extraction** (fallback)
- **Majority vote decoding** for error correction
- **Encoding method detection** for proper decoding
- **Header parsing** and creation with method metadata
- **Capacity validation** for both encoding methods

## Testing Strategy

### **Messaging Service Validation**

- Test combination strategy across all major services
- Verify fallback mechanism works correctly
- Ensure optimal capacity usage in different scenarios
- Validate visual changes remain imperceptible

### **Error Handling**

- Invalid magic signature detection
- Checksum validation for data integrity
- Capacity overflow prevention with fallback
- Version compatibility checking
- Encoding method detection and validation

## References

For detailed implementation examples, capacity calculations, and complete code samples, see **[Image Technical Considerations](image-technical-considerations.md)**.

- JPEG Standard: ISO/IEC 10918-1
- LSB Steganography: Spatial domain embedding techniques
- Error correction: Redundancy coding principles
- CRC32: Industry standard error detection
