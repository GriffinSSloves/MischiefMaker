/**
 * Result of DCT coefficient steganography encoding
 * Contains the stego JPEG image and embedding statistics
 */
export interface DCTEncodingResult {
  /**
   * The JPEG image with hidden message embedded in DCT coefficients
   */
  stegoImage: ArrayBuffer;

  /**
   * Statistics about the embedding process
   */
  statistics: {
    /**
     * Original JPEG size in bytes
     */
    originalSize: number;

    /**
     * Stego JPEG size in bytes
     */
    stegoSize: number;

    /**
     * Size of the embedded message in bytes
     */
    messageSize: number;

    /**
     * F5 coding parameter used (k value)
     */
    codingParameter: number;

    /**
     * Number of DCT coefficients examined
     */
    coefficientsExamined: number;

    /**
     * Number of DCT coefficients modified
     */
    coefficientsChanged: number;

    /**
     * Number of DCT coefficients set to zero (thrown)
     */
    coefficientsThrown: number;

    /**
     * Embedding efficiency (bits per coefficient change)
     */
    efficiency: number;

    /**
     * Processing time in milliseconds
     */
    processingTime: number;
  };

  /**
   * Whether the embedding was verified by decoding
   * Only present if verifyEmbedding option was true
   */
  verified?: boolean;
}
