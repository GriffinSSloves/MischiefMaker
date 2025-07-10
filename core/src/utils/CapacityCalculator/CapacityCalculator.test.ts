import { describe, it, expect } from 'vitest';
import { CapacityCalculator } from './CapacityCalculator';
import type { PixelData } from '../../types/PixelData';

describe('CapacityCalculator', () => {
  const calculator = new CapacityCalculator();

  describe('calculateCapacity', () => {
    it('should calculate capacity for standard image dimensions', () => {
      // 1024x768 image
      const capacity = calculator.calculateCapacity(1024, 768);

      expect(capacity.totalPixels).toBe(786432);
      expect(capacity.availableBits).toBe(2359296); // 786432 * 3 channels
      expect(capacity.capacity).toBeGreaterThan(290000); // Simple LSB capacity
      expect(capacity.capacity).toBeLessThan(300000);
      expect(capacity.headerSize).toBe(16);
    });

    it('should calculate capacity with redundancy factor', () => {
      // Test with triple redundancy (factor 3)
      const simpleCapacity = calculator.calculateCapacity(1024, 768, 1);
      const tripleCapacity = calculator.calculateCapacity(1024, 768, 3);

      expect(simpleCapacity.capacity).toBeGreaterThan(0);
      expect(tripleCapacity.capacity).toBeGreaterThan(0);
      expect(tripleCapacity.capacity).toBeLessThan(simpleCapacity.capacity);

      // Triple redundancy should be approximately 1/3 of simple capacity
      const ratio = tripleCapacity.capacity / simpleCapacity.capacity;
      expect(ratio).toBeGreaterThan(0.25);
      expect(ratio).toBeLessThan(0.4);
    });

    it('should handle small images', () => {
      const capacity = calculator.calculateCapacity(100, 100);

      expect(capacity.totalPixels).toBe(10000);
      expect(capacity.availableBits).toBe(30000);
      expect(capacity.capacity).toBeGreaterThan(0);
    });

    it('should handle large images', () => {
      const capacity = calculator.calculateCapacity(4000, 3000);

      expect(capacity.totalPixels).toBe(12000000);
      expect(capacity.availableBits).toBe(36000000);
      expect(capacity.capacity).toBeGreaterThan(4000000); // Over 4MB
    });

    it('should return correct data structure', () => {
      const capacity = calculator.calculateCapacity(500, 500);

      expect(capacity).toHaveProperty('totalPixels');
      expect(capacity).toHaveProperty('availableBits');
      expect(capacity).toHaveProperty('capacity');
      expect(capacity).toHaveProperty('headerSize');

      expect(typeof capacity.totalPixels).toBe('number');
      expect(typeof capacity.availableBits).toBe('number');
      expect(typeof capacity.capacity).toBe('number');
      expect(typeof capacity.headerSize).toBe('number');
    });

    it('should throw error for invalid dimensions', () => {
      expect(() => calculator.calculateCapacity(0, 100)).toThrow('Image dimensions must be positive');
      expect(() => calculator.calculateCapacity(100, 0)).toThrow('Image dimensions must be positive');
      expect(() => calculator.calculateCapacity(-100, 100)).toThrow('Image dimensions must be positive');
      expect(() => calculator.calculateCapacity(100, -100)).toThrow('Image dimensions must be positive');
    });

    it('should throw error for invalid redundancy factor', () => {
      expect(() => calculator.calculateCapacity(100, 100, 0)).toThrow('Redundancy factor must be positive');
      expect(() => calculator.calculateCapacity(100, 100, -1)).toThrow('Redundancy factor must be positive');
    });

    it('should handle edge cases gracefully', () => {
      // Very small image that might not fit header
      const capacity = calculator.calculateCapacity(1, 1);
      expect(capacity.capacity).toBeGreaterThanOrEqual(0);
    });

    it('should handle various redundancy factors', () => {
      const width = 500;
      const height = 500;

      const factor1 = calculator.calculateCapacity(width, height, 1);
      const factor2 = calculator.calculateCapacity(width, height, 2);
      const factor5 = calculator.calculateCapacity(width, height, 5);

      expect(factor1.capacity).toBeGreaterThan(factor2.capacity);
      expect(factor2.capacity).toBeGreaterThan(factor5.capacity);
    });

    it('should maintain mathematical relationships', () => {
      const capacity = calculator.calculateCapacity(1024, 768);

      expect(capacity.availableBits).toBe(capacity.totalPixels * 3);
      expect(capacity.capacity).toBeGreaterThan(0);
    });

    it('should handle equivalent pixel counts consistently', () => {
      // Same pixel count, different dimensions
      const square = calculator.calculateCapacity(100, 100);
      const wide = calculator.calculateCapacity(200, 50);
      const tall = calculator.calculateCapacity(50, 200);

      expect(square.capacity).toBe(wide.capacity);
      expect(square.capacity).toBe(tall.capacity);
    });
  });

  describe('calculateFromPixelData', () => {
    it('should calculate capacity from pixel data', () => {
      const pixelData: PixelData = {
        width: 50,
        height: 20,
        channels: {
          red: Array.from(new Uint8ClampedArray(1000)),
          green: Array.from(new Uint8ClampedArray(1000)),
          blue: Array.from(new Uint8ClampedArray(1000)),
        },
        totalPixels: 1000,
      };

      const capacity = calculator.calculateFromPixelData(pixelData);
      const directCapacity = calculator.calculateCapacity(50, 20);

      expect(capacity).toEqual(directCapacity);
    });

    it('should handle pixel data with redundancy factor', () => {
      const pixelData: PixelData = {
        width: 50,
        height: 20,
        channels: {
          red: Array.from(new Uint8ClampedArray(1000)),
          green: Array.from(new Uint8ClampedArray(1000)),
          blue: Array.from(new Uint8ClampedArray(1000)),
        },
        totalPixels: 1000,
      };

      const simpleCapacity = calculator.calculateFromPixelData(pixelData, 1);
      const tripleCapacity = calculator.calculateFromPixelData(pixelData, 3);

      expect(tripleCapacity.capacity).toBeLessThan(simpleCapacity.capacity);
    });
  });
});
