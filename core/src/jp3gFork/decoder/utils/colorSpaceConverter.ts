/**
 * Color space conversion utilities for jp3g decoder.
 *
 * Extracted from the main decoder to improve maintainability and testability.
 * Handles conversion between different color spaces (grayscale, YUV, CMYK, etc.).
 */

import { clampTo8bit } from './math';
import { requestMemoryAllocation } from './memoryManager';

export interface Component {
  lines: number[][];
  scaleX: number;
  scaleY: number;
}

export interface ConversionOptions {
  colorTransform?: boolean;
  adobe?: {
    transformCode: number;
  } | null;
}

export interface ConversionContext {
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  components: Component[];
  options: ConversionOptions;
}

/**
 * Convert grayscale (1 component) image data
 */
export function convertGrayscale(ctx: ConversionContext): Uint8Array {
  const { width, height, scaleX, scaleY, components } = ctx;
  const dataLength = width * height;
  requestMemoryAllocation(dataLength);
  const data = new Uint8Array(dataLength);

  const component1 = components[0];
  let offset = 0;

  for (let y = 0; y < height; y++) {
    const component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)];
    for (let x = 0; x < width; x++) {
      const Y = component1Line[0 | (x * component1.scaleX * scaleX)];
      data[offset++] = Y;
    }
  }

  return data;
}

/**
 * Convert dual component image data (PDF custom colorspace)
 */
export function convertDualComponent(ctx: ConversionContext): Uint8Array {
  const { width, height, scaleX, scaleY, components } = ctx;
  const dataLength = width * height * 2;
  requestMemoryAllocation(dataLength);
  const data = new Uint8Array(dataLength);

  const component1 = components[0];
  const component2 = components[1];
  let offset = 0;

  for (let y = 0; y < height; y++) {
    const component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)];
    const component2Line = component2.lines[0 | (y * component2.scaleY * scaleY)];
    for (let x = 0; x < width; x++) {
      const Y1 = component1Line[0 | (x * component1.scaleX * scaleX)];
      data[offset++] = Y1;
      const Y2 = component2Line[0 | (x * component2.scaleX * scaleX)];
      data[offset++] = Y2;
    }
  }

  return data;
}

/**
 * Convert YUV to RGB color values
 */
export function convertYuvToRgb(Y: number, Cb: number, Cr: number): [number, number, number] {
  const R = clampTo8bit(Y + 1.402 * (Cr - 128));
  const G = clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
  const B = clampTo8bit(Y + 1.772 * (Cb - 128));
  return [R, G, B];
}

/**
 * Convert YUV to CMYK color values
 */
export function convertYuvToCmyk(Y: number, Cb: number, Cr: number): [number, number, number] {
  const C = 255 - clampTo8bit(Y + 1.402 * (Cr - 128));
  const M = 255 - clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
  const Ye = 255 - clampTo8bit(Y + 1.772 * (Cb - 128));
  return [C, M, Ye];
}

/**
 * Determine if color transform should be applied
 */
export function shouldApplyColorTransform(componentCount: number, options: ConversionOptions): boolean {
  if (componentCount === 3) {
    // The default transform for three components is true
    let colorTransform = true;
    // The adobe transform marker overrides any previous setting
    if (options.adobe && options.adobe.transformCode) {
      colorTransform = true;
    } else if (typeof options.colorTransform !== 'undefined') {
      colorTransform = !!options.colorTransform;
    }
    return colorTransform;
  } else if (componentCount === 4) {
    // The default transform for four components is false
    let colorTransform = false;
    // The adobe transform marker overrides any previous setting
    if (options.adobe && options.adobe.transformCode) {
      colorTransform = true;
    } else if (typeof options.colorTransform !== 'undefined') {
      colorTransform = !!options.colorTransform;
    }
    return colorTransform;
  }
  return false;
}

/**
 * Convert RGB (3 component) image data
 */
export function convertRgb(ctx: ConversionContext): Uint8Array {
  const { width, height, scaleX, scaleY, components, options } = ctx;
  const dataLength = width * height * 3;
  requestMemoryAllocation(dataLength);
  const data = new Uint8Array(dataLength);

  const colorTransform = shouldApplyColorTransform(3, options);
  const component1 = components[0];
  const component2 = components[1];
  const component3 = components[2];
  let offset = 0;

  for (let y = 0; y < height; y++) {
    const component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)];
    const component2Line = component2.lines[0 | (y * component2.scaleY * scaleY)];
    const component3Line = component3.lines[0 | (y * component3.scaleY * scaleY)];

    for (let x = 0; x < width; x++) {
      let R: number, G: number, B: number;

      if (!colorTransform) {
        // Direct RGB values
        R = component1Line[0 | (x * component1.scaleX * scaleX)];
        G = component2Line[0 | (x * component2.scaleX * scaleX)];
        B = component3Line[0 | (x * component3.scaleX * scaleX)];
      } else {
        // YUV to RGB conversion
        const Y = component1Line[0 | (x * component1.scaleX * scaleX)];
        const Cb = component2Line[0 | (x * component2.scaleX * scaleX)];
        const Cr = component3Line[0 | (x * component3.scaleX * scaleX)];
        [R, G, B] = convertYuvToRgb(Y, Cb, Cr);
      }

      data[offset++] = R;
      data[offset++] = G;
      data[offset++] = B;
    }
  }

  return data;
}

/**
 * Convert CMYK (4 component) image data
 */
export function convertCmyk(ctx: ConversionContext): Uint8Array {
  const { width, height, scaleX, scaleY, components, options } = ctx;

  if (!options.adobe) {
    throw new Error('Unsupported color mode (4 components)');
  }

  const dataLength = width * height * 4;
  requestMemoryAllocation(dataLength);
  const data = new Uint8Array(dataLength);

  const colorTransform = shouldApplyColorTransform(4, options);
  const component1 = components[0];
  const component2 = components[1];
  const component3 = components[2];
  const component4 = components[3];
  let offset = 0;

  for (let y = 0; y < height; y++) {
    const component1Line = component1.lines[0 | (y * component1.scaleY * scaleY)];
    const component2Line = component2.lines[0 | (y * component2.scaleY * scaleY)];
    const component3Line = component3.lines[0 | (y * component3.scaleY * scaleY)];
    const component4Line = component4.lines[0 | (y * component4.scaleY * scaleY)];

    for (let x = 0; x < width; x++) {
      let C: number, M: number, Ye: number, K: number;

      if (!colorTransform) {
        // Direct CMYK values
        C = component1Line[0 | (x * component1.scaleX * scaleX)];
        M = component2Line[0 | (x * component2.scaleX * scaleX)];
        Ye = component3Line[0 | (x * component3.scaleX * scaleX)];
        K = component4Line[0 | (x * component4.scaleX * scaleX)];
      } else {
        // YUV + K to CMYK conversion
        const Y = component1Line[0 | (x * component1.scaleX * scaleX)];
        const Cb = component2Line[0 | (x * component2.scaleX * scaleX)];
        const Cr = component3Line[0 | (x * component3.scaleX * scaleX)];
        K = component4Line[0 | (x * component4.scaleX * scaleX)];

        [C, M, Ye] = convertYuvToCmyk(Y, Cb, Cr);
      }

      data[offset++] = 255 - C;
      data[offset++] = 255 - M;
      data[offset++] = 255 - Ye;
      data[offset++] = 255 - K;
    }
  }

  return data;
}

/**
 * Main color space conversion function
 */
export function convertColorSpace(ctx: ConversionContext): Uint8Array {
  const componentCount = ctx.components.length;

  switch (componentCount) {
    case 1:
      return convertGrayscale(ctx);
    case 2:
      return convertDualComponent(ctx);
    case 3:
      return convertRgb(ctx);
    case 4:
      return convertCmyk(ctx);
    default:
      throw new Error('Unsupported color mode');
  }
}
