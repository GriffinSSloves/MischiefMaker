/**
 * Options for DCT coefficient steganography encoding
 * Used with f5stegojs library for JPEG steganography
 */
export interface DCTEncodingOptions {
  /**
   * Steganography key for f5 algorithm
   * Array of bytes used for coefficient shuffling and data masking
   * Must be the same for encoding and decoding
   */
  stegoKey: number[];

  /**
   * Optional compression quality for final JPEG (0-100)
   * If not provided, maintains original quality
   */
  quality?: number;

  /**
   * Whether to verify the encoded image can be decoded
   * Useful for testing but adds processing time
   * @default true
   */
  verifyEmbedding?: boolean;
}
