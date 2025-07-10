import type { PixelData } from '../../types/PixelData';
import type { CapacityInfo } from '../../types/CapacityInfo';
import type { ICapacityCalculator } from '../../interfaces/ICapacityCalculator';
import { getHeaderSizeInBytes } from '../HeaderUtility/HeaderUtility';

/**
 * Implementation of capacity calculator for steganography
 * Calculates how much data can be hidden in images using different encoding methods
 */
export class CapacityCalculator implements ICapacityCalculator {
  /**
   * Calculate capacity information for an image
   * @param width Image width in pixels
   * @param height Image height in pixels
   * @param redundancyFactor Redundancy factor (default: 1 for no redundancy)
   */
  calculateCapacity(width: number, height: number, redundancyFactor: number = 1): CapacityInfo {
    if (width <= 0 || height <= 0) {
      throw new Error('Image dimensions must be positive');
    }

    if (redundancyFactor <= 0) {
      throw new Error('Redundancy factor must be positive');
    }

    const totalPixels = width * height;
    const headerSize = getHeaderSizeInBytes();

    // Calculate total available bits (3 bits per pixel for RGB)
    const availableBits = totalPixels * 3;

    // Calculate capacity accounting for redundancy
    const bitsForMessage = Math.floor(availableBits / redundancyFactor) - headerSize * 8;
    const capacity = Math.max(0, Math.floor(bitsForMessage / 8));

    return {
      totalPixels,
      availableBits,
      capacity,
      headerSize,
    };
  }

  /**
   * Calculate capacity from pixel data directly
   * @param pixelData Pixel data to calculate capacity for
   * @param redundancyFactor Redundancy factor (default: 1 for no redundancy)
   */
  calculateFromPixelData(pixelData: PixelData, redundancyFactor: number = 1): CapacityInfo {
    return this.calculateCapacity(pixelData.width, pixelData.height, redundancyFactor);
  }
}
