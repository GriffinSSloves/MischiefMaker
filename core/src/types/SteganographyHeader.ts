import type { EncodingMethod } from './EncodingMethod';

/**
 * Steganography header structure embedded in images
 */
export interface SteganographyHeader {
  /** Magic signature - "MSCH" for MischiefMaker */
  magicSignature: number;

  /** Algorithm version for compatibility */
  version: number;

  /** Length of the hidden message in bytes */
  messageLength: number;

  /** CRC32 checksum for data integrity */
  checksum: number;

  /** Encoding method used for this message */
  encodingMethod: EncodingMethod;

  /** Reserved bytes for future use */
  reserved: number;
}
