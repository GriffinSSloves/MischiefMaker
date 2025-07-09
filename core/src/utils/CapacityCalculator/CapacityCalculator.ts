import type { CapacityInfo } from '../../types/CapacityInfo';
import type { PixelData } from '../../types/PixelData';
import type { ICapacityCalculator } from '../../interfaces/ICapacityCalculator';
import { CAPACITY_CONSTANTS, ALGORITHM_CONSTANTS } from '../../types/Constants';
import { HeaderUtility } from '../HeaderUtility/HeaderUtility';

/**
 * Calculates message capacity for steganography operations
 * Supports both simple LSB and triple redundancy calculations
 */
export class CapacityCalculator implements ICapacityCalculator {
  /**
   * Calculate capacity information for an image based on dimensions
   */
  calculateCapacity(width: number, height: number): CapacityInfo {
    // Validate input dimensions
    if (width <= 0 || height <= 0) {
      throw new Error('Image dimensions must be positive');
    }

    const totalPixels = width * height;
    const channels = CAPACITY_CONSTANTS.ENCODING_CHANNELS; // RGB = 3
    const bitsPerByte = CAPACITY_CONSTANTS.BITS_PER_BYTE; // 8
    const lsbDepth = ALGORITHM_CONSTANTS.lsbDepth; // 1 LSB per channel
    const redundancyFactor = ALGORITHM_CONSTANTS.redundancyFactor; // 3x for triple redundancy
    const safetyMargin = CAPACITY_CONSTANTS.SAFETY_MARGIN; // 0.95

    // Calculate total available bits for encoding
    const availableBits = totalPixels * channels * lsbDepth;

    // Apply safety margin to account for image characteristics
    const effectiveBits = Math.floor(availableBits * safetyMargin);

    // Header overhead using HeaderUtility
    const headerSize = HeaderUtility.getHeaderSizeInBytes();

    // Calculate capacity for different encoding methods
    // Simple LSB: uses all available bits (1:1 ratio)
    const simpleBitsForMessage = effectiveBits - headerSize * bitsPerByte;
    const simpleCapacity = Math.max(0, Math.floor(simpleBitsForMessage / bitsPerByte));

    // Triple redundancy: each bit stored 3 times (1:3 ratio)
    const tripleBitsForMessage = Math.floor(effectiveBits / redundancyFactor) - headerSize * bitsPerByte;
    const tripleCapacity = Math.max(0, Math.floor(tripleBitsForMessage / bitsPerByte));

    return {
      totalPixels,
      availableBits,
      effectiveBits,
      simpleCapacity,
      tripleCapacity,
      headerSize,
    };
  }

  /**
   * Calculate capacity from pixel data directly
   */
  calculateFromPixelData(pixelData: PixelData): CapacityInfo {
    return this.calculateCapacity(pixelData.width, pixelData.height);
  }

  /**
   * Check if a message can fit using simple LSB encoding
   */
  canFitSimple(width: number, height: number, messageLength: number): boolean {
    const capacity = this.calculateCapacity(width, height);
    return messageLength <= capacity.simpleCapacity;
  }

  /**
   * Check if a message can fit using triple redundancy encoding
   */
  canFitTriple(width: number, height: number, messageLength: number): boolean {
    const capacity = this.calculateCapacity(width, height);
    return messageLength <= capacity.tripleCapacity;
  }

  /**
   * Check if a message can fit using any available encoding method
   */
  canFitAny(width: number, height: number, messageLength: number): boolean {
    return this.canFitSimple(width, height, messageLength) || this.canFitTriple(width, height, messageLength);
  }

  /**
   * Get capacity utilization percentage for a given message size
   */
  getUtilization(capacity: CapacityInfo, messageLength: number, useSimple: boolean = true): number {
    const maxCapacity = useSimple ? capacity.simpleCapacity : capacity.tripleCapacity;
    if (maxCapacity === 0) return 0;
    return Math.min(100, (messageLength / maxCapacity) * 100);
  }

  /**
   * Calculate minimum image dimensions needed for a message
   */
  calculateMinimumDimensions(messageLength: number, useSimple: boolean = true): { width: number; height: number } {
    const bitsPerByte = CAPACITY_CONSTANTS.BITS_PER_BYTE;
    const channels = CAPACITY_CONSTANTS.ENCODING_CHANNELS;
    const lsbDepth = ALGORITHM_CONSTANTS.lsbDepth;
    const safetyMargin = CAPACITY_CONSTANTS.SAFETY_MARGIN;
    const redundancyFactor = useSimple ? 1 : ALGORITHM_CONSTANTS.redundancyFactor;

    // Calculate header size in bits using HeaderUtility
    const headerSize = HeaderUtility.getHeaderSizeInBits();

    // Total bits needed (message + header) with redundancy
    const totalBitsNeeded = (messageLength * bitsPerByte + headerSize) * redundancyFactor;

    // Account for safety margin
    const bitsWithMargin = Math.ceil(totalBitsNeeded / safetyMargin);

    // Calculate total pixels needed
    const pixelsNeeded = Math.ceil(bitsWithMargin / (channels * lsbDepth));

    // Use square dimensions as default (optimal for most use cases)
    const sideLength = Math.ceil(Math.sqrt(pixelsNeeded));

    return { width: sideLength, height: sideLength };
  }
}
