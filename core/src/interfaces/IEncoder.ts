import type { PixelData } from '../types/PixelData';
import type { SteganographyHeader } from '../types/SteganographyHeader';
import type { LSBConfig } from '../types/LSBConfig';

/**
 * Base interface for LSB encoding operations
 */
export interface IEncoder {
  /**
   * Encode message data into pixel data
   */
  encode(
    pixelData: PixelData,
    messageData: Uint8Array,
    header: SteganographyHeader,
    config?: Partial<LSBConfig>
  ): Promise<PixelData>;

  /**
   * Calculate capacity for this encoding method
   */
  calculateCapacity(width: number, height: number): number;

  /**
   * Validate that message can be encoded with this method
   */
  canEncode(pixelData: PixelData, messageLength: number): boolean;
}

/**
 * Simple LSB encoder (1 bit per channel, no redundancy)
 */
export interface ISimpleLSBEncoder extends IEncoder {
  /**
   * Encode with maximum capacity utilization
   */
  encodeSimple(pixelData: PixelData, messageData: Uint8Array, header: SteganographyHeader): Promise<PixelData>;
}

/**
 * Triple redundancy LSB encoder (1 bit per channel, 3x redundancy)
 */
export interface ITripleRedundancyEncoder extends IEncoder {
  /**
   * Encode with triple redundancy for high reliability
   */
  encodeWithRedundancy(
    pixelData: PixelData,
    messageData: Uint8Array,
    header: SteganographyHeader,
    redundancyFactor: number
  ): Promise<PixelData>;
}

/**
 * Adaptive LSB encoder (variable bits per channel)
 */
export interface IAdaptiveLSBEncoder extends IEncoder {
  /**
   * Encode with adaptive bit depth based on image characteristics
   */
  encodeAdaptive(
    pixelData: PixelData,
    messageData: Uint8Array,
    header: SteganographyHeader,
    targetReliability: number
  ): Promise<PixelData>;

  /**
   * Determine optimal bit depth for given image
   */
  determineOptimalDepth(pixelData: PixelData): Promise<number>;
}
