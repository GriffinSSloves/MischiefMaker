import { describe, it, expect } from 'vitest';
import { CapacityCalculator } from './CapacityCalculator';
import type { PixelData } from '../../types/PixelData';

describe('CapacityCalculator', () => {
  const calculator = new CapacityCalculator();

  describe('calculateCapacity', () => {
    it('should calculate capacity for standard image dimensions', () => {
      // 1024x768 image (typical for algorithm documentation examples)
      const capacity = calculator.calculateCapacity(1024, 768);

      expect(capacity.totalPixels).toBe(786432);
      expect(capacity.availableBits).toBe(2359296); // 786432 * 3 channels * 1 LSB
      expect(capacity.effectiveBits).toBe(2241331); // With 0.95 safety margin
      expect(capacity.headerSize).toBe(16); // Total header bytes

      // Simple LSB: (2241331 - 16*8) / 8 = 280150 bytes ≈ 274KB
      expect(capacity.simpleCapacity).toBeGreaterThan(275000);
      expect(capacity.simpleCapacity).toBeLessThan(285000);

      // Triple redundancy: (2241331/3 - 16*8) / 8 = 93370 bytes ≈ 91KB
      expect(capacity.tripleCapacity).toBeGreaterThan(90000);
      expect(capacity.tripleCapacity).toBeLessThan(95000);
    });

    it('should handle small image dimensions', () => {
      const capacity = calculator.calculateCapacity(100, 100);

      expect(capacity.totalPixels).toBe(10000);
      expect(capacity.simpleCapacity).toBeGreaterThan(0);
      expect(capacity.tripleCapacity).toBeGreaterThan(0);
      expect(capacity.tripleCapacity).toBeLessThan(capacity.simpleCapacity);
    });

    it('should throw error for invalid dimensions', () => {
      expect(() => calculator.calculateCapacity(0, 100)).toThrow('Image dimensions must be positive');
      expect(() => calculator.calculateCapacity(100, 0)).toThrow('Image dimensions must be positive');
      expect(() => calculator.calculateCapacity(-1, 100)).toThrow('Image dimensions must be positive');
    });

    it('should have triple capacity approximately 1/3 of simple capacity', () => {
      const capacity = calculator.calculateCapacity(500, 500);
      const ratio = capacity.tripleCapacity / capacity.simpleCapacity;

      // Should be approximately 1/3 (allowing for header overhead and rounding)
      expect(ratio).toBeGreaterThan(0.3);
      expect(ratio).toBeLessThan(0.4);
    });

    it('should calculate capacity for very large images', () => {
      const capacity = calculator.calculateCapacity(4000, 3000);

      expect(capacity.totalPixels).toBe(12000000);
      expect(capacity.availableBits).toBe(36000000);
      expect(capacity.effectiveBits).toBe(34200000); // With 0.95 safety margin
      expect(capacity.simpleCapacity).toBeGreaterThan(4000000); // Over 4MB
      expect(capacity.tripleCapacity).toBeGreaterThan(1000000); // Over 1MB
    });

    it('should return valid CapacityInfo structure', () => {
      const capacity = calculator.calculateCapacity(200, 200);

      expect(capacity).toHaveProperty('totalPixels');
      expect(capacity).toHaveProperty('availableBits');
      expect(capacity).toHaveProperty('effectiveBits');
      expect(capacity).toHaveProperty('simpleCapacity');
      expect(capacity).toHaveProperty('tripleCapacity');
      expect(capacity).toHaveProperty('headerSize');

      expect(typeof capacity.totalPixels).toBe('number');
      expect(typeof capacity.availableBits).toBe('number');
      expect(typeof capacity.effectiveBits).toBe('number');
      expect(typeof capacity.simpleCapacity).toBe('number');
      expect(typeof capacity.tripleCapacity).toBe('number');
      expect(typeof capacity.headerSize).toBe('number');
    });
  });

  describe('calculateFromPixelData', () => {
    it('should calculate capacity from pixel data', () => {
      const pixelData: PixelData = {
        width: 200,
        height: 150,
        channels: {
          red: Array.from(new Uint8ClampedArray(30000)),
          green: Array.from(new Uint8ClampedArray(30000)),
          blue: Array.from(new Uint8ClampedArray(30000)),
        },
        totalPixels: 30000,
      };

      const capacity = calculator.calculateFromPixelData(pixelData);
      const expectedCapacity = calculator.calculateCapacity(200, 150);

      expect(capacity).toEqual(expectedCapacity);
    });

    it('should handle square pixel data', () => {
      const pixelData: PixelData = {
        width: 100,
        height: 100,
        channels: {
          red: Array.from(new Uint8ClampedArray(10000)),
          green: Array.from(new Uint8ClampedArray(10000)),
          blue: Array.from(new Uint8ClampedArray(10000)),
        },
        totalPixels: 10000,
      };

      const capacity = calculator.calculateFromPixelData(pixelData);

      expect(capacity.totalPixels).toBe(10000);
      expect(capacity.simpleCapacity).toBeGreaterThan(0);
      expect(capacity.tripleCapacity).toBeGreaterThan(0);
    });

    it('should handle minimum size pixel data', () => {
      const pixelData: PixelData = {
        width: 1,
        height: 1,
        channels: {
          red: [128],
          green: [128],
          blue: [128],
        },
        totalPixels: 1,
      };

      const capacity = calculator.calculateFromPixelData(pixelData);

      expect(capacity.totalPixels).toBe(1);
      expect(capacity.availableBits).toBe(3);
      // With such small capacity, most values might be 0 after header overhead
      expect(capacity.simpleCapacity).toBeGreaterThanOrEqual(0);
      expect(capacity.tripleCapacity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('capacity relationships', () => {
    it('should maintain consistent capacity relationships', () => {
      const capacity = calculator.calculateCapacity(1000, 1000);

      // Basic sanity checks
      expect(capacity.availableBits).toBe(capacity.totalPixels * 3);
      expect(capacity.effectiveBits).toBeLessThan(capacity.availableBits);
      expect(capacity.simpleCapacity).toBeGreaterThan(capacity.tripleCapacity);

      // Triple redundancy should be approximately 1/3 of simple
      const ratio = capacity.tripleCapacity / capacity.simpleCapacity;
      expect(ratio).toBeGreaterThan(0.25);
      expect(ratio).toBeLessThan(0.4);
    });

    it('should handle different image aspect ratios', () => {
      const square = calculator.calculateCapacity(500, 500);
      const wide = calculator.calculateCapacity(1000, 250);
      const tall = calculator.calculateCapacity(250, 1000);

      // All should have same total pixels and capacity
      expect(square.totalPixels).toBe(wide.totalPixels);
      expect(square.totalPixels).toBe(tall.totalPixels);
      expect(square.simpleCapacity).toBe(wide.simpleCapacity);
      expect(square.simpleCapacity).toBe(tall.simpleCapacity);
      expect(square.tripleCapacity).toBe(wide.tripleCapacity);
      expect(square.tripleCapacity).toBe(tall.tripleCapacity);
    });
  });
});
