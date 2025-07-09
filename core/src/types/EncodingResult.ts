import type { EncodingMethod } from './EncodingMethod';
import type { CapacityInfo } from './CapacityInfo';

/**
 * Enhanced result of an encoding operation
 */
export interface EncodingResult {
  /** Operation success status */
  success: boolean;

  /** Resulting image data with embedded message */
  imageData?: ArrayBuffer;

  /** Encoding method used */
  methodUsed?: EncodingMethod;

  /** Whether fallback method was required */
  usedFallback?: boolean;

  /** Capacity information for the operation */
  capacityInfo?: CapacityInfo;

  /** Final image dimensions */
  dimensions?: { width: number; height: number };

  /** Final file size in bytes */
  fileSize?: number;

  /** Error message if operation failed */
  error?: string;

  /** Error code for programmatic handling */
  errorCode?: string;
}
