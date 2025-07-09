import type { EncodingResult } from '../types/EncodingResult';
import type { DecodingResult } from '../types/DecodingResult';
import type { CapacityCheckResult } from '../types/CapacityCheckResult';
import type { CompressionOptions } from '../types/CompressionOptions';

/**
 * Main steganography engine interface
 * Coordinates encoding/decoding operations with automatic fallback strategy
 */
export interface ISteganographyEngine {
  /**
   * Encode a message into an image with automatic method selection
   */
  encodeMessage(
    imageBuffer: ArrayBuffer,
    message: string,
    options?: Partial<CompressionOptions>
  ): Promise<EncodingResult>;

  /**
   * Decode a message from an image with automatic method detection
   */
  decodeMessage(imageBuffer: ArrayBuffer): Promise<DecodingResult>;

  /**
   * Check if a message can fit in an image and get capacity information
   */
  checkCapacity(imageBuffer: ArrayBuffer, messageLength: number): Promise<CapacityCheckResult>;
}
