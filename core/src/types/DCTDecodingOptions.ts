/**
 * Options for DCT coefficient steganography decoding
 * Used with f5stegojs library for JPEG steganography
 */
export interface DCTDecodingOptions {
  /**
   * Steganography key for f5 algorithm
   * Array of bytes used for coefficient shuffling and data masking
   * Must be the same as used for encoding
   */
  stegoKey: number[];

  /**
   * Expected output format for the decoded message
   * @default 'string'
   */
  outputFormat?: 'string' | 'uint8array';
}
