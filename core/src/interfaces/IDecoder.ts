import type { PixelData, SteganographyHeader } from '../types/DataTypes';
import type { ValidationResult } from '../types/ResultTypes';
import type { LSBConfig } from '../types/AlgorithmTypes';

/**
 * Base interface for LSB decoding operations
 */
export interface IDecoder {
  /**
   * Decode message data from pixel data
   */
  decode(pixelData: PixelData, header: SteganographyHeader, config?: Partial<LSBConfig>): Promise<Uint8Array>;

  /**
   * Extract and validate header from pixel data
   */
  extractHeader(pixelData: PixelData): Promise<SteganographyHeader>;

  /**
   * Validate extracted message against header
   */
  validateMessage(messageData: Uint8Array, header: SteganographyHeader): Promise<ValidationResult>;
}

/**
 * Simple LSB decoder (1 bit per channel, no redundancy)
 */
export interface ISimpleLSBDecoder extends IDecoder {
  /**
   * Decode with simple bit extraction
   */
  decodeSimple(pixelData: PixelData, header: SteganographyHeader): Promise<Uint8Array>;
}

/**
 * Triple redundancy LSB decoder (1 bit per channel, majority vote)
 */
export interface ITripleRedundancyDecoder extends IDecoder {
  /**
   * Decode with triple redundancy and majority vote
   */
  decodeWithRedundancy(
    pixelData: PixelData,
    header: SteganographyHeader,
    redundancyFactor: number
  ): Promise<Uint8Array>;

  /**
   * Perform majority vote on redundant bits
   */
  majorityVote(bits: number[]): number;
}

/**
 * Adaptive LSB decoder (variable bits per channel)
 */
export interface IAdaptiveLSBDecoder extends IDecoder {
  /**
   * Decode with adaptive bit depth detection
   */
  decodeAdaptive(pixelData: PixelData, header: SteganographyHeader): Promise<Uint8Array>;

  /**
   * Detect bit depth used during encoding
   */
  detectBitDepth(pixelData: PixelData, header: SteganographyHeader): Promise<number>;
}
