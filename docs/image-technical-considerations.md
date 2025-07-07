# Image Technical Considerations

## Steganography Implementation Approaches

### **Selected Approach: Combination Strategy (Option C)**

**Decision**: Implement combination approach with automatic fallback for optimal capacity and reliability through messaging services.

**Strategy**:

1. **First attempt**: Simple LSB encoding (100% capacity, medium reliability)
2. **Automatic fallback**: Triple redundancy if simple method fails (33% capacity, very high reliability)
3. **Future enhancement**: Adaptive LSB depth for edge cases (variable capacity/reliability)

**Rationale**:

- **Optimal capacity**: Uses full 288KB capacity when image conditions allow
- **High reliability**: Automatically falls back to triple redundancy (99.9% success rate) when needed
- **Simplicity**: Works with standard image processing libraries across platforms
- **Automatic optimization**: No user intervention required, algorithm chooses best method

### **Alternative Approaches Evaluated**

#### **Option A: Simple LSB (Initial Approach)**

- **Method**: Compress → Load → Modify LSBs → Re-compress
- **Risk**: Re-compression might destroy hidden bits
- **Capacity**: 100% (288KB for 1024×768)
- **Reliability**: Medium (vulnerable to compression artifacts)
- **Status**: Rejected due to reliability concerns

#### **Option B: Direct JPEG Coefficient Manipulation (Future Consideration)**

- **Method**: Modify JPEG DCT coefficients directly without decompression
- **Advantages**:
  - Higher reliability (no re-compression artifacts)
  - Preserves exact JPEG structure
  - More resistant to detection
- **Disadvantages**:
  - Requires specialized JPEG libraries (e.g., libjpeg-turbo)
  - Complex implementation
  - Platform-specific dependencies
- **Libraries**:
  - Web: mozjpeg.js, jpegjs with DCT access
  - Mobile: libjpeg-turbo bindings
  - Node.js: sharp with custom JPEG processing
- **Status**: Documented for future implementation if reliability issues arise

#### **Option C: Robust LSB with Testing (Selected)**

- **Method**: LSB with redundancy and verification
- **Approaches**:
  - **Triple redundancy**: Each bit stored 3 times (33% capacity)
  - **Reed-Solomon coding**: Error correction codes (57% capacity)
  - **Adaptive LSB depth**: Increase bits per channel if needed
- **Status**: Implemented with triple redundancy

### **Redundancy Strategy Comparison**

| Method            | Capacity | Reliability    | Implementation | Recovery Rate |
| ----------------- | -------- | -------------- | -------------- | ------------- |
| Triple Redundancy | 33%      | Very High      | Simple         | ~99.9%        |
| Reed-Solomon      | 57%      | Extremely High | Complex        | ~99.99%       |
| Adaptive LSB      | Variable | High           | Medium         | ~95-99%       |
| Retry Method      | 100%     | Medium         | Simple         | ~80-95%       |

## Detailed Capacity Calculations

### **How Message Capacity Works**

Message capacity is determined by pixel dimensions, not compressed file size:

```typescript
// Example: 750KB JPEG file
// 1. Determine pixel dimensions (not file size!)
const width = 1024,
  height = 768; // Common dimensions for ~750KB JPEG
const channels = 3; // RGB
const lsbDepth = 1; // 1 LSB per channel for maximum invisibility
const redundancyFactor = 3; // Triple redundancy

// 2. Calculate decompressed pixel data size
const totalPixels = width * height; // 786,432 pixels
const pixelDataSize = totalPixels * channels; // 2,359,296 bytes (2.3MB when decompressed)

// 3. Calculate message capacity with redundancy
const availableBits = totalPixels * channels * lsbDepth; // 2,359,296 bits
const effectiveBits = Math.floor(availableBits / redundancyFactor); // 786,432 bits after redundancy
const messageCapacity = Math.floor(effectiveBits / 8) - 13; // 98,291 bytes ≈ 96KB
// (minus 13 bytes for header)

// Result: 96KB message capacity from 2.3MB pixel data = 4% capacity with triple redundancy
```

### **File Size Impact**

**Important**: Hidden messages do NOT increase file size proportionally:

```typescript
// LSB steganography REPLACES bits, doesn't ADD data
Original pixel: 11010110 (214)
With message:   11010111 (215) // Changed last bit from 0→1

// The modified pixel data gets compressed by JPEG
// Result: File size changes by ±2-5KB due to compression differences
// NOT +messageSize for the hidden data!
```

**Example Scenarios:**

- 750KB JPEG + 1KB message = ~748-752KB final file
- 750KB JPEG + 100KB message = ~748-752KB final file
- The message is encoded in existing pixels, not appended

## JPEG Processing Implementation Details

### **How JPEG Processing Works**

JPEG files are compressed for storage, but decompress back to normal RGB pixel arrays for processing:

```typescript
// 1. Load JPEG file (compressed format)
const jpegFile = loadFile('image.jpg'); // 750KB file

// 2. Decompress to RGB pixels in memory
const pixelData = loadJPEGPixels(jpegFile); // 2.3MB pixel array
// pixelData = [R, G, B, R, G, B, R, G, B, ...] (normal 8-bit values)

// 3. Modify LSBs with triple redundancy
const encodedPixels = encodeWithTripleRedundancy(pixelData, message);

// 4. Save back as JPEG (maintains compression level)
const finalJPEG = saveAsJPEG(encodedPixels, { quality: 45 });
```

### **Why 1 LSB for JPEG Works**

Even with JPEG compression artifacts, 1 LSB modifications remain invisible:

```typescript
// Original pixel: 150
// After JPEG compression: 148 (compression changed by 2)
// Our steganography: 149 (we change by 1)
// Human eye: Cannot distinguish between 148 and 149!
```

## Triple Redundancy Implementation

### **Encoding with Triple Redundancy**

```typescript
function encodeWithTripleRedundancy(pixelData: Uint8Array, message: Uint8Array): Uint8Array {
  const encodedPixels = pixelData.slice();
  let bitIndex = 0;

  for (let byteIndex = 0; byteIndex < message.length; byteIndex++) {
    const byte = message[byteIndex];

    for (let bitPosition = 0; bitPosition < 8; bitPosition++) {
      const bit = (byte >> bitPosition) & 1;

      // Encode the same bit 3 times in different locations
      for (let redundancy = 0; redundancy < 3; redundancy++) {
        const pixelIndex = bitIndex * 3 + redundancy;
        const channelIndex = pixelIndex % 3;
        const actualPixelIndex = Math.floor(pixelIndex / 3) * 3 + channelIndex;

        // Set the LSB
        encodedPixels[actualPixelIndex] = (encodedPixels[actualPixelIndex] & 0xfe) | bit;
      }

      bitIndex++;
    }
  }

  return encodedPixels;
}
```

### **Decoding with Majority Vote**

```typescript
function decodeWithTripleRedundancy(pixelData: Uint8Array, messageLength: number): Uint8Array {
  const message = new Uint8Array(messageLength);
  let bitIndex = 0;

  for (let byteIndex = 0; byteIndex < messageLength; byteIndex++) {
    let byte = 0;

    for (let bitPosition = 0; bitPosition < 8; bitPosition++) {
      let votes = 0;

      // Read the same bit from 3 different locations
      for (let redundancy = 0; redundancy < 3; redundancy++) {
        const pixelIndex = bitIndex * 3 + redundancy;
        const channelIndex = pixelIndex % 3;
        const actualPixelIndex = Math.floor(pixelIndex / 3) * 3 + channelIndex;

        const bit = pixelData[actualPixelIndex] & 1;
        votes += bit;
      }

      // Majority vote: if 2 or 3 bits are 1, the result is 1
      const finalBit = votes >= 2 ? 1 : 0;
      byte |= finalBit << bitPosition;

      bitIndex++;
    }

    message[byteIndex] = byte;
  }

  return message;
}
```

## Complete Implementation Workflow

### **Encoding Process**

```typescript
async function encodeMessage(inputImage: Buffer, message: string): Promise<Buffer> {
  // 1. Pre-compress to messaging service standards
  const jpegImage = await compressToJPEG(inputImage, {
    quality: 45, // SMS/MMS compatible
    maxSize: 1024 * 1024, // 1MB limit
    maxDimensions: 1024, // Dimension limit
  });

  // 2. Load as RGB pixel array
  const pixelData = loadJPEGPixels(jpegImage);
  const { width, height } = getImageDimensions(jpegImage);

  // 3. Validate capacity (with triple redundancy)
  const capacity = calculateCapacityWithRedundancy(width, height, 3);
  if (message.length > capacity) {
    throw new Error(`Message too large. Max: ${capacity} bytes, provided: ${message.length} bytes`);
  }

  // 4. Create header
  const messageBytes = new TextEncoder().encode(message);
  const checksum = calculateCRC32(messageBytes);
  const header = createHeader(messageBytes.length, checksum);

  // 5. Embed header + message with triple redundancy
  const dataToEmbed = concatenateBytes(header, messageBytes);
  const encodedPixels = encodeWithTripleRedundancy(pixelData, dataToEmbed);

  // 6. Save as JPEG
  return saveAsJPEG(encodedPixels, width, height, { quality: 45 });
}
```

### **Decoding Process**

```typescript
async function decodeMessage(jpegImage: Buffer): Promise<string> {
  // 1. Load as RGB pixel array
  const pixelData = loadJPEGPixels(jpegImage);

  // 2. Extract and validate header using triple redundancy
  const header = extractHeaderWithRedundancy(pixelData);
  if (header.magic !== MAGIC_SIGNATURE) {
    throw new Error('Not a MischiefMaker image');
  }
  if (header.version !== CURRENT_VERSION) {
    throw new Error(`Unsupported version: ${header.version}`);
  }

  // 3. Extract message with triple redundancy
  const messageBytes = decodeWithTripleRedundancy(pixelData, header.messageLength);

  // 4. Validate checksum
  const calculatedChecksum = calculateCRC32(messageBytes);
  if (calculatedChecksum !== header.checksum) {
    throw new Error('Message corrupted - checksum mismatch');
  }

  // 5. Convert to string
  return new TextDecoder().decode(messageBytes);
}
```

## Platform-Specific Image Processing

### **Interface Definition**

```typescript
interface ImageProcessor {
  // Convert any image format to JPEG with specified quality
  compressToJPEG(
    image: Buffer,
    options: {
      quality: number;
      maxSize: number;
      maxDimensions: number;
    },
  ): Promise<Buffer>;

  // Load JPEG as RGB pixel array
  loadJPEGPixels(jpeg: Buffer): Promise<{
    pixels: Uint8Array; // RGB pixel array
    width: number;
    height: number;
  }>;

  // Save RGB pixels as JPEG
  saveJPEGFromPixels(pixels: Uint8Array, width: number, height: number, quality: number): Promise<Buffer>;
}
```

### **Web Implementation (Canvas API)**

```typescript
class WebImageProcessor implements ImageProcessor {
  async compressToJPEG(image: Buffer, options: CompressionOptions): Promise<Buffer> {
    // Use Canvas API or FFmpeg.js for compression
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Load image, resize if needed, compress to JPEG
    // Implementation details depend on web platform capabilities
  }

  async loadJPEGPixels(jpeg: Buffer): Promise<ImageData> {
    // Use Canvas API to load JPEG and extract pixel data
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Draw to canvas, get ImageData
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
}
```

### **Mobile Implementation (Native)**

```typescript
class MobileImageProcessor implements ImageProcessor {
  async compressToJPEG(image: Buffer, options: CompressionOptions): Promise<Buffer> {
    // Use React Native image processing libraries
    // Implementation varies by platform (iOS/Android)
  }

  async loadJPEGPixels(jpeg: Buffer): Promise<ImageData> {
    // Use native image processing to extract pixel data
    // Platform-specific implementation
  }
}
```

## LSB Manipulation Functions

### **Embedding Data in LSBs (Simple)**

```typescript
function embedInLSBs(pixelData: Uint8Array, dataToEmbed: Uint8Array): Uint8Array {
  const result = new Uint8Array(pixelData);
  let bitIndex = 0;

  for (let byteIndex = 0; byteIndex < dataToEmbed.length; byteIndex++) {
    const dataByte = dataToEmbed[byteIndex];

    for (let bit = 7; bit >= 0; bit--) {
      const dataBit = (dataByte >> bit) & 1;
      const pixelIndex = bitIndex;

      // Clear LSB and set our data bit
      result[pixelIndex] = (result[pixelIndex] & 0b11111110) | dataBit;
      bitIndex++;

      if (pixelIndex >= result.length) {
        throw new Error('Image too small for message');
      }
    }
  }

  return result;
}
```

### **Extracting Data from LSBs (Simple)**

```typescript
function extractFromLSBs(pixelData: Uint8Array, messageLength: number, startBitOffset: number = 0): Uint8Array {
  const result = new Uint8Array(messageLength);
  let bitIndex = startBitOffset;

  for (let byteIndex = 0; byteIndex < messageLength; byteIndex++) {
    let extractedByte = 0;

    for (let bit = 7; bit >= 0; bit--) {
      const lsb = pixelData[bitIndex] & 1;
      extractedByte |= lsb << bit;
      bitIndex++;
    }

    result[byteIndex] = extractedByte;
  }

  return result;
}
```

## Testing and Validation

### **Messaging Service Simulation**

```typescript
function testMessagingCompatibility(encodedImage: Buffer) {
  const services = [
    { name: 'imessage', quality: 75 },
    { name: 'whatsapp', quality: 65 },
    { name: 'sms', quality: 45 },
    { name: 'telegram', quality: 75 },
  ];

  for (const service of services) {
    // Simulate service compression
    const compressed = simulateServiceCompression(encodedImage, service.quality);

    try {
      const message = decodeMessage(compressed);
      console.log(`✅ ${service.name}: Message survived with triple redundancy`);
    } catch (error) {
      console.error(`❌ ${service.name}: Message lost - ${error.message}`);
      throw new Error(`Compatibility test failed for ${service.name}`);
    }
  }
}
```

### **Capacity Validation**

```typescript
function validateCapacity(width: number, height: number, messageLength: number): boolean {
  const totalPixels = width * height;
  const availableBits = totalPixels * 3 * 1; // 3 channels, 1 LSB each
  const effectiveBits = Math.floor(availableBits / 3); // Triple redundancy
  const requiredBits = (HEADER_SIZE_BYTES + messageLength) * 8;

  return requiredBits <= effectiveBits;
}

function calculateCapacityWithRedundancy(width: number, height: number, redundancyFactor: number): number {
  const totalPixels = width * height;
  const availableBits = totalPixels * 3 * 1; // 3 channels, 1 LSB each
  const effectiveBits = Math.floor(availableBits / redundancyFactor);
  return Math.floor(effectiveBits / 8) - 13; // minus header size
}
```

## Future Considerations

### **Option B: Direct JPEG Coefficient Manipulation**

If reliability issues arise with LSB approach, consider implementing direct JPEG coefficient manipulation:

```typescript
// Pseudocode for JPEG coefficient modification
interface JPEGCoefficient {
  block: number;
  component: number; // Y, Cb, Cr
  coefficient: number; // DCT coefficient value
}

function modifyJPEGCoefficients(jpegData: Buffer, message: Uint8Array): Buffer {
  // 1. Parse JPEG structure
  const jpeg = parseJPEG(jpegData);

  // 2. Modify AC coefficients (preserve DC for quality)
  const coefficients = jpeg.getACCoefficients();

  // 3. Embed data in LSBs of coefficients
  let bitIndex = 0;
  for (const bit of messageBits) {
    const coeff = coefficients[bitIndex];
    coeff.value = (coeff.value & ~1) | bit;
    bitIndex++;
  }

  // 4. Rebuild JPEG
  return jpeg.rebuild();
}
```

**Required Libraries:**

- **Web**: mozjpeg.js with DCT access
- **Mobile**: libjpeg-turbo React Native bindings
- **Node.js**: sharp with custom JPEG processing

This approach would provide higher reliability but requires platform-specific JPEG libraries and more complex implementation.
