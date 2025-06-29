/**
 * Minimal interface for image processing operations
 * Abstracts platform-specific image manipulation (Canvas API for web, native libraries for mobile)
 */
export interface ImageProcessor {
  /**
   * Load an image from buffer data
   */
  loadImage(buffer: ArrayBuffer): Promise<ImageData>;
  
  /**
   * Get pixel data from image
   */
  getPixelData(imageData: ImageData): Promise<Uint8ClampedArray>;
  
  /**
   * Set pixel data to image
   */
  setPixelData(imageData: ImageData, pixelData: Uint8ClampedArray): Promise<ImageData>;
  
  /**
   * Convert image to buffer in specified format
   */
  imageToBuffer(imageData: ImageData, format: ImageFormat): Promise<ArrayBuffer>;
}

/**
 * Supported image formats
 */
export type ImageFormat = 'png' | 'jpeg';

/**
 * Platform-agnostic image data representation
 */
export interface ImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
} 