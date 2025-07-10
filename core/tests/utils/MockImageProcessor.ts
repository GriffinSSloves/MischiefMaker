import type { IImageProcessor, IImageData } from '../../src/interfaces/IImageProcessor';
import type { CompressionOptions } from '../../src/types/CompressionOptions';
import type { PixelData } from '../../src/types/PixelData';

type CorruptionPattern = 'every-3rd' | 'every-2nd' | 'random';

/**
 * Mock implementation of IImageProcessor for testing
 * Actually preserves pixel data through the pipeline for proper steganography testing
 */
export class MockImageProcessor implements IImageProcessor {
  constructor(private corruptionPattern?: CorruptionPattern) {}

  /**
   * Preprocess any image format to JPEG with steganography-optimized compression
   */
  async preprocessImageToJPEG(buffer: ArrayBuffer, options: CompressionOptions): Promise<ArrayBuffer> {
    // Load the image to get pixel data
    const imageData = await this.decompressJPEG(buffer);

    // Simulate compression by reducing quality slightly but preserving LSBs for steganography
    const compressedData = new Uint8ClampedArray(imageData.data);

    // Apply minimal quality reduction to non-LSB bits to simulate JPEG compression
    if (options.quality < 100) {
      const qualityFactor = options.quality / 100;
      for (let i = 0; i < compressedData.length; i += 4) {
        // Slightly modify higher-order bits while preserving LSBs
        compressedData[i] = this.simulateJPEGCompression(compressedData[i], qualityFactor, i);
        compressedData[i + 1] = this.simulateJPEGCompression(compressedData[i + 1], qualityFactor, i + 1);
        compressedData[i + 2] = this.simulateJPEGCompression(compressedData[i + 2], qualityFactor, i + 2);
        // Keep alpha unchanged
      }
    }

    // Create output buffer with JPEG header + dimensions + pixel data
    const headerSize = 12;
    const pixelDataSize = compressedData.length;
    const outputSize = headerSize + pixelDataSize;

    // Apply size limit
    const maxSize = Math.min(options.maxSize, outputSize);
    const finalSize = Math.max(1000, maxSize); // Minimum viable size

    const outputBuffer = new ArrayBuffer(finalSize);
    const outputView = new Uint8Array(outputBuffer);

    // Write JPEG header
    outputView[0] = 0xff; // JPEG signature
    outputView[1] = 0xd8;
    outputView[2] = 0xff;
    outputView[3] = 0xe0; // APP0 marker

    // Write dimensions
    outputView[4] = (imageData.width >> 24) & 0xff;
    outputView[5] = (imageData.width >> 16) & 0xff;
    outputView[6] = (imageData.width >> 8) & 0xff;
    outputView[7] = imageData.width & 0xff;

    outputView[8] = (imageData.height >> 24) & 0xff;
    outputView[9] = (imageData.height >> 16) & 0xff;
    outputView[10] = (imageData.height >> 8) & 0xff;
    outputView[11] = imageData.height & 0xff;

    // Write pixel data (compressed if it fits)
    if (finalSize >= headerSize + pixelDataSize) {
      outputView.set(compressedData, headerSize);
    } else {
      // If size constraint is too tight, write partial data
      const availableSpace = finalSize - headerSize;
      outputView.set(compressedData.slice(0, availableSpace), headerSize);
    }

    return outputBuffer;
  }

  /**
   * Decompress JPEG to intermediate image data format
   */
  async decompressJPEG(jpegBuffer: ArrayBuffer): Promise<IImageData> {
    // Extract dimensions from buffer if it's our test format, otherwise use defaults
    const view = new Uint8Array(jpegBuffer);
    let width = 100;
    let height = 100;

    // Check if this is our special test format with embedded dimensions
    if (jpegBuffer.byteLength >= 12 && view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) {
      // Extract width/height from bytes 4-11 if available
      if (jpegBuffer.byteLength >= 12) {
        width = (view[4] << 24) | (view[5] << 16) | (view[6] << 8) | view[7];
        height = (view[8] << 24) | (view[9] << 16) | (view[10] << 8) | view[11];

        // Validate extracted dimensions
        if (width <= 0 || width > 10000 || height <= 0 || height > 10000) {
          width = 100;
          height = 100;
        }
      }
    }

    const totalPixels = width * height;
    const data = new Uint8ClampedArray(totalPixels * 4);

    // If buffer contains actual pixel data after header, use it
    const headerSize = 12;
    const pixelDataStart = headerSize;
    const expectedPixelDataSize = totalPixels * 4;

    if (jpegBuffer.byteLength >= headerSize + expectedPixelDataSize) {
      // Copy pixel data from buffer
      const sourcePixelData = new Uint8Array(jpegBuffer, pixelDataStart, expectedPixelDataSize);
      data.set(sourcePixelData);
    } else {
      // Generate deterministic test pattern
      for (let i = 0; i < totalPixels; i++) {
        const index = i * 4;
        data[index] = (i * 17) % 256; // Red
        data[index + 1] = (i * 31) % 256; // Green
        data[index + 2] = (i * 47) % 256; // Blue
        data[index + 3] = 255; // Alpha
      }
    }

    return { width, height, data };
  }

  /**
   * Convert intermediate image data to RGB pixel data for LSB manipulation
   */
  async convertToPixelData(imageData: IImageData): Promise<PixelData> {
    const { width, height, data } = imageData;
    const totalPixels = width * height;

    // Validate image data
    if (data.length < totalPixels * 4) {
      throw new Error('Image data is too small for given dimensions');
    }

    // Extract RGB channels (skip alpha channel)
    const red = new Array(totalPixels);
    const green = new Array(totalPixels);
    const blue = new Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      const pixelIndex = i * 4;
      red[i] = data[pixelIndex];
      green[i] = data[pixelIndex + 1];
      blue[i] = data[pixelIndex + 2];
    }

    return {
      width,
      height,
      channels: { red, green, blue },
      totalPixels,
    };
  }

  /**
   * Apply pixel data back to image
   */
  async applyPixelData(imageData: IImageData, pixelData: PixelData): Promise<IImageData> {
    const { width, height, data } = imageData;
    const { channels } = pixelData;

    // Validate dimensions match
    if (width !== pixelData.width || height !== pixelData.height) {
      throw new Error('Image dimensions do not match pixel data dimensions');
    }

    // Create new image data with modified pixels
    const newData = new Uint8ClampedArray(data);
    const totalPixels = width * height;

    for (let i = 0; i < totalPixels; i++) {
      const pixelIndex = i * 4;
      newData[pixelIndex] = channels.red[i];
      newData[pixelIndex + 1] = channels.green[i];
      newData[pixelIndex + 2] = channels.blue[i];
      // Keep alpha channel unchanged
    }

    return {
      width,
      height,
      data: newData,
    };
  }

  /**
   * Compress intermediate image data to final JPEG format
   */
  async compressToJPEG(imageData: IImageData, quality: number = 75): Promise<ArrayBuffer> {
    const headerSize = 12;
    let processedData = imageData.data;

    // Apply quality-based compression (data loss simulation is handled in simulateJPEGCompression)
    if (quality < 100) {
      const qualityFactor = quality / 100;
      processedData = new Uint8ClampedArray(processedData);
      for (let i = 0; i < processedData.length; i += 4) {
        processedData[i] = this.simulateJPEGCompression(processedData[i], qualityFactor, i);
        processedData[i + 1] = this.simulateJPEGCompression(processedData[i + 1], qualityFactor, i + 1);
        processedData[i + 2] = this.simulateJPEGCompression(processedData[i + 2], qualityFactor, i + 2);
        // Keep alpha unchanged
      }
    }

    // Create output buffer
    const outputSize = headerSize + processedData.length;
    const outputBuffer = new ArrayBuffer(outputSize);
    const outputView = new Uint8Array(outputBuffer);

    // Write JPEG header
    outputView[0] = 0xff; // JPEG signature
    outputView[1] = 0xd8;
    outputView[2] = 0xff;
    outputView[3] = 0xe0; // APP0 marker

    // Write dimensions
    outputView[4] = (imageData.width >> 24) & 0xff;
    outputView[5] = (imageData.width >> 16) & 0xff;
    outputView[6] = (imageData.width >> 8) & 0xff;
    outputView[7] = imageData.width & 0xff;

    outputView[8] = (imageData.height >> 24) & 0xff;
    outputView[9] = (imageData.height >> 16) & 0xff;
    outputView[10] = (imageData.height >> 8) & 0xff;
    outputView[11] = imageData.height & 0xff;

    // Write pixel data
    outputView.set(processedData, headerSize);

    return outputBuffer;
  }

  /**
   * Get image dimensions without full loading
   */
  async getImageDimensions(buffer: ArrayBuffer): Promise<{ width: number; height: number }> {
    const view = new Uint8Array(buffer);
    let width = 100;
    let height = 100;

    // Check if this is our special test format with embedded dimensions
    if (buffer.byteLength >= 12 && view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) {
      width = (view[4] << 24) | (view[5] << 16) | (view[6] << 8) | view[7];
      height = (view[8] << 24) | (view[9] << 16) | (view[10] << 8) | view[11];

      // Validate extracted dimensions
      if (width <= 0 || width > 10000 || height <= 0 || height > 10000) {
        width = 100;
        height = 100;
      }
    }

    return { width, height };
  }

  /**
   * Simulate JPEG compression with optional data loss simulation
   */
  private simulateJPEGCompression(value: number, qualityFactor: number, pixelIndex: number = 0): number {
    if (this.corruptionPattern) {
      let shouldCorruptLSB = false;

      switch (this.corruptionPattern) {
        case 'every-3rd':
          // Corrupt every 3rd bit position - Simple LSB fails, Triple Redundancy succeeds
          shouldCorruptLSB = pixelIndex % 3 === 0;
          break;
        case 'every-2nd':
          // Corrupt every 2nd bit position - both algorithms should fail
          shouldCorruptLSB = pixelIndex % 2 === 0;
          break;
        case 'random':
          // Random 30% corruption rate
          shouldCorruptLSB = Math.random() < 0.3;
          break;
      }

      if (shouldCorruptLSB) {
        // Flip the LSB to simulate corruption
        const lsb = value & 1;
        const flippedLSB = lsb ^ 1;
        const higherBits = value & 0xfe;

        // Add compression noise to higher bits
        const noise = Math.floor((1 - qualityFactor) * 4) * (Math.random() > 0.5 ? 1 : -1);
        const compressed = Math.max(0, Math.min(255, higherBits + noise));

        return (compressed & 0xfe) | flippedLSB;
      }
    }

    // Default behavior: preserve LSB but add slight noise to higher bits
    const lsb = value & 1;
    const higherBits = value & 0xfe;

    // Add small amount of compression noise based on quality
    const noise = Math.floor((1 - qualityFactor) * 4) * (Math.random() > 0.5 ? 1 : -1);
    const compressed = Math.max(0, Math.min(255, higherBits + noise));

    // Restore LSB
    return (compressed & 0xfe) | lsb;
  }
}

/**
 * Create a test image buffer with specific dimensions
 */
export function createTestImageBuffer(width: number, height: number): ArrayBuffer {
  const headerSize = 12;
  const pixelDataSize = width * height * 4;
  const buffer = new ArrayBuffer(headerSize + pixelDataSize);
  const view = new Uint8Array(buffer);

  // Write JPEG header
  view[0] = 0xff;
  view[1] = 0xd8;
  view[2] = 0xff;
  view[3] = 0xe0;

  // Write dimensions
  view[4] = (width >> 24) & 0xff;
  view[5] = (width >> 16) & 0xff;
  view[6] = (width >> 8) & 0xff;
  view[7] = width & 0xff;

  view[8] = (height >> 24) & 0xff;
  view[9] = (height >> 16) & 0xff;
  view[10] = (height >> 8) & 0xff;
  view[11] = height & 0xff;

  // Generate deterministic pixel data
  for (let i = 0; i < width * height; i++) {
    const pixelStart = headerSize + i * 4;
    view[pixelStart] = (i * 17) % 256; // Red
    view[pixelStart + 1] = (i * 31) % 256; // Green
    view[pixelStart + 2] = (i * 47) % 256; // Blue
    view[pixelStart + 3] = 255; // Alpha
  }

  return buffer;
}
