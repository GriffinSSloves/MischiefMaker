import type { AlgorithmConfig } from './AlgorithmConfig';

/**
 * Core algorithm constants for MischiefMaker steganography
 * Based on SMS/MMS compatibility requirements and messaging service standards
 */
export const ALGORITHM_CONSTANTS: AlgorithmConfig = {
  // JPEG compression settings (SMS/MMS compatible)
  jpegQuality: 45, // SMS/MMS quality level for universal compatibility

  // File size and dimension limits
  maxFileSize: 1024 * 1024, // 1MB universal messaging limit
  maxDimensions: 1024, // Common messaging service dimension limit

  // LSB steganography settings
  lsbDepth: 1, // 1 LSB per channel for maximum invisibility
  redundancyFactor: 3, // Triple encoding for fallback reliability

  // Capacity and compression settings
  safetyMargin: 0.95, // 95% safety margin for capacity calculations
  useCompression: false, // Disable compression for maximum compatibility

  // MischiefMaker identification
  magicSignature: 0x4d534348, // "MSCH" in hex
  currentVersion: 1, // Algorithm version for compatibility

  // Strategy settings
  enableFallback: true, // Enable combination strategy
} as const;

/**
 * Header size constants
 */
export const HEADER_CONSTANTS = {
  /** Magic signature size in bytes */
  MAGIC_SIGNATURE_BYTES: 4,

  /** Version field size in bytes */
  VERSION_BYTES: 1,

  /** Message length field size in bytes */
  MESSAGE_LENGTH_BYTES: 4,

  /** Checksum field size in bytes */
  CHECKSUM_BYTES: 4,

  /** Encoding method field size in bytes */
  ENCODING_METHOD_BYTES: 1,

  /** Reserved field size in bytes */
  RESERVED_BYTES: 2,

  /** Total header size in bytes */
  TOTAL_HEADER_BYTES: 16, // 4 + 1 + 4 + 4 + 1 + 2
} as const;

/**
 * Capacity calculation constants
 */
export const CAPACITY_CONSTANTS = {
  /** Channels used for encoding (RGB) */
  ENCODING_CHANNELS: 3,

  /** Bits per byte */
  BITS_PER_BYTE: 8,

  /** Simple LSB capacity multiplier */
  SIMPLE_MULTIPLIER: 1.0,

  /** Triple redundancy capacity multiplier */
  TRIPLE_MULTIPLIER: 1.0 / 3.0,

  /** Safety margin for capacity calculations */
  SAFETY_MARGIN: 0.95,
} as const;

/**
 * Messaging service compatibility constants
 */
export const MESSAGING_SERVICE_CONSTANTS = {
  /** iMessage compression trigger and quality */
  IMESSAGE: { trigger: 3 * 1024 * 1024, quality: 75 },

  /** WhatsApp compression trigger and quality */
  WHATSAPP: { trigger: 16 * 1024 * 1024, quality: 65 },

  /** SMS/MMS compression trigger and quality */
  SMS_MMS: { trigger: 1 * 1024 * 1024, quality: 45 },

  /** Telegram compression trigger and quality */
  TELEGRAM: { trigger: 10 * 1024 * 1024, quality: 75 },
} as const;

/**
 * Error code constants
 */
export const ERROR_CODES = {
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_MAGIC_SIGNATURE: 'INVALID_MAGIC_SIGNATURE',
  UNSUPPORTED_VERSION: 'UNSUPPORTED_VERSION',
  CHECKSUM_MISMATCH: 'CHECKSUM_MISMATCH',

  // Processing errors
  IMAGE_LOAD_FAILED: 'IMAGE_LOAD_FAILED',
  COMPRESSION_FAILED: 'COMPRESSION_FAILED',
  EMBEDDING_FAILED: 'EMBEDDING_FAILED',
  EXTRACTION_FAILED: 'EXTRACTION_FAILED',

  // Capacity errors
  MESSAGE_TOO_LARGE: 'MESSAGE_TOO_LARGE',
  INSUFFICIENT_CAPACITY: 'INSUFFICIENT_CAPACITY',

  // Method errors
  ENCODING_METHOD_FAILED: 'ENCODING_METHOD_FAILED',
  FALLBACK_FAILED: 'FALLBACK_FAILED',

  // System errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;
