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
  });

  describe('canFit methods', () => {
    const width = 1000;
    const height = 1000;

    it('should correctly determine if message fits with simple LSB', () => {
      const capacity = calculator.calculateCapacity(width, height);

      // Small message should fit
      expect(calculator.canFitSimple(width, height, 1000)).toBe(true);

      // Message exactly at capacity should fit
      expect(calculator.canFitSimple(width, height, capacity.simpleCapacity)).toBe(true);

      // Message larger than capacity should not fit
      expect(calculator.canFitSimple(width, height, capacity.simpleCapacity + 1)).toBe(false);
    });

    it('should correctly determine if message fits with triple redundancy', () => {
      const capacity = calculator.calculateCapacity(width, height);

      // Small message should fit
      expect(calculator.canFitTriple(width, height, 1000)).toBe(true);

      // Message exactly at capacity should fit
      expect(calculator.canFitTriple(width, height, capacity.tripleCapacity)).toBe(true);

      // Message larger than capacity should not fit
      expect(calculator.canFitTriple(width, height, capacity.tripleCapacity + 1)).toBe(false);
    });

    it('should correctly determine if message fits with any method', () => {
      const capacity = calculator.calculateCapacity(width, height);

      // Message that fits in simple should fit in any
      expect(calculator.canFitAny(width, height, 1000)).toBe(true);

      // Message that only fits in simple should still fit in any
      const largeMessage = capacity.tripleCapacity + 1000;
      if (largeMessage <= capacity.simpleCapacity) {
        expect(calculator.canFitAny(width, height, largeMessage)).toBe(true);
      }

      // Message larger than both should not fit
      expect(calculator.canFitAny(width, height, capacity.simpleCapacity + 1)).toBe(false);
    });
  });

  describe('getUtilization', () => {
    it('should calculate utilization percentage correctly', () => {
      const capacity = calculator.calculateCapacity(500, 500);

      // 50% utilization
      const halfMessage = Math.floor(capacity.simpleCapacity / 2);
      const utilization = calculator.getUtilization(capacity, halfMessage, true);
      expect(utilization).toBeCloseTo(50, 1);

      // 100% utilization
      const fullUtilization = calculator.getUtilization(capacity, capacity.simpleCapacity, true);
      expect(fullUtilization).toBeCloseTo(100, 1);

      // Over-capacity should cap at 100%
      const overUtilization = calculator.getUtilization(capacity, capacity.simpleCapacity + 1000, true);
      expect(overUtilization).toBe(100);
    });

    it('should handle zero capacity gracefully', () => {
      const zeroCapacity = calculator.calculateCapacity(1, 1); // Very small image
      // Force zero capacity for testing
      const testCapacity = { ...zeroCapacity, simpleCapacity: 0 };

      const utilization = calculator.getUtilization(testCapacity, 100, true);
      expect(utilization).toBe(0);
    });
  });

  describe('calculateMinimumDimensions', () => {
    it('should calculate minimum dimensions for small messages', () => {
      const dimensions = calculator.calculateMinimumDimensions(1000); // 1KB message

      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
      expect(dimensions.width).toBe(dimensions.height); // Should be square

      // Verify the calculated dimensions actually work
      expect(calculator.canFitSimple(dimensions.width, dimensions.height, 1000)).toBe(true);
    });

    it('should calculate larger dimensions for triple redundancy', () => {
      const simpleSize = calculator.calculateMinimumDimensions(1000, true);
      const tripleSize = calculator.calculateMinimumDimensions(1000, false);

      // Triple redundancy should require larger dimensions
      expect(tripleSize.width * tripleSize.height).toBeGreaterThan(simpleSize.width * simpleSize.height);

      // Verify both work
      expect(calculator.canFitSimple(simpleSize.width, simpleSize.height, 1000)).toBe(true);
      expect(calculator.canFitTriple(tripleSize.width, tripleSize.height, 1000)).toBe(true);
    });

    it('should handle zero-length messages', () => {
      const dimensions = calculator.calculateMinimumDimensions(0);

      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);

      // Should be able to fit header at minimum
      expect(calculator.canFitSimple(dimensions.width, dimensions.height, 0)).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical messaging scenarios', () => {
      // Typical 1KB message in 750KB JPEG (approximately 1024x768)
      const result = calculator.canFitAny(1024, 768, 1024); // 1KB message
      expect(result).toBe(true);

      // Large message that might require fallback
      const capacity = calculator.calculateCapacity(1024, 768);
      const largeMessage = capacity.tripleCapacity + 1000; // Requires simple LSB

      if (largeMessage <= capacity.simpleCapacity) {
        expect(calculator.canFitAny(1024, 768, largeMessage)).toBe(true);
        expect(calculator.canFitTriple(1024, 768, largeMessage)).toBe(false);
        expect(calculator.canFitSimple(1024, 768, largeMessage)).toBe(true);
      }
    });

    it('should provide realistic capacity estimates', () => {
      // Based on algorithm documentation examples
      const capacity = calculator.calculateCapacity(1024, 768);

      // Simple LSB should provide ~280KB capacity (from documentation: ~288KB)
      expect(capacity.simpleCapacity).toBeGreaterThan(270000); // ~270KB+
      expect(capacity.simpleCapacity).toBeLessThan(290000); // ~290KB-

      // Triple redundancy should provide ~93KB capacity (from documentation: ~96KB)
      expect(capacity.tripleCapacity).toBeGreaterThan(85000); // ~85KB+
      expect(capacity.tripleCapacity).toBeLessThan(100000); // ~100KB-
    });
  });
});
