import { ImageFormat } from '../interfaces/ImageProcessor';

/**
 * Options for encoding operations
 */
export interface EncodeOptions {
  /** The message to hide */
  message: string;
  
  /** Image data to hide message in */
  imageData: ArrayBuffer;
  
  /** Output image format */
  format: ImageFormat;
}

/**
 * Options for decoding operations
 */
export interface DecodeOptions {
  /** Image data containing hidden message */
  imageData: ArrayBuffer;
} 