import type { EncodingMethod } from './EncodingMethod';
import type { ValidationResult } from './ValidationResult';

/**
 * Enhanced result of a decoding operation
 */
export interface DecodingResult {
  /** Operation success status */
  success: boolean;

  /** Decoded message */
  message?: string;

  /** Encoding method detected */
  methodDetected?: EncodingMethod;

  /** Validation results */
  validation?: ValidationResult;

  /** Message length in bytes */
  messageLength?: number;

  /** Error message if operation failed */
  error?: string;

  /** Error code for programmatic handling */
  errorCode?: string;
}
