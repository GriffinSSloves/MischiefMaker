/**
 * Result of an encoding operation
 */
export interface EncodeResult {
  /** Operation success status */
  success: boolean;

  /** Resulting image data with embedded message */
  imageData?: ArrayBuffer;

  /** Error message if operation failed */
  error?: string;
}

/**
 * Result of a decoding operation
 */
export interface DecodeResult {
  /** Operation success status */
  success: boolean;

  /** Decoded message */
  message?: string;

  /** Error message if operation failed */
  error?: string;
}
