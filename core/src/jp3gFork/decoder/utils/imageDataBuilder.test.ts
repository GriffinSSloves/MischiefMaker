import { describe, it, expect, vi } from 'vitest';
import {
  buildGrayscaleImageData,
  buildRgbImageData,
  buildCmykImageData,
  copyToImageData,
  type ImageDataContext,
} from './imageDataBuilder';

// Mock the math utilities
vi.mock('./math', () => ({
  clampTo8bit: vi.fn((value: number) => Math.max(0, Math.min(255, Math.round(value)))),
}));

describe('decoder/utils/imageDataBuilder', () => {
  const createMockImageData = (width: number, height: number, channels = 4) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * channels),
  });

  describe('buildGrayscaleImageData', () => {
    it('should convert grayscale data to RGB format', () => {
      const imageData = createMockImageData(2, 2);
      const decodedData = new Uint8Array([100, 150, 200, 250]);

      const ctx: ImageDataContext = {
        width: 2,
        height: 2,
        imageDataArray: imageData.data,
        decodedData,
        componentCount: 1,
        formatAsRGBA: true,
      };

      buildGrayscaleImageData(ctx);

      // Each grayscale value should be replicated to R, G, B, plus alpha 255
      expect(Array.from(imageData.data)).toEqual([
        100,
        100,
        100,
        255, // First pixel: gray 100
        150,
        150,
        150,
        255, // Second pixel: gray 150
        200,
        200,
        200,
        255, // Third pixel: gray 200
        250,
        250,
        250,
        255, // Fourth pixel: gray 250
      ]);
    });

    it('should handle RGB format without alpha', () => {
      const imageData = {
        width: 1,
        height: 1,
        data: new Uint8ClampedArray(3), // RGB only
      };
      const decodedData = new Uint8Array([128]);

      const ctx: ImageDataContext = {
        width: 1,
        height: 1,
        imageDataArray: imageData.data,
        decodedData,
        componentCount: 1,
        formatAsRGBA: false,
      };

      buildGrayscaleImageData(ctx);

      expect(Array.from(imageData.data)).toEqual([128, 128, 128]);
    });
  });

  describe('buildRgbImageData', () => {
    it('should convert RGB data to RGBA format', () => {
      const imageData = createMockImageData(2, 1);
      const decodedData = new Uint8Array([
        255,
        0,
        0, // Red pixel
        0,
        255,
        0, // Green pixel
      ]);

      const ctx: ImageDataContext = {
        width: 2,
        height: 1,
        imageDataArray: imageData.data,
        decodedData,
        componentCount: 3,
        formatAsRGBA: true,
      };

      buildRgbImageData(ctx);

      expect(Array.from(imageData.data)).toEqual([
        255,
        0,
        0,
        255, // Red pixel with alpha
        0,
        255,
        0,
        255, // Green pixel with alpha
      ]);
    });

    it('should handle RGB format without alpha', () => {
      const imageData = {
        width: 1,
        height: 1,
        data: new Uint8ClampedArray(3), // RGB only
      };
      const decodedData = new Uint8Array([100, 150, 200]);

      const ctx: ImageDataContext = {
        width: 1,
        height: 1,
        imageDataArray: imageData.data,
        decodedData,
        componentCount: 3,
        formatAsRGBA: false,
      };

      buildRgbImageData(ctx);

      expect(Array.from(imageData.data)).toEqual([100, 150, 200]);
    });
  });

  describe('buildCmykImageData', () => {
    it('should convert CMYK data to RGB format', () => {
      const imageData = createMockImageData(1, 1);
      // CMYK values: C=0, M=0, Y=0, K=0 should produce white (255, 255, 255)
      const decodedData = new Uint8Array([0, 0, 0, 0]);

      const ctx: ImageDataContext = {
        width: 1,
        height: 1,
        imageDataArray: imageData.data,
        decodedData,
        componentCount: 4,
        formatAsRGBA: true,
      };

      buildCmykImageData(ctx);

      // CMYK(0,0,0,0) should convert to RGB(255,255,255)
      expect(Array.from(imageData.data)).toEqual([255, 255, 255, 255]);
    });

    it('should handle CMYK black color correctly', () => {
      const imageData = createMockImageData(1, 1);
      // CMYK values: C=0, M=0, Y=0, K=255 should produce black (0, 0, 0)
      const decodedData = new Uint8Array([0, 0, 0, 255]);

      const ctx: ImageDataContext = {
        width: 1,
        height: 1,
        imageDataArray: imageData.data,
        decodedData,
        componentCount: 4,
        formatAsRGBA: true,
      };

      buildCmykImageData(ctx);

      // CMYK(0,0,0,255) should convert to RGB(0,0,0)
      expect(Array.from(imageData.data)).toEqual([0, 0, 0, 255]);
    });

    it('should handle CMYK to RGB conversion with partial colors', () => {
      const imageData = createMockImageData(1, 1);
      // CMYK values: C=255, M=0, Y=0, K=0 should produce cyan-like color
      const decodedData = new Uint8Array([255, 0, 0, 0]);

      const ctx: ImageDataContext = {
        width: 1,
        height: 1,
        imageDataArray: imageData.data,
        decodedData,
        componentCount: 4,
        formatAsRGBA: true,
      };

      buildCmykImageData(ctx);

      // The exact RGB values depend on the CMYK formula
      // C=255, M=0, Y=0, K=0: R = 255 - clampTo8bit(255 * (1 - 0/255) + 0) = 255 - 255 = 0
      expect(imageData.data[0]).toBe(0); // R should be 0 (cyan has no red)
      expect(imageData.data[1]).toBe(255); // G should be 255
      expect(imageData.data[2]).toBe(255); // B should be 255
      expect(imageData.data[3]).toBe(255); // Alpha should be 255
    });
  });

  describe('copyToImageData', () => {
    it('should route to grayscale converter for 1 component', () => {
      const imageData = createMockImageData(1, 1);
      const decodedData = new Uint8Array([128]);

      copyToImageData(imageData, decodedData, 1, true);

      expect(Array.from(imageData.data)).toEqual([128, 128, 128, 255]);
    });

    it('should route to RGB converter for 3 components', () => {
      const imageData = createMockImageData(1, 1);
      const decodedData = new Uint8Array([255, 128, 64]);

      copyToImageData(imageData, decodedData, 3, true);

      expect(Array.from(imageData.data)).toEqual([255, 128, 64, 255]);
    });

    it('should route to CMYK converter for 4 components', () => {
      const imageData = createMockImageData(1, 1);
      const decodedData = new Uint8Array([0, 0, 0, 0]); // White in CMYK

      copyToImageData(imageData, decodedData, 4, true);

      expect(Array.from(imageData.data)).toEqual([255, 255, 255, 255]);
    });

    it('should throw error for unsupported component count', () => {
      const imageData = createMockImageData(1, 1);
      const decodedData = new Uint8Array([100, 100]);

      expect(() => {
        copyToImageData(imageData, decodedData, 2, true);
      }).toThrow('Unsupported color mode');
    });

    it('should handle RGB format correctly', () => {
      const imageData = {
        width: 1,
        height: 1,
        data: new Uint8ClampedArray(3), // RGB format
      };
      const decodedData = new Uint8Array([200, 150, 100]);

      copyToImageData(imageData, decodedData, 3, false);

      expect(Array.from(imageData.data)).toEqual([200, 150, 100]);
    });

    it('should handle multi-pixel images correctly', () => {
      const imageData = createMockImageData(2, 2);
      const decodedData = new Uint8Array([
        255,
        0,
        0, // Red
        0,
        255,
        0, // Green
        0,
        0,
        255, // Blue
        128,
        128,
        128, // Gray
      ]);

      copyToImageData(imageData, decodedData, 3, true);

      expect(Array.from(imageData.data)).toEqual([
        255,
        0,
        0,
        255, // Red with alpha
        0,
        255,
        0,
        255, // Green with alpha
        0,
        0,
        255,
        255, // Blue with alpha
        128,
        128,
        128,
        255, // Gray with alpha
      ]);
    });
  });
});
