import type { CompressionOptions } from '../types/AlgorithmTypes';
import type { PixelData } from '../types/PixelData';

/**
 * Minimal interface for image processing operations
 * Abstracts platform-specific image manipulation (Canvas API for web, native libraries for mobile)
 */
export interface IImageProcessor {
  /**
   * Load an image from buffer data and return pixel information
   */
  loadImage(buffer: ArrayBuffer): Promise<IImageData>;

  /**
   * Compress image to JPEG with specified options for messaging compatibility
   */
  compressToJPEG(buffer: ArrayBuffer, options: CompressionOptions): Promise<ArrayBuffer>;

  /**
   * Extract RGB pixel data from image for LSB manipulation
   */
  extractPixelData(imageData: IImageData): Promise<PixelData>;

  /**
   * Apply modified pixel data back to image
   */
  applyPixelData(imageData: IImageData, pixelData: PixelData): Promise<IImageData>;

  /**
   * Convert image to buffer in specified format
   */
  imageToBuffer(imageData: IImageData, format: ImageFormat, quality?: number): Promise<ArrayBuffer>;

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
