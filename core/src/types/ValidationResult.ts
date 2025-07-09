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
