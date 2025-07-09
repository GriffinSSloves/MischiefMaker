import type { PixelData } from '../../types/PixelData';
import type { CapacityInfo } from '../../types/CapacityInfo';
import type { ICapacityCalculator } from '../../interfaces/ICapacityCalculator';
import { getHeaderSizeInBytes } from '../HeaderUtility/HeaderUtility';
import { ALGORITHM_CONSTANTS } from '../../types/Constants';

/**
 * Implementation of capacity calculator for steganography
 * Calculates how much data can be hidden in images using different encoding methods
 */
export class CapacityCalculator implements ICapacityCalculator {
  /**
   * Calculate capacity information for an image
   */
  calculateCapacity(width: number, height: number): CapacityInfo {
    if (width <= 0 || height <= 0) {
      throw new Error('Image dimensions must be positive');
    }

    const totalPixels = width * height;
    const headerSize = getHeaderSizeInBytes();

    // Calculate total available bits (3 bits per pixel for RGB)
    const availableBits = totalPixels * 3;

    // Use full capacity without safety margin
    const effectiveBits = availableBits;

    // Simple LSB capacity (1 bit per channel)
    const simpleBitsForMessage = effectiveBits - headerSize * 8;
    const simpleCapacity = Math.max(0, Math.floor(simpleBitsForMessage / 8));

    // Triple redundancy capacity (3x redundancy)
    const tripleBitsForMessage = Math.floor(effectiveBits / ALGORITHM_CONSTANTS.redundancyFactor) - headerSize * 8;
    const tripleCapacity = Math.max(0, Math.floor(tripleBitsForMessage / 8));

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
}
