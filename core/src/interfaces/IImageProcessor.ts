import type { CompressionOptions } from '../types/CompressionOptions';
import type { PixelData } from '../types/PixelData';

/**
 * Minimal interface for image processing operations
 * Abstracts platform-specific image manipulation (Canvas API for web, native libraries for mobile)
 */
export interface IImageProcessor {
  /**
   * Preprocess any image format to JPEG with steganography-optimized compression
   * Applies quality, size, and dimension constraints for messaging service compatibility
   */
  preprocessImageToJPEG(buffer: ArrayBuffer, options: CompressionOptions): Promise<ArrayBuffer>;

  /**
   * Decompress JPEG to intermediate image data format for pixel manipulation
   */
  decompressJPEG(jpegBuffer: ArrayBuffer): Promise<IImageData>;

  /**
   * Convert intermediate image data to RGB pixel data for LSB manipulation
   */
  convertToPixelData(imageData: IImageData): Promise<PixelData>;

  /**
   * Apply modified pixel data back to intermediate image data format
   */
  applyPixelData(imageData: IImageData, pixelData: PixelData): Promise<IImageData>;

  /**
   * Compress intermediate image data to final JPEG format
   */
  compressToJPEG(imageData: IImageData, quality: number): Promise<ArrayBuffer>;

  /**
   * Get image dimensions without full loading (for capacity calculations)
   */
  getImageDimensions(buffer: ArrayBuffer): Promise<{ width: number; height: number }>;
}

/**
 * Supported image formats
 */
export type ImageFormat = 'png' | 'jpeg' | 'webp';

/**
 * Platform-agnostic image data representation
 */
export interface IImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}
