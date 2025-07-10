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

  /** Whether to use compression before encoding */
  useCompression: boolean;

  /** Magic signature for MischiefMaker identification */
  magicSignature: number;

  /** Current algorithm version */
  currentVersion: number;

  /** Enable automatic fallback strategy */
  enableFallback: boolean;
}
