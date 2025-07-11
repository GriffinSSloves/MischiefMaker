import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  convertGrayscale,
  convertDualComponent,
  convertYuvToRgb,
  convertYuvToCmyk,
  shouldApplyColorTransform,
  convertRgb,
  convertCmyk,
  convertColorSpace,
  type Component,
  type ConversionContext,
  type ConversionOptions,
} from './colorSpaceConverter';

// Mock the memory manager
vi.mock('./memoryManager', () => ({
  requestMemoryAllocation: vi.fn(),
}));

// Mock the math utilities
vi.mock('./math', () => ({
  clampTo8bit: vi.fn((value: number) => Math.max(0, Math.min(255, Math.round(value)))),
}));

describe('decoder/utils/colorSpaceConverter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockComponent = (lines: number[][], scaleX = 1, scaleY = 1): Component => ({
    lines,
    scaleX,
    scaleY,
  });

  describe('convertYuvToRgb', () => {
    it('should convert YUV values to RGB', () => {
      // Test standard YUV to RGB conversion
      const [R, G, B] = convertYuvToRgb(128, 128, 128);
      expect(R).toBe(128); // Y value should be preserved
      expect(G).toBe(128);
      expect(B).toBe(128);
    });

    it('should handle bright colors correctly', () => {
      // Test with bright red (high Cr)
      const [R, G, B] = convertYuvToRgb(128, 128, 200);
      expect(R).toBeGreaterThan(G);
      expect(R).toBeGreaterThan(B);
    });

    it('should clamp values to valid range', () => {
      // Test extreme values that should be clamped
      const [R, G, B] = convertYuvToRgb(255, 255, 255);
      expect(R).toBeLessThanOrEqual(255);
      expect(G).toBeLessThanOrEqual(255);
      expect(B).toBeLessThanOrEqual(255);
    });
  });

  describe('convertYuvToCmyk', () => {
    it('should convert YUV values to CMYK', () => {
      const [C, M, Ye] = convertYuvToCmyk(128, 128, 128);
      expect(C).toBe(127); // 255 - 128
      expect(M).toBe(127);
      expect(Ye).toBe(127);
    });

    it('should handle color conversion correctly', () => {
      const [C, M, Ye] = convertYuvToCmyk(200, 100, 100);
      expect(typeof C).toBe('number');
      expect(typeof M).toBe('number');
      expect(typeof Ye).toBe('number');
      expect(C).toBeGreaterThanOrEqual(0);
      expect(M).toBeGreaterThanOrEqual(0);
      expect(Ye).toBeGreaterThanOrEqual(0);
    });
  });

  describe('shouldApplyColorTransform', () => {
    it('should return true for 3 components by default', () => {
      const options: ConversionOptions = {};
      expect(shouldApplyColorTransform(3, options)).toBe(true);
    });

    it('should return false for 4 components by default', () => {
      const options: ConversionOptions = {};
      expect(shouldApplyColorTransform(4, options)).toBe(false);
    });

    it('should respect explicit colorTransform setting', () => {
      const options: ConversionOptions = { colorTransform: false };
      expect(shouldApplyColorTransform(3, options)).toBe(false);
    });

    it('should respect Adobe transform code', () => {
      const options: ConversionOptions = {
        colorTransform: false,
        adobe: { transformCode: 1 },
      };
      expect(shouldApplyColorTransform(3, options)).toBe(true);
      expect(shouldApplyColorTransform(4, options)).toBe(true);
    });

    it('should return false for unsupported component counts', () => {
      const options: ConversionOptions = {};
      expect(shouldApplyColorTransform(1, options)).toBe(false);
      expect(shouldApplyColorTransform(2, options)).toBe(false);
      expect(shouldApplyColorTransform(5, options)).toBe(false);
    });
  });

  describe('convertGrayscale', () => {
    it('should convert single component grayscale data', () => {
      const component = createMockComponent([
        [100, 150, 200],
        [50, 75, 125],
      ]);

      const ctx: ConversionContext = {
        width: 3,
        height: 2,
        scaleX: 1,
        scaleY: 1,
        components: [component],
        options: {},
      };

      const result = convertGrayscale(ctx);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(6); // 3 * 2
      expect(Array.from(result)).toEqual([100, 150, 200, 50, 75, 125]);
    });

    it('should handle scaling correctly', () => {
      const component = createMockComponent(
        [
          [100, 150, 200, 250],
          [50, 75, 125, 175],
        ],
        0.5,
        0.5
      );

      const ctx: ConversionContext = {
        width: 2,
        height: 1,
        scaleX: 2, // 4/2
        scaleY: 2, // 2/1
        components: [component],
        options: {},
      };

      const result = convertGrayscale(ctx);
      expect(result.length).toBe(2); // 2 * 1
      // The scaling logic uses: 0 | (x * component.scaleX * scaleX)
      // For x=0: 0 | (0 * 0.5 * 2) = 0 -> component[0][0] = 100
      // For x=1: 0 | (1 * 0.5 * 2) = 1 -> component[0][1] = 150
      expect(Array.from(result)).toEqual([100, 150]);
    });
  });

  describe('convertDualComponent', () => {
    it('should convert dual component data', () => {
      const component1 = createMockComponent([
        [100, 150],
        [200, 250],
      ]);
      const component2 = createMockComponent([
        [50, 75],
        [125, 175],
      ]);

      const ctx: ConversionContext = {
        width: 2,
        height: 2,
        scaleX: 1,
        scaleY: 1,
        components: [component1, component2],
        options: {},
      };

      const result = convertDualComponent(ctx);
      expect(result.length).toBe(8); // 2 * 2 * 2 components
      expect(Array.from(result)).toEqual([100, 50, 150, 75, 200, 125, 250, 175]);
    });
  });

  describe('convertRgb', () => {
    it('should convert RGB without color transform', () => {
      const component1 = createMockComponent([
        [255, 0],
        [0, 128],
      ]); // R
      const component2 = createMockComponent([
        [0, 255],
        [0, 128],
      ]); // G
      const component3 = createMockComponent([
        [0, 0],
        [255, 128],
      ]); // B

      const ctx: ConversionContext = {
        width: 2,
        height: 2,
        scaleX: 1,
        scaleY: 1,
        components: [component1, component2, component3],
        options: { colorTransform: false },
      };

      const result = convertRgb(ctx);
      expect(result.length).toBe(12); // 2 * 2 * 3 components
      expect(Array.from(result)).toEqual([
        255,
        0,
        0, // Red pixel
        0,
        255,
        0, // Green pixel
        0,
        0,
        255, // Blue pixel
        128,
        128,
        128, // Gray pixel
      ]);
    });

    it('should convert YUV to RGB with color transform', () => {
      const component1 = createMockComponent([[128, 200]]); // Y
      const component2 = createMockComponent([[128, 100]]); // Cb
      const component3 = createMockComponent([[128, 150]]); // Cr

      const ctx: ConversionContext = {
        width: 2,
        height: 1,
        scaleX: 1,
        scaleY: 1,
        components: [component1, component2, component3],
        options: { colorTransform: true },
      };

      const result = convertRgb(ctx);
      expect(result.length).toBe(6); // 2 * 1 * 3 components
      // First pixel should be neutral (Y=128, Cb=128, Cr=128)
      expect(result[0]).toBe(128); // R
      expect(result[1]).toBe(128); // G
      expect(result[2]).toBe(128); // B
      // Second pixel values depend on YUV conversion
      expect(typeof result[3]).toBe('number');
      expect(typeof result[4]).toBe('number');
      expect(typeof result[5]).toBe('number');
    });
  });

  describe('convertCmyk', () => {
    it('should throw error without Adobe marker', () => {
      const ctx: ConversionContext = {
        width: 1,
        height: 1,
        scaleX: 1,
        scaleY: 1,
        components: [
          createMockComponent([[100]]),
          createMockComponent([[100]]),
          createMockComponent([[100]]),
          createMockComponent([[100]]),
        ],
        options: {},
      };

      expect(() => convertCmyk(ctx)).toThrow('Unsupported color mode (4 components)');
    });

    it('should convert CMYK without color transform', () => {
      const component1 = createMockComponent([[100]]); // C
      const component2 = createMockComponent([[150]]); // M
      const component3 = createMockComponent([[200]]); // Y
      const component4 = createMockComponent([[50]]); // K

      const ctx: ConversionContext = {
        width: 1,
        height: 1,
        scaleX: 1,
        scaleY: 1,
        components: [component1, component2, component3, component4],
        options: {
          colorTransform: false,
          adobe: { transformCode: 0 },
        },
      };

      const result = convertCmyk(ctx);
      expect(result.length).toBe(4); // 1 * 1 * 4 components
      expect(Array.from(result)).toEqual([
        255 - 100, // 255 - C
        255 - 150, // 255 - M
        255 - 200, // 255 - Y
        255 - 50, // 255 - K
      ]);
    });
  });

  describe('convertColorSpace', () => {
    it('should route to correct converter based on component count', () => {
      // Test grayscale routing
      const grayscaleCtx: ConversionContext = {
        width: 1,
        height: 1,
        scaleX: 1,
        scaleY: 1,
        components: [createMockComponent([[100]])],
        options: {},
      };

      const grayscaleResult = convertColorSpace(grayscaleCtx);
      expect(grayscaleResult.length).toBe(1);
      expect(grayscaleResult[0]).toBe(100);

      // Test RGB routing
      const rgbCtx: ConversionContext = {
        width: 1,
        height: 1,
        scaleX: 1,
        scaleY: 1,
        components: [createMockComponent([[255]]), createMockComponent([[128]]), createMockComponent([[64]])],
        options: { colorTransform: false },
      };

      const rgbResult = convertColorSpace(rgbCtx);
      expect(rgbResult.length).toBe(3);
      expect(Array.from(rgbResult)).toEqual([255, 128, 64]);
    });

    it('should throw error for unsupported component count', () => {
      const ctx: ConversionContext = {
        width: 1,
        height: 1,
        scaleX: 1,
        scaleY: 1,
        components: [
          createMockComponent([[100]]),
          createMockComponent([[100]]),
          createMockComponent([[100]]),
          createMockComponent([[100]]),
          createMockComponent([[100]]), // 5 components - unsupported
        ],
        options: {},
      };

      expect(() => convertColorSpace(ctx)).toThrow('Unsupported color mode');
    });
  });
});
