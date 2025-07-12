/**
 * Image data builder utilities for jp3g decoder.
 *
 * Extracted from the main decoder to improve maintainability and testability.
 * Handles conversion of decoded JPEG data to HTML5 Canvas ImageData format.
 */

import { clampTo8bit } from './math';

export interface ImageDataContext {
  width: number;
  height: number;
  imageDataArray: Uint8ClampedArray;
  decodedData: Uint8Array;
  componentCount: number;
  formatAsRGBA: boolean;
}

/**
 * Convert grayscale data to ImageData format
 */
export function buildGrayscaleImageData(ctx: ImageDataContext): void {
  const { width, height, imageDataArray, decodedData, formatAsRGBA } = ctx;
  let i = 0;
  let j = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const Y = decodedData[i++];

      imageDataArray[j++] = Y;
      imageDataArray[j++] = Y;
      imageDataArray[j++] = Y;
      if (formatAsRGBA) {
        imageDataArray[j++] = 255;
      }
    }
  }
}

/**
 * Convert RGB data to ImageData format
 */
export function buildRgbImageData(ctx: ImageDataContext): void {
  const { width, height, imageDataArray, decodedData, formatAsRGBA } = ctx;
  let i = 0;
  let j = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const R = decodedData[i++];
      const G = decodedData[i++];
      const B = decodedData[i++];

      imageDataArray[j++] = R;
      imageDataArray[j++] = G;
      imageDataArray[j++] = B;
      if (formatAsRGBA) {
        imageDataArray[j++] = 255;
      }
    }
  }
}

/**
 * Convert CMYK data to ImageData format
 */
export function buildCmykImageData(ctx: ImageDataContext): void {
  const { width, height, imageDataArray, decodedData, formatAsRGBA } = ctx;
  let i = 0;
  let j = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const C = decodedData[i++];
      const M = decodedData[i++];
      const Y = decodedData[i++];
      const K = decodedData[i++];

      // Convert CMYK to RGB
      const R = 255 - clampTo8bit(C * (1 - K / 255) + K);
      const G = 255 - clampTo8bit(M * (1 - K / 255) + K);
      const B = 255 - clampTo8bit(Y * (1 - K / 255) + K);

      imageDataArray[j++] = R;
      imageDataArray[j++] = G;
      imageDataArray[j++] = B;
      if (formatAsRGBA) {
        imageDataArray[j++] = 255;
      }
    }
  }
}

/**
 * Main function to copy decoded data to ImageData
 */
export function copyToImageData(
  imageData: { width: number; height: number; data: Uint8ClampedArray },
  decodedData: Uint8Array,
  componentCount: number,
  formatAsRGBA: boolean
): void {
  const ctx: ImageDataContext = {
    width: imageData.width,
    height: imageData.height,
    imageDataArray: imageData.data,
    decodedData,
    componentCount,
    formatAsRGBA,
  };

  switch (componentCount) {
    case 1:
      buildGrayscaleImageData(ctx);
      break;
    case 3:
      buildRgbImageData(ctx);
      break;
    case 4:
      buildCmykImageData(ctx);
      break;
    default:
      throw new Error('Unsupported color mode');
  }
}
