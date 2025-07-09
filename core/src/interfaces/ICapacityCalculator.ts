import type { CapacityInfo } from '../types/CapacityInfo';
import type { PixelData } from '../types/PixelData';

/**
 * Interface for calculating message capacity in images
 */
export interface ICapacityCalculator {
  /**
   * Calculate capacity information for an image
   */
  calculateCapacity(width: number, height: number): CapacityInfo;

  /**
   * Calculate capacity from pixel data directly
   */
  calculateFromPixelData(pixelData: PixelData): CapacityInfo;
}
