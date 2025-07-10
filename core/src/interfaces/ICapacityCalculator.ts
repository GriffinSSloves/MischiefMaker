import type { CapacityInfo } from '../types/CapacityInfo';
import type { PixelData } from '../types/PixelData';

/**
 * Interface for calculating message capacity in images
 */
export interface ICapacityCalculator {
  /**
   * Calculate capacity information for an image
   * @param width Image width in pixels
   * @param height Image height in pixels
   * @param redundancyFactor Optional redundancy factor (default: 1 for no redundancy)
   */
  calculateCapacity(width: number, height: number, redundancyFactor?: number): CapacityInfo;

  /**
   * Calculate capacity from pixel data directly
   * @param pixelData Pixel data to calculate capacity for
   * @param redundancyFactor Optional redundancy factor (default: 1 for no redundancy)
   */
  calculateFromPixelData(pixelData: PixelData, redundancyFactor?: number): CapacityInfo;
}
