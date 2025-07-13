/**
 * Minimal, clean interface for JPEG steganography operations
 * This defines how the jp3g fork components SHOULD be used
 */

// ============================================================================
// CORE DATA TYPES
// ============================================================================

export interface ImageBuffer {
  data: Uint8Array;
  size: number;
}

export interface SteganographyOptions {
  /** Target file size in bytes (for messaging constraints) */
  maxFileSize?: number;

  /** Force specific JPEG quality (1-100) */
  quality?: number;

  /** Preserve original image quality when possible */
  preserveQuality?: boolean;

  /** Enable debug logging */
  debug?: boolean;
}

export interface EmbedResult {
  success: boolean;
  error?: string;

  /** The JPEG with embedded message */
  imageWithMessage?: ImageBuffer;

  /** Statistics about the embedding operation */
  stats?: {
    messageLength: number;
    coefficientsUsed: number;
    originalFileSize: number;
    finalFileSize: number;
    qualityUsed: number;
  };
}

export interface ExtractResult {
  success: boolean;
  error?: string;

  /** The extracted secret message */
  message?: string;

  /** Statistics about the extraction operation */
  stats?: {
    messageLength: number;
    coefficientsRead: number;
  };
}

export interface RoundTripTestResult {
  success: boolean;
  error?: string;
  originalMessage?: string;
  extractedMessage?: string;
  messagesMatch?: boolean;
}

// ============================================================================
// MINIMAL INTERFACE
// ============================================================================

/**
 * Clean, simple interface for JPEG steganography
 *
 * This is what the user should interact with - no complex internals exposed
 */
export interface ISteganographyClient {
  /**
   * Hide a text message inside a JPEG image
   *
   * @param image - The original JPEG image as bytes
   * @param message - The secret message to hide
   * @param options - Optional settings for embedding
   * @returns Promise with the modified image or error
   */
  embedMessage(image: Uint8Array, message: string, options?: SteganographyOptions): Promise<EmbedResult>;

  /**
   * Extract a hidden message from a JPEG image
   *
   * @param image - The JPEG image containing the hidden message
   * @param expectedLength - Expected length of the hidden message (optional)
   * @returns Promise with the extracted message or error
   */
  extractMessage(image: Uint8Array, expectedLength?: number): Promise<ExtractResult>;

  /**
   * Test round-trip: embed message, then extract it to verify
   *
   * @param image - Original JPEG image
   * @param message - Message to test with
   * @param options - Optional settings
   * @returns Promise indicating if round-trip was successful
   */
  testRoundTrip(image: Uint8Array, message: string, options?: SteganographyOptions): Promise<RoundTripTestResult>;
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example usage - this is how simple it should be:
 *
 * ```typescript
 * const client = new SteganographyClient();
 *
 * // Hide a message
 * const result = await client.embedMessage(jpegBytes, "Secret message!", {
 *   maxFileSize: 1024 * 1024, // 1MB limit for messaging
 *   preserveQuality: true
 * });
 *
 * if (result.success) {
 *   // Send result.imageWithMessage.data over messaging
 * }
 *
 * // Extract a message
 * const extracted = await client.extractMessage(receivedJpegBytes);
 * if (extracted.success) {
 *   console.log("Secret message:", extracted.message);
 * }
 * ```
 */

// ============================================================================
// INTERNAL INTERFACES (implementation details)
// ============================================================================

/**
 * These interfaces define the internal components but should NOT be
 * exposed to end users
 */

export interface IJpegDecoder {
  /** Parse JPEG and extract DCT coefficients */
  decode(jpegData: Uint8Array): Promise<IJpegData>;
}

export interface IJpegEncoder {
  /** Re-encode JPEG from DCT coefficients */
  encode(jpegData: IJpegData, quality: number): Promise<Uint8Array>;
}

export interface IJpegData {
  width: number;
  height: number;
  components: IJpegComponent[];
  quality: number;
  /** Chroma subsampling pattern (4:4:4, 4:2:0, etc.) */
  subsampling: string;
}

export interface IJpegComponent {
  /** DCT coefficient blocks */
  dctBlocks: number[][][];

  /** Quantization table */
  quantizationTable: number[];

  /** Subsampling factors */
  scaleX: number;
  scaleY: number;
}

export interface IMessageEmbedder {
  /** Embed message bits into DCT coefficients */
  embed(
    jpegData: IJpegData,
    message: Uint8Array
  ): {
    coefficientsModified: number;
    success: boolean;
  };
}

export interface IMessageExtractor {
  /** Extract message bits from DCT coefficients */
  extract(
    jpegData: IJpegData,
    expectedLength: number
  ): {
    message: Uint8Array;
    coefficientsRead: number;
    success: boolean;
  };
}

export default ISteganographyClient;
