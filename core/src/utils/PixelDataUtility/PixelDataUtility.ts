import type { PixelData } from '../../types/PixelData';
import { extractLSB, setLSB } from '../BitOperations/BitOperations';
import { ALGORITHM_CONSTANTS } from '../../types/Constants';

/**
 * Pixel data manipulation functions for steganography operations
 * Pure functions for RGB channel operations, pixel extraction, and data embedding
 */

/**
 * Extract pixel data from RGB color values
 * Converts separate R, G, B arrays into structured pixel data
 */
export function extractPixelData(
  red: Uint8Array,
  green: Uint8Array,
  blue: Uint8Array,
  width: number,
  height: number
): PixelData {
  const expectedLength = width * height;

  if (red.length !== expectedLength || green.length !== expectedLength || blue.length !== expectedLength) {
    throw new Error(
      `Channel arrays must match image dimensions: expected ${expectedLength}, got R:${red.length}, G:${green.length}, B:${blue.length}`
    );
  }

  return {
    width,
    height,
    channels: {
      red: Array.from(red),
      green: Array.from(green),
      blue: Array.from(blue),
    },
    totalPixels: expectedLength,
  };
}

/**
 * Extract pixel data from interleaved RGBA data
 * Common format from Canvas ImageData
 */
export function extractFromRGBA(rgba: Uint8Array, width: number, height: number, hasAlpha: boolean = true): PixelData {
  const expectedLength = width * height;
  const bytesPerPixel = hasAlpha ? 4 : 3;
  const expectedSize = expectedLength * bytesPerPixel;

  if (rgba.length !== expectedSize) {
    throw new Error(`RGBA data size mismatch: expected ${expectedSize}, got ${rgba.length}`);
  }

  const red: number[] = [];
  const green: number[] = [];
  const blue: number[] = [];

  for (let i = 0; i < expectedLength; i++) {
    const offset = i * bytesPerPixel;
    red.push(rgba[offset]);
    green.push(rgba[offset + 1]);
    blue.push(rgba[offset + 2]);
    // Skip alpha channel if present
  }

  return {
    width,
    height,
    channels: { red, green, blue },
    totalPixels: expectedLength,
  };
}

/**
 * Convert pixel data back to interleaved RGBA format
 */
export function toRGBA(pixelData: PixelData, includeAlpha: boolean = true, alphaValue: number = 255): Uint8Array {
  const { channels, totalPixels } = pixelData;
  const bytesPerPixel = includeAlpha ? 4 : 3;
  const result = new Uint8Array(totalPixels * bytesPerPixel);

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * bytesPerPixel;
    result[offset] = channels.red[i];
    result[offset + 1] = channels.green[i];
    result[offset + 2] = channels.blue[i];

    if (includeAlpha) {
      result[offset + 3] = alphaValue;
    }
  }

  return result;
}

/**
 * Convert pixel data to separate channel arrays
 */
export function toChannelArrays(pixelData: PixelData): {
  red: Uint8Array;
  green: Uint8Array;
  blue: Uint8Array;
} {
  return {
    red: new Uint8Array(pixelData.channels.red),
    green: new Uint8Array(pixelData.channels.green),
    blue: new Uint8Array(pixelData.channels.blue),
  };
}

/**
 * Embed bits into pixel data using LSB steganography
 */
export function embedBits(
  pixelData: PixelData,
  bits: number[],
  startPixel: number = 0,
  channelOrder: ('red' | 'green' | 'blue')[] = ['red', 'green', 'blue']
): PixelData {
  const result = clonePixelData(pixelData);
  const { channels } = result;
  let bitIndex = 0;

  for (let pixelIndex = startPixel; pixelIndex < pixelData.totalPixels && bitIndex < bits.length; pixelIndex++) {
    for (const channel of channelOrder) {
      if (bitIndex >= bits.length) {
        break;
      }

      const originalValue = channels[channel][pixelIndex];
      const newValue = setLSB(originalValue, bits[bitIndex]);
      channels[channel][pixelIndex] = newValue;
      bitIndex++;
    }
  }

  if (bitIndex < bits.length) {
    throw new Error(`Insufficient pixel capacity: needed ${bits.length} bits, could only embed ${bitIndex}`);
  }

  return result;
}

/**
 * Extract bits from pixel data using LSB steganography
 */
export function extractBits(
  pixelData: PixelData,
  bitCount: number,
  startPixel: number = 0,
  channelOrder: ('red' | 'green' | 'blue')[] = ['red', 'green', 'blue']
): number[] {
  const { channels } = pixelData;
  const bits: number[] = [];

  for (let pixelIndex = startPixel; pixelIndex < pixelData.totalPixels && bits.length < bitCount; pixelIndex++) {
    for (const channel of channelOrder) {
      if (bits.length >= bitCount) {
        break;
      }

      const value = channels[channel][pixelIndex];
      const bit = extractLSB(value);
      bits.push(bit);
    }
  }

  if (bits.length < bitCount) {
    throw new Error(`Insufficient pixel data: needed ${bitCount} bits, could only extract ${bits.length}`);
  }

  return bits.slice(0, bitCount); // Ensure exact count
}

/**
 * Embed bits with triple redundancy for error correction
 */
export function embedBitsWithRedundancy(
  pixelData: PixelData,
  bits: number[],
  redundancyFactor: number = ALGORITHM_CONSTANTS.redundancyFactor,
  startPixel: number = 0
): PixelData {
  // Repeat each bit for redundancy
  const redundantBits: number[] = [];
  for (const bit of bits) {
    for (let i = 0; i < redundancyFactor; i++) {
      redundantBits.push(bit);
    }
  }

  return embedBits(pixelData, redundantBits, startPixel);
}

/**
 * Extract bits with triple redundancy and majority voting
 */
export function extractBitsWithRedundancy(
  pixelData: PixelData,
  bitCount: number,
  redundancyFactor: number = ALGORITHM_CONSTANTS.redundancyFactor,
  startPixel: number = 0
): number[] {
  const totalBitsNeeded = bitCount * redundancyFactor;
  const redundantBits = extractBits(pixelData, totalBitsNeeded, startPixel);

  // Apply majority voting to decode original bits
  const originalBits: number[] = [];
  for (let i = 0; i < bitCount; i++) {
    const offset = i * redundancyFactor;
    const group = redundantBits.slice(offset, offset + redundancyFactor);

    // Majority voting: if sum >= threshold, the bit is 1
    const sum = group.reduce((acc, bit) => acc + bit, 0);
    const threshold = Math.ceil(redundancyFactor / 2);
    originalBits.push(sum >= threshold ? 1 : 0);
  }

  return originalBits;
}

/**
 * Calculate minimum pixels needed for given bit count
 */
export function calculatePixelsNeeded(
  bitCount: number,
  channelsUsed: number = 3,
  bitsPerChannel: number = ALGORITHM_CONSTANTS.lsbDepth
): number {
  const bitsPerPixel = channelsUsed * bitsPerChannel;
  return Math.ceil(bitCount / bitsPerPixel);
}

/**
 * Calculate maximum bits that can be stored in pixel data
 */
export function calculateMaxBits(
  pixelData: PixelData,
  channelsUsed: number = 3,
  bitsPerChannel: number = ALGORITHM_CONSTANTS.lsbDepth,
  reservedPixels: number = 0
): number {
  const availablePixels = pixelData.totalPixels - reservedPixels;
  const bitsPerPixel = channelsUsed * bitsPerChannel;
  return Math.max(0, availablePixels * bitsPerPixel);
}

/**
 * Validate pixel data capacity for bit storage
 */
export function validateCapacity(
  pixelData: PixelData,
  requiredBits: number,
  channelsUsed: number = 3,
  bitsPerChannel: number = ALGORITHM_CONSTANTS.lsbDepth,
  reservedPixels: number = 0
): { canFit: boolean; maxBits: number; pixelsNeeded: number } {
  const maxBits = calculateMaxBits(pixelData, channelsUsed, bitsPerChannel, reservedPixels);
  const pixelsNeeded = calculatePixelsNeeded(requiredBits, channelsUsed, bitsPerChannel);

  return {
    canFit: requiredBits <= maxBits,
    maxBits,
    pixelsNeeded,
  };
}

/**
 * Deep clone pixel data
 */
export function clonePixelData(pixelData: PixelData): PixelData {
  return {
    width: pixelData.width,
    height: pixelData.height,
    channels: {
      red: [...pixelData.channels.red],
      green: [...pixelData.channels.green],
      blue: [...pixelData.channels.blue],
    },
    totalPixels: pixelData.totalPixels,
  };
}

/**
 * Compare two pixel data objects for equality
 */
export function pixelDataEqual(pixelData1: PixelData, pixelData2: PixelData): boolean {
  if (
    pixelData1.width !== pixelData2.width ||
    pixelData1.height !== pixelData2.height ||
    pixelData1.totalPixels !== pixelData2.totalPixels
  ) {
    return false;
  }

  const { channels: ch1 } = pixelData1;
  const { channels: ch2 } = pixelData2;

  return (
    ch1.red.length === ch2.red.length &&
    ch1.green.length === ch2.green.length &&
    ch1.blue.length === ch2.blue.length &&
    ch1.red.every((val, i) => val === ch2.red[i]) &&
    ch1.green.every((val, i) => val === ch2.green[i]) &&
    ch1.blue.every((val, i) => val === ch2.blue[i])
  );
}

/**
 * Get pixel color at specific coordinates
 */
export function getPixel(pixelData: PixelData, x: number, y: number): { red: number; green: number; blue: number } {
  if (x < 0 || x >= pixelData.width || y < 0 || y >= pixelData.height) {
    throw new Error(`Coordinates out of bounds: (${x}, ${y}) for ${pixelData.width}x${pixelData.height} image`);
  }

  const index = y * pixelData.width + x;
  return {
    red: pixelData.channels.red[index],
    green: pixelData.channels.green[index],
    blue: pixelData.channels.blue[index],
  };
}

/**
 * Set pixel color at specific coordinates (mutates original pixel data)
 */
export function setPixel(
  pixelData: PixelData,
  x: number,
  y: number,
  color: { red: number; green: number; blue: number }
): void {
  if (x < 0 || x >= pixelData.width || y < 0 || y >= pixelData.height) {
    throw new Error(`Coordinates out of bounds: (${x}, ${y}) for ${pixelData.width}x${pixelData.height} image`);
  }

  const index = y * pixelData.width + x;
  pixelData.channels.red[index] = color.red;
  pixelData.channels.green[index] = color.green;
  pixelData.channels.blue[index] = color.blue;
}

/**
 * Create difference map between two pixel data objects
 */
export function createDifferenceMap(original: PixelData, modified: PixelData): PixelData {
  if (original.width !== modified.width || original.height !== modified.height) {
    throw new Error('Pixel data dimensions must match for difference calculation');
  }

  const result = clonePixelData(original);
  const { channels } = result;

  for (let i = 0; i < original.totalPixels; i++) {
    channels.red[i] = Math.abs(original.channels.red[i] - modified.channels.red[i]);
    channels.green[i] = Math.abs(original.channels.green[i] - modified.channels.green[i]);
    channels.blue[i] = Math.abs(original.channels.blue[i] - modified.channels.blue[i]);
  }

  return result;
}

/**
 * Calculate basic statistics for pixel data
 */
export function calculateStatistics(pixelData: PixelData): {
  red: { min: number; max: number; mean: number; std: number };
  green: { min: number; max: number; mean: number; std: number };
  blue: { min: number; max: number; mean: number; std: number };
} {
  const calculateChannelStats = (channel: number[]) => {
    const min = Math.min(...channel);
    const max = Math.max(...channel);
    const mean = channel.reduce((sum, val) => sum + val, 0) / channel.length;
    const variance = channel.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / channel.length;
    const std = Math.sqrt(variance);
    return { min, max, mean, std };
  };

  return {
    red: calculateChannelStats(pixelData.channels.red),
    green: calculateChannelStats(pixelData.channels.green),
    blue: calculateChannelStats(pixelData.channels.blue),
  };
}

/**
 * Validate pixel data structure and values
 */
export function validatePixelData(pixelData: PixelData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check dimensions
  if (pixelData.width <= 0 || pixelData.height <= 0) {
    errors.push('Image dimensions must be positive');
  }

  // Check total pixels consistency
  const expectedPixels = pixelData.width * pixelData.height;
  if (pixelData.totalPixels !== expectedPixels) {
    errors.push(`Total pixels mismatch: expected ${expectedPixels}, got ${pixelData.totalPixels}`);
  }

  // Check channel lengths
  const { red, green, blue } = pixelData.channels;
  if (red.length !== expectedPixels || green.length !== expectedPixels || blue.length !== expectedPixels) {
    errors.push(
      `Channel array length mismatch: expected ${expectedPixels}, got R:${red.length}, G:${green.length}, B:${blue.length}`
    );
  }

  // Check value ranges
  const checkChannelRange = (channel: number[], name: string) => {
    for (let i = 0; i < channel.length; i++) {
      const value = channel[i];
      if (!Number.isInteger(value) || value < 0 || value > 255) {
        errors.push(`Invalid ${name} channel value at index ${i}: ${value}`);
        break; // Only report first error per channel
      }
    }
  };

  checkChannelRange(red, 'red');
  checkChannelRange(green, 'green');
  checkChannelRange(blue, 'blue');

  return {
    isValid: errors.length === 0,
    errors,
  };
}
