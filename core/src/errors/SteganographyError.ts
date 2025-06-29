/**
 * Base class for steganography-related errors
 */
export class SteganographyError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SteganographyError';
    this.code = code;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, SteganographyError.prototype);
  }
}

/**
 * Error codes for common error conditions
 */
export enum ErrorCodes {
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // Processing errors
  IMAGE_LOAD_FAILED = 'IMAGE_LOAD_FAILED',
  EMBEDDING_FAILED = 'EMBEDDING_FAILED',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',

  // Capacity errors
  MESSAGE_TOO_LARGE = 'MESSAGE_TOO_LARGE',

  // System errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
