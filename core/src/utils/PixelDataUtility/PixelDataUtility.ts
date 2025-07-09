import type { PixelData } from '../../types/PixelData';
import { BitOperations } from '../BitOperations/BitOperations';
import { ALGORITHM_CONSTANTS } from '../../types/Constants';

/**
 * Utility class for pixel data manipulation in steganography operations
 * Handles RGB channel operations, pixel extraction, and data embedding
 */
export class PixelDataUtility {
  /**
   * Extract pixel data from RGB color values
   * Converts separate R, G, B arrays into structured pixel data
   */
  static extractPixelData(
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
  static extractFromRGBA(rgba: Uint8Array, width: number, height: number, hasAlpha: boolean = true): PixelData {
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
  static toRGBA(pixelData: PixelData, includeAlpha: boolean = true, alphaValue: number = 255): Uint8Array {
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
  static toChannelArrays(pixelData: PixelData): {
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
  static embedBits(
    pixelData: PixelData,
    bits: number[],
    startPixel: number = 0,
    channelOrder: ('red' | 'green' | 'blue')[] = ['red', 'green', 'blue']
  ): PixelData {
    const result = this.clonePixelData(pixelData);
    const { channels } = result;
    let bitIndex = 0;

    for (let pixelIndex = startPixel; pixelIndex < pixelData.totalPixels && bitIndex < bits.length; pixelIndex++) {
      for (const channel of channelOrder) {
        if (bitIndex >= bits.length) break;

        const originalValue = channels[channel][pixelIndex];
        const newValue = BitOperations.setLSB(originalValue, bits[bitIndex]);
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
  static extractBits(
    pixelData: PixelData,
    bitCount: number,
    startPixel: number = 0,
    channelOrder: ('red' | 'green' | 'blue')[] = ['red', 'green', 'blue']
  ): number[] {
    const { channels } = pixelData;
    const bits: number[] = [];

    for (let pixelIndex = startPixel; pixelIndex < pixelData.totalPixels && bits.length < bitCount; pixelIndex++) {
      for (const channel of channelOrder) {
        if (bits.length >= bitCount) break;

        const value = channels[channel][pixelIndex];
        const bit = BitOperations.extractLSB(value);
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
  static embedBitsWithRedundancy(
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

    return this.embedBits(pixelData, redundantBits, startPixel);
  }

  /**
   * Extract bits with triple redundancy and majority voting
   */
  static extractBitsWithRedundancy(
    pixelData: PixelData,
    bitCount: number,
    redundancyFactor: number = ALGORITHM_CONSTANTS.redundancyFactor,
    startPixel: number = 0
  ): number[] {
    const totalBitsNeeded = bitCount * redundancyFactor;
    const redundantBits = this.extractBits(pixelData, totalBitsNeeded, startPixel);

    const result: number[] = [];

    for (let i = 0; i < bitCount; i++) {
      const start = i * redundancyFactor;
      const redundantGroup = redundantBits.slice(start, start + redundancyFactor);

      // Majority voting
      const ones = redundantGroup.filter(bit => bit === 1).length;
      const zeros = redundantGroup.filter(bit => bit === 0).length;

      result.push(ones > zeros ? 1 : 0);
    }

    return result;
  }

  /**
   * Calculate the number of pixels needed for a given number of bits
   */
  static calculatePixelsNeeded(
    bitCount: number,
    channelsUsed: number = 3,
    bitsPerChannel: number = ALGORITHM_CONSTANTS.lsbDepth
  ): number {
    const bitsPerPixel = channelsUsed * bitsPerChannel;
    return Math.ceil(bitCount / bitsPerPixel);
  }

  /**
   * Calculate the maximum bits that can be stored in pixel data
   */
  static calculateMaxBits(
    pixelData: PixelData,
    channelsUsed: number = 3,
    bitsPerChannel: number = ALGORITHM_CONSTANTS.lsbDepth,
    reservedPixels: number = 0
  ): number {
    const availablePixels = pixelData.totalPixels - reservedPixels;
    if (availablePixels <= 0) return 0;

    const bitsPerPixel = channelsUsed * bitsPerChannel;
    return availablePixels * bitsPerPixel;
  }

  /**
   * Validate that pixel data can accommodate the required bits
   */
  static validateCapacity(
    pixelData: PixelData,
    requiredBits: number,
    channelsUsed: number = 3,
    bitsPerChannel: number = ALGORITHM_CONSTANTS.lsbDepth,
    reservedPixels: number = 0
  ): { canFit: boolean; maxBits: number; pixelsNeeded: number } {
    const maxBits = this.calculateMaxBits(pixelData, channelsUsed, bitsPerChannel, reservedPixels);
    const pixelsNeeded = this.calculatePixelsNeeded(requiredBits, channelsUsed, bitsPerChannel);

    return {
      canFit: requiredBits <= maxBits,
      maxBits,
      pixelsNeeded,
    };
  }

  /**
   * Clone pixel data to avoid modifying the original
   */
  static clonePixelData(pixelData: PixelData): PixelData {
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
  static pixelDataEqual(pixelData1: PixelData, pixelData2: PixelData): boolean {
    if (
      pixelData1.width !== pixelData2.width ||
      pixelData1.height !== pixelData2.height ||
      pixelData1.totalPixels !== pixelData2.totalPixels
    ) {
      return false;
    }

    const { channels: c1 } = pixelData1;
    const { channels: c2 } = pixelData2;

    return (
      c1.red.length === c2.red.length &&
      c1.green.length === c2.green.length &&
      c1.blue.length === c2.blue.length &&
      c1.red.every((val, i) => val === c2.red[i]) &&
      c1.green.every((val, i) => val === c2.green[i]) &&
      c1.blue.every((val, i) => val === c2.blue[i])
    );
  }

  /**
   * Get pixel value at specific coordinates
   */
  static getPixel(pixelData: PixelData, x: number, y: number): { red: number; green: number; blue: number } {
    if (x < 0 || x >= pixelData.width || y < 0 || y >= pixelData.height) {
      throw new Error(`Pixel coordinates out of bounds: (${x}, ${y}) for ${pixelData.width}x${pixelData.height} image`);
    }

    const index = y * pixelData.width + x;
    return {
      red: pixelData.channels.red[index],
      green: pixelData.channels.green[index],
      blue: pixelData.channels.blue[index],
    };
  }

  /**
   * Set pixel value at specific coordinates
   */
  static setPixel(
    pixelData: PixelData,
    x: number,
    y: number,
    color: { red: number; green: number; blue: number }
  ): void {
    if (x < 0 || x >= pixelData.width || y < 0 || y >= pixelData.height) {
      throw new Error(`Pixel coordinates out of bounds: (${x}, ${y}) for ${pixelData.width}x${pixelData.height} image`);
    }

    const index = y * pixelData.width + x;
    pixelData.channels.red[index] = Math.max(0, Math.min(255, Math.round(color.red)));
    pixelData.channels.green[index] = Math.max(0, Math.min(255, Math.round(color.green)));
    pixelData.channels.blue[index] = Math.max(0, Math.min(255, Math.round(color.blue)));
  }

  /**
   * Create a visual difference map between two pixel data objects
   * Useful for debugging steganography changes
   */
  static createDifferenceMap(original: PixelData, modified: PixelData): PixelData {
    if (original.width !== modified.width || original.height !== modified.height) {
      throw new Error('Pixel data dimensions must match for difference calculation');
    }

    const result = this.clonePixelData(original);

    for (let i = 0; i < original.totalPixels; i++) {
      const redDiff = Math.abs(original.channels.red[i] - modified.channels.red[i]);
      const greenDiff = Math.abs(original.channels.green[i] - modified.channels.green[i]);
      const blueDiff = Math.abs(original.channels.blue[i] - modified.channels.blue[i]);

      // Amplify differences for visibility
      const amplification = 50;
      result.channels.red[i] = Math.min(255, redDiff * amplification);
      result.channels.green[i] = Math.min(255, greenDiff * amplification);
      result.channels.blue[i] = Math.min(255, blueDiff * amplification);
    }

    return result;
  }

  /**
   * Calculate statistics about pixel data
   */
  static calculateStatistics(pixelData: PixelData): {
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

      return { min, max, mean: Math.round(mean * 100) / 100, std: Math.round(std * 100) / 100 };
    };

    return {
      red: calculateChannelStats(pixelData.channels.red),
      green: calculateChannelStats(pixelData.channels.green),
      blue: calculateChannelStats(pixelData.channels.blue),
    };
  }

  /**
   * Validate pixel data integrity
   */
  static validatePixelData(pixelData: PixelData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check dimensions
    if (pixelData.width <= 0 || pixelData.height <= 0) {
      errors.push(`Invalid dimensions: ${pixelData.width}x${pixelData.height}`);
    }

    // Check total pixels calculation
    const expectedPixels = pixelData.width * pixelData.height;
    if (pixelData.totalPixels !== expectedPixels) {
      errors.push(`Total pixels mismatch: expected ${expectedPixels}, got ${pixelData.totalPixels}`);
    }

    // Check channel lengths
    const { red, green, blue } = pixelData.channels;
    if (red.length !== expectedPixels) {
      errors.push(`Red channel length mismatch: expected ${expectedPixels}, got ${red.length}`);
    }
    if (green.length !== expectedPixels) {
      errors.push(`Green channel length mismatch: expected ${expectedPixels}, got ${green.length}`);
    }
    if (blue.length !== expectedPixels) {
      errors.push(`Blue channel length mismatch: expected ${expectedPixels}, got ${blue.length}`);
    }

    // Check value ranges
    const checkChannelRange = (channel: number[], name: string) => {
      for (let i = 0; i < channel.length; i++) {
        const value = channel[i];
        if (!Number.isInteger(value) || value < 0 || value > 255) {
          errors.push(`Invalid ${name} channel value at index ${i}: ${value} (must be 0-255 integer)`);
          break; // Avoid too many errors
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
}
