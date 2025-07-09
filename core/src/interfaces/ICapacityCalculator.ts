import type { CapacityInfo, PixelData } from '../types/DataTypes';

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
