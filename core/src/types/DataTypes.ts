import type { EncodingMethod } from './AlgorithmTypes';

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

/**
 * Image pixel data structure for steganography operations
 */
export interface PixelData {
  width: number;
  height: number;
  channels: {
    red: number[];
    green: number[];
    blue: number[];
  };
  totalPixels: number;
}

/**
 * Message capacity information for an image
 */
export interface CapacityInfo {
  /** Total available pixels */
  totalPixels: number;

  /** Total available bits for encoding */
  availableBits: number;

  /** Effective bits after redundancy/overhead */
  effectiveBits: number;

  /** Maximum message capacity in bytes (simple LSB) */
  simpleCapacity: number;

  /** Maximum message capacity in bytes (triple redundancy) */
  tripleCapacity: number;

  /** Header overhead in bytes */
  headerSize: number;
}

/**
 * Record of a single bit operation during encoding/decoding
 * Used for debugging and validation
 */
export interface BitOperation {
  pixelIndex: number;
  channel: 'red' | 'green' | 'blue';
  originalValue: number;
  newValue: number;
  extractedBit: number;
}
