/**
 * Available encoding methods for steganography
 */
export type EncodingMethod = 'simple-lsb' | 'triple-redundancy' | 'adaptive-lsb';

/**
 * Core algorithm configuration
 */
export interface AlgorithmConfig {
  /** JPEG compression quality (SMS/MMS compatible) */
  jpegQuality: number;

  /** Maximum file size in bytes */
  maxFileSize: number;

  /** Maximum image dimensions */
  maxDimensions: number;

  /** LSB depth for encoding (typically 1) */
  lsbDepth: number;

  /** Redundancy factor for error correction (typically 3) */
  redundancyFactor: number;

  /** Safety margin for capacity calculations (0.0 to 1.0) */
  safetyMargin: number;

  /** Whether to use compression before encoding */
  useCompression: boolean;

  /** Preferred encoding method */
  preferredMethod: EncodingMethod;

  /** Magic signature for MischiefMaker identification */
  magicSignature: number;

  /** Current algorithm version */
  currentVersion: number;

  /** Enable automatic fallback strategy */
  enableFallback: boolean;
}

/**
 * JPEG compression options
 */
export interface CompressionOptions {
  /** JPEG quality percentage (1-100) */
  quality: number;

  /** Maximum file size in bytes */
  maxSize: number;

  /** Maximum width/height dimensions */
  maxDimensions: number;

  /** Whether to maintain aspect ratio */
  maintainAspectRatio: boolean;

  /** Compression algorithm to use */
  algorithm: 'none' | 'gzip' | 'deflate';

  /** Compression level (1-9, where 9 is maximum compression) */
  level: number;

  /** Whether to include compression metadata in header */
  includeMetadata: boolean;
}

/**
 * LSB encoding configuration
 */
export interface LSBConfig {
  /** Number of LSBs to use per channel (1-3) */
  bitsPerChannel: number;

  /** Channels to use for encoding */
  channels: ('red' | 'green' | 'blue')[];

  /** Whether to randomize bit positions */
  randomizeBits: boolean;

  /** Seed for randomization (if enabled) */
  randomSeed?: number;

  /** Starting pixel offset for encoding */
  startOffset: number;
}
