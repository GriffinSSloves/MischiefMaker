/**
 * Result of DCT coefficient steganography decoding
 * Contains the extracted message and decoding statistics
 */
export interface DCTDecodingResult {
  /**
   * The extracted hidden message
   * Type depends on the outputFormat option
   */
  message: string | Uint8Array;

  /**
   * Whether the decoding was successful
   */
  success: boolean;

  /**
   * Statistics about the decoding process
   */
  statistics: {
    /**
     * Size of the stego JPEG in bytes
     */
    stegoSize: number;

    /**
     * Size of the extracted message in bytes
     */
    messageSize: number;

    /**
     * F5 coding parameter detected (k value)
     */
    codingParameter?: number;

    /**
     * Number of DCT coefficients processed
     */
    coefficientsProcessed?: number;

    /**
     * Processing time in milliseconds
     */
    processingTime: number;
  };

  /**
   * Error message if decoding failed
   */
  error?: string;
}
