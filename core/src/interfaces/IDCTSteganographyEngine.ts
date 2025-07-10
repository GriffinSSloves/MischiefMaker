import { IDCTEncoder } from './IDCTEncoder';
import { IDCTDecoder } from './IDCTDecoder';

/**
 * Combined interface for DCT coefficient-based steganography
 * Provides both encoding and decoding capabilities using f5stegojs
 */
export interface IDCTSteganographyEngine extends IDCTEncoder, IDCTDecoder {
  /**
   * Get the maximum capacity in bytes for a given JPEG image
   * @param jpegBuffer - JPEG image to analyze
   * @param stegoKey - Steganography key for capacity calculation
   * @returns Promise resolving to capacity information
   */
  getCapacity(
    jpegBuffer: ArrayBuffer,
    stegoKey: number[]
  ): Promise<{
    /**
     * Maximum capacity in bytes
     */
    maxBytes: number;

    /**
     * Maximum capacity in bits
     */
    maxBits: number;

    /**
     * Capacity array for different F5 coding modes
     */
    capacityByMode: number[];

    /**
     * Total DCT coefficients available
     */
    totalCoefficients: number;

    /**
     * Usable DCT coefficients (non-zero, non-one)
     */
    usableCoefficients: number;
  }>;

  /**
   * Verify that the engine is properly initialized and f5stegojs is available
   */
  isReady(): boolean;
}
