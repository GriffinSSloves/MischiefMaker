import type { EncodingMethod } from './AlgorithmTypes';
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

/**
 * Validation result for header and message integrity
 */
export interface ValidationResult {
  /** Magic signature validation */
  magicSignatureValid: boolean;

  /** Version compatibility check */
  versionSupported: boolean;

  /** CRC32 checksum validation */
  checksumValid: boolean;

  /** Message length consistency */
  lengthValid: boolean;

  /** Overall validation status */
  isValid: boolean;

  /** Validation warnings */
  warnings?: string[];

  /** Validation errors */
  errors?: string[];
}

/**
 * Capacity check result
 */
export interface CapacityCheckResult {
  /** Whether message fits in image */
  canFit: boolean;

  /** Capacity information */
  capacity: CapacityInfo;
}
