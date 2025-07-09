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
