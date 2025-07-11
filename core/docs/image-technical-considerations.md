# DCT Coefficient Steganography Implementation

## Overview

This document provides detailed technical implementation guidance for DCT coefficient steganography in JPEG images, which is the only viable approach for messaging service compatibility.

## Why DCT Coefficients Are Required

### **Fundamental Problem with Pixel-Domain LSB**

Pixel-domain LSB steganography **cannot work** with JPEG compression due to the DCT/quantization process:

```
Original Process:
1. Load JPEG → RGB pixels (decompression)
2. Modify pixel LSBs → Hide message
3. Save as JPEG → Compression destroys LSBs

JPEG Compression Process:
Pixels → DCT Transform → Quantization → Entropy Encoding
```

### **Why JPEG Destroys Pixel-Domain LSBs**

**Example of LSB destruction:**

```
Original pixel: 150 (binary: 10010110, LSB = 0)
After LSB modification: 151 (binary: 10010111, LSB = 1)

After JPEG compression/decompression:
Pixel becomes: 142 (binary: 10001110, LSB = 0) ❌ Message bit lost!
```

**Mathematical reality:**

- **30:1 compression ratio** (100KB JPEG → 3MB pixel data)
- **DCT quantization** throws away "perceptually unimportant" frequency data
- **LSB relationships** are considered "noise" and eliminated
- **No amount of redundancy** can overcome systematic coefficient quantization

## DCT Coefficient Steganography Approach

### **How DCT Coefficients Work**

JPEG compression transforms 8×8 pixel blocks into frequency coefficients:

```
8×8 Pixel Block:
[150 151 149 152 ...]
[148 150 152 151 ...]
[...]

DCT Transform:
[DC  AC1 AC2 AC3 ...]  ← Frequency coefficients
[AC8 AC9 AC10...]
[...]

DC = Average brightness (preserved)
AC = Frequency details (target for steganography)
```

### **Why DCT Coefficients Survive Compression**

1. **JPEG-to-JPEG** compression preserves coefficient structure
2. **AC coefficients** represent frequency content, not individual pixels
3. **Small modifications** (±1) to AC coefficients remain stable
4. **Re-quantization** affects coefficients predictably

## Implementation Strategy

### **Core Algorithm**

```typescript
interface DCTSteganography {
  // Main workflow
  encodeMessage(jpegBuffer: Buffer, message: string): Promise<Buffer>;
  decodeMessage(jpegBuffer: Buffer): Promise<string>;

  // Core operations
  extractDCTCoefficients(jpeg: Buffer): Promise<DCTCoefficients>;
  modifyACCoefficients(coefficients: DCTCoefficients, data: Buffer): DCTCoefficients;
  rebuildJPEG(coefficients: DCTCoefficients): Promise<Buffer>;

  // Capacity and validation
  calculateCapacity(coefficients: DCTCoefficients): number;
  validateMessage(coefficients: DCTCoefficients, expectedChecksum: number): boolean;
}
```

### **Data Structures**

```typescript
interface DCTCoefficients {
  blocks: DCTBlock[];
  width: number;
  height: number;
  quality: number;
  quantTables: QuantTable[];
}

interface DCTBlock {
  dc: number; // DC coefficient (preserved)
  ac: number[]; // 63 AC coefficients (modified)
  componentId: number; // Y, Cb, or Cr component
  quantTableId: number; // Quantization table reference
}

interface QuantTable {
  id: number;
  values: number[64]; // 8×8 quantization values
}
```

## Coefficient Selection Strategy

### **AC Coefficient Targeting**

```typescript
function selectModifiableCoefficients(block: DCTBlock): number[] {
  const modifiable = [];

  // Skip DC coefficient (index 0)
  for (let i = 1; i < 64; i++) {
    const coefficient = block.ac[i];

    // Only modify non-zero coefficients
    if (coefficient !== 0) {
      // Skip coefficients too small to modify reliably
      if (Math.abs(coefficient) >= MIN_COEFFICIENT_VALUE) {
        modifiable.push(i);
      }
    }
  }

  return modifiable;
}
```

### **Modification Strategy**

```typescript
function modifyCoefficient(coefficient: number, messageBit: number): number {
  // Modify LSB of coefficient
  const isEven = (coefficient & 1) === 0;
  const shouldBeEven = messageBit === 0;

  if (isEven === shouldBeEven) {
    return coefficient; // No change needed
  }

  // Modify by ±1 to change LSB
  if (coefficient > 0) {
    return shouldBeEven ? coefficient + 1 : coefficient - 1;
  } else {
    return shouldBeEven ? coefficient - 1 : coefficient + 1;
  }
}
```

## Platform-Specific Implementation

### **Unified TypeScript Implementation – jp3g Fork**

All platforms (Node, browser via bundlers, and React Native) now use the **custom TypeScript jp3g fork** that lives in `core/src/jp3gFork`. It provides:

- Full DCT coefficient access preserved via a `dctBlocks` property
- Baseline-standard Huffman tables for re-encoding
- Identical APIs for decoding and re-encoding across environments

The legacy platform-specific examples (mozjpeg.js, libjpeg-turbo, sharp) are kept below for historical reference and alternative integrations but are **not used in the current implementation**.

### **Platform-Specific Libraries**

**All platforms (default)**:

```bash
# Already included in the monorepo source – no external install required
```

**Alternative / Legacy options:**

**Web:**

```bash
npm install mozjpeg-js
npm install jpegjs
```

**Mobile (React Native):**

```bash
npm install react-native-jpeg-turbo
```

**Node.js:**

```bash
npm install sharp libjpeg-turbo-bindings
```

## Embedding Algorithm Implementation

### **Complete Encoding Process**

```typescript
async function encodeMessage(jpegBuffer: Buffer, message: string): Promise<Buffer> {
  // 1. Extract DCT coefficients
  const coefficients = await extractDCTCoefficients(jpegBuffer);

  // 2. Calculate capacity
  const capacity = calculateCapacity(coefficients);
  const messageBytes = new TextEncoder().encode(message);

  if (messageBytes.length > capacity) {
    throw new Error(`Message too large: ${messageBytes.length} bytes, max: ${capacity} bytes`);
  }

  // 3. Create header
  const checksum = calculateCRC32(messageBytes);
  const header = createHeader({
    magic: MAGIC_SIGNATURE,
    version: CURRENT_VERSION,
    messageLength: messageBytes.length,
    encodingMethod: ENCODING_METHOD_DCT,
    checksum: checksum,
  });

  // 4. Combine header and message
  const dataToEmbed = new Uint8Array(header.length + messageBytes.length);
  dataToEmbed.set(header, 0);
  dataToEmbed.set(messageBytes, header.length);

  // 5. Embed with triple redundancy
  const modifiedCoefficients = embedWithTripleRedundancy(coefficients, dataToEmbed);

  // 6. Rebuild JPEG
  return await rebuildJPEG(modifiedCoefficients);
}
```

### **Triple Redundancy Implementation**

```typescript
function embedWithTripleRedundancy(coefficients: DCTCoefficients, data: Uint8Array): DCTCoefficients {
  const modified = cloneDeep(coefficients);
  let coefficientIndex = 0;

  // Find all modifiable coefficients
  const modifiableCoefficients = [];
  for (const block of modified.blocks) {
    const modifiable = selectModifiableCoefficients(block);
    for (const index of modifiable) {
      modifiableCoefficients.push({ block, index });
    }
  }

  // Embed each bit 3 times
  for (let byteIndex = 0; byteIndex < data.length; byteIndex++) {
    const byte = data[byteIndex];

    for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
      const bit = (byte >> bitIndex) & 1;

      // Embed the same bit in 3 different coefficients
      for (let redundancy = 0; redundancy < 3; redundancy++) {
        if (coefficientIndex >= modifiableCoefficients.length) {
          throw new Error('Not enough modifiable coefficients');
        }

        const { block, index } = modifiableCoefficients[coefficientIndex];
        block.ac[index] = modifyCoefficient(block.ac[index], bit);
        coefficientIndex++;
      }
    }
  }

  return modified;
}
```

### **Decoding with Majority Vote**

```typescript
function decodeWithTripleRedundancy(coefficients: DCTCoefficients, messageLength: number): Uint8Array {
  const message = new Uint8Array(messageLength);
  let coefficientIndex = 0;

  // Find all modifiable coefficients (same order as encoding)
  const modifiableCoefficients = [];
  for (const block of coefficients.blocks) {
    const modifiable = selectModifiableCoefficients(block);
    for (const index of modifiable) {
      modifiableCoefficients.push({ block, index });
    }
  }

  // Decode each bit using majority vote
  for (let byteIndex = 0; byteIndex < messageLength; byteIndex++) {
    let byte = 0;

    for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
      let votes = 0;

      // Read the same bit from 3 different coefficients
      for (let redundancy = 0; redundancy < 3; redundancy++) {
        const { block, index } = modifiableCoefficients[coefficientIndex];
        const coefficient = block.ac[index];
        const bit = coefficient & 1;
        votes += bit;
        coefficientIndex++;
      }

      // Majority vote
      const finalBit = votes >= 2 ? 1 : 0;
      byte |= finalBit << bitIndex;
    }

    message[byteIndex] = byte;
  }

  return message;
}
```

## Capacity Calculation

### **AC Coefficient Capacity**

```typescript
function calculateCapacity(coefficients: DCTCoefficients): number {
  let modifiableCoefficients = 0;

  for (const block of coefficients.blocks) {
    for (let i = 1; i < 64; i++) {
      // Skip DC coefficient
      const coefficient = block.ac[i];

      // Count non-zero coefficients large enough to modify
      if (coefficient !== 0 && Math.abs(coefficient) >= MIN_COEFFICIENT_VALUE) {
        modifiableCoefficients++;
      }
    }
  }

  // Account for triple redundancy
  const effectiveCoefficients = Math.floor(modifiableCoefficients / 3);

  // Convert bits to bytes, minus header size
  const capacityBytes = Math.floor(effectiveCoefficients / 8) - HEADER_SIZE_BYTES;

  return Math.max(0, capacityBytes);
}
```

### **Example Capacity Calculation**

```
Example 1024×768 JPEG:
- Total blocks: 96 × 128 = 12,288 8×8 blocks
- AC coefficients per block: 63
- Total AC coefficients: 12,288 × 63 = 774,144

Assuming 30% are modifiable (non-zero, sufficient magnitude):
- Modifiable coefficients: 774,144 × 0.3 = 232,243
- With triple redundancy: 232,243 ÷ 3 = 77,414 bits
- Message capacity: 77,414 ÷ 8 = 9,676 bytes ≈ 9.5KB
```

## Quality Preservation

### **Visual Quality Metrics**

```typescript
function validateImageQuality(original: Buffer, modified: Buffer): QualityMetrics {
  const originalCoefficients = extractDCTCoefficients(original);
  const modifiedCoefficients = extractDCTCoefficients(modified);

  return {
    psnr: calculatePSNR(originalCoefficients, modifiedCoefficients),
    ssim: calculateSSIM(originalCoefficients, modifiedCoefficients),
    coefficientChanges: countCoefficientChanges(originalCoefficients, modifiedCoefficients),
    maxCoefficientChange: maxCoefficientChange(originalCoefficients, modifiedCoefficients),
  };
}
```

### **Perceptual Quality Guidelines**

- **PSNR > 40dB** - Excellent quality, changes imperceptible
- **SSIM > 0.95** - Structural similarity maintained
- **Max coefficient change ≤ 1** - Minimal frequency domain impact
- **DC coefficients unchanged** - Brightness/color preservation

## Testing Strategy

## Library Integration Requirements

### **Essential Features Required**

1. **DCT coefficient extraction** - Parse JPEG structure and extract coefficients
2. **Coefficient modification** - Modify individual AC coefficients
3. **JPEG rebuilding** - Reconstruct JPEG from modified coefficients
4. **Quantization table access** - Read and modify quantization tables
5. **Quality control** - Maintain or adjust JPEG quality settings

### **Platform-Specific Libraries**

**All platforms (default)**:

```bash
# Already included in the monorepo source – no external install required
```

**Alternative / Legacy options:**

**Web:**

```bash
npm install mozjpeg-js
npm install jpegjs
```

**Mobile (React Native):**

```bash
npm install react-native-jpeg-turbo
```

**Node.js:**

```bash
npm install sharp libjpeg-turbo-bindings
```

## Performance Considerations

### **Memory Usage**

- **DCT coefficients** require less memory than full pixel data
- **Streaming processing** for large images
- **Coefficient caching** for repeated operations

### **Processing Speed**

- **Direct coefficient access** avoids pixel conversion overhead
- **Parallel block processing** for multi-threading
- **Optimized library selection** based on platform capabilities

## Error Handling

### **Robust Error Recovery**

```typescript
async function decodeMessage(jpegBuffer: Buffer): Promise<string> {
  try {
    // 1. Extract coefficients
    const coefficients = await extractDCTCoefficients(jpegBuffer);

    // 2. Extract header with validation
    const header = await extractHeader(coefficients);
    validateHeader(header);

    // 3. Extract message with error correction
    const messageBytes = await extractMessageWithRedundancy(coefficients, header);

    // 4. Validate checksum
    const calculatedChecksum = calculateCRC32(messageBytes);
    if (calculatedChecksum !== header.checksum) {
      throw new Error('Message corrupted - checksum mismatch');
    }

    // 5. Convert to string
    return new TextDecoder().decode(messageBytes);
  } catch (error) {
    if (error.message.includes('Not a MischiefMaker image')) {
      throw new Error('Image does not contain a hidden message');
    }

    if (error.message.includes('checksum mismatch')) {
      throw new Error('Hidden message is corrupted and cannot be recovered');
    }

    throw new Error(`Decoding failed: ${error.message}`);
  }
}
```

## Implementation Roadmap

### **Phase 1: Research & Prototyping**

1. **Evaluate JPEG libraries** for DCT coefficient access
2. **Test coefficient modification** on sample images
3. **Measure compression stability** across quality levels
4. **Benchmark performance** on target platforms

### **Phase 2: Core Implementation**

1. **Implement DCT coefficient extraction** and modification
2. **Build triple redundancy** embedding and extraction
3. **Create capacity calculation** for AC coefficients
4. **Develop quality preservation** validation

### **Phase 3: Platform Integration**

1. **Web implementation** with mozjpeg.js
2. **Mobile implementation** with libjpeg-turbo
3. **Node.js implementation** with sharp
4. **Cross-platform testing** and optimization

### **Phase 4: Production Readiness**

1. **Messaging service validation** with real-world testing
2. **Performance optimization** for production use
3. **Error handling** and user experience polish
4. **Documentation and examples** for developers

This approach represents a complete architectural shift from pixel-domain LSB to DCT coefficient steganography, which is the only viable solution for JPEG messaging service compatibility.
