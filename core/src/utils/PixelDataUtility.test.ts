import { describe, it, expect } from 'vitest';
import { PixelDataUtility } from './PixelDataUtility';
import type { PixelData } from '../types/DataTypes';

describe('PixelDataUtility', () => {
  // Test data - 2x2 image
  const width = 2;
  const height = 2;
  const red = new Uint8Array([255, 128, 64, 0]); // Top-left, top-right, bottom-left, bottom-right
  const green = new Uint8Array([0, 64, 128, 255]);
  const blue = new Uint8Array([128, 255, 0, 64]);

  const samplePixelData: PixelData = {
    width,
    height,
    channels: {
      red: Array.from(red),
      green: Array.from(green),
      blue: Array.from(blue),
    },
    totalPixels: 4,
  };

  describe('pixel data extraction', () => {
    it('should extract pixel data from channel arrays', () => {
      const result = PixelDataUtility.extractPixelData(red, green, blue, width, height);

      expect(result.width).toBe(width);
      expect(result.height).toBe(height);
      expect(result.totalPixels).toBe(4);
      expect(result.channels.red).toEqual(Array.from(red));
      expect(result.channels.green).toEqual(Array.from(green));
      expect(result.channels.blue).toEqual(Array.from(blue));
    });

    it('should throw error for mismatched channel lengths', () => {
      const shortRed = new Uint8Array([255, 128]);
      expect(() => PixelDataUtility.extractPixelData(shortRed, green, blue, width, height)).toThrow(
        'Channel arrays must match image dimensions'
      );
    });

    it('should extract from RGBA data correctly', () => {
      const rgba = new Uint8Array([
        255,
        0,
        128,
        255, // Pixel 1: R=255, G=0, B=128, A=255
        128,
        64,
        255,
        255, // Pixel 2: R=128, G=64, B=255, A=255
        64,
        128,
        0,
        255, // Pixel 3: R=64, G=128, B=0, A=255
        0,
        255,
        64,
        255, // Pixel 4: R=0, G=255, B=64, A=255
      ]);

      const result = PixelDataUtility.extractFromRGBA(rgba, width, height, true);

      expect(result.channels.red).toEqual([255, 128, 64, 0]);
      expect(result.channels.green).toEqual([0, 64, 128, 255]);
      expect(result.channels.blue).toEqual([128, 255, 0, 64]);
    });

    it('should extract from RGB data (no alpha) correctly', () => {
      const rgb = new Uint8Array([
        255,
        0,
        128, // Pixel 1
        128,
        64,
        255, // Pixel 2
        64,
        128,
        0, // Pixel 3
        0,
        255,
        64, // Pixel 4
      ]);

      const result = PixelDataUtility.extractFromRGBA(rgb, width, height, false);

      expect(result.channels.red).toEqual([255, 128, 64, 0]);
      expect(result.channels.green).toEqual([0, 64, 128, 255]);
      expect(result.channels.blue).toEqual([128, 255, 0, 64]);
    });

    it('should throw error for RGBA size mismatch', () => {
      const shortRgba = new Uint8Array([255, 0, 128, 255]); // Only 1 pixel
      expect(() => PixelDataUtility.extractFromRGBA(shortRgba, width, height, true)).toThrow('RGBA data size mismatch');
    });
  });

  describe('pixel data conversion', () => {
    it('should convert to RGBA with alpha', () => {
      const rgba = PixelDataUtility.toRGBA(samplePixelData, true, 200);

      expect(rgba.length).toBe(16); // 4 pixels * 4 channels
      expect(rgba[0]).toBe(255); // First pixel red
      expect(rgba[1]).toBe(0); // First pixel green
      expect(rgba[2]).toBe(128); // First pixel blue
      expect(rgba[3]).toBe(200); // First pixel alpha
    });

    it('should convert to RGB without alpha', () => {
      const rgb = PixelDataUtility.toRGBA(samplePixelData, false);

      expect(rgb.length).toBe(12); // 4 pixels * 3 channels
      expect(rgb[0]).toBe(255); // First pixel red
      expect(rgb[1]).toBe(0); // First pixel green
      expect(rgb[2]).toBe(128); // First pixel blue
      // No alpha channel
    });

    it('should convert to channel arrays', () => {
      const { red: redArray, green: greenArray, blue: blueArray } = PixelDataUtility.toChannelArrays(samplePixelData);

      expect(redArray).toBeInstanceOf(Uint8Array);
      expect(Array.from(redArray)).toEqual(samplePixelData.channels.red);
      expect(Array.from(greenArray)).toEqual(samplePixelData.channels.green);
      expect(Array.from(blueArray)).toEqual(samplePixelData.channels.blue);
    });
  });

  describe('bit embedding and extraction', () => {
    it('should embed and extract bits correctly', () => {
      const bits = [1, 0, 1, 1, 0, 0, 1, 0]; // 8 bits
      const embedded = PixelDataUtility.embedBits(samplePixelData, bits);
      const extracted = PixelDataUtility.extractBits(embedded, bits.length);

      expect(extracted).toEqual(bits);
    });

    it('should handle different channel orders', () => {
      const bits = [1, 0, 1];
      const channelOrder: ('red' | 'green' | 'blue')[] = ['blue', 'red', 'green'];

      const embedded = PixelDataUtility.embedBits(samplePixelData, bits, 0, channelOrder);
      const extracted = PixelDataUtility.extractBits(embedded, bits.length, 0, channelOrder);

      expect(extracted).toEqual(bits);
    });

    it('should throw error when insufficient capacity for embedding', () => {
      const tooManyBits = new Array(50).fill(1); // More bits than can fit in 2x2 image
      expect(() => PixelDataUtility.embedBits(samplePixelData, tooManyBits)).toThrow('Insufficient pixel capacity');
    });

    it('should throw error when insufficient data for extraction', () => {
      expect(() => PixelDataUtility.extractBits(samplePixelData, 50)).toThrow('Insufficient pixel data');
    });

    it('should handle starting from different pixel indices', () => {
      const bits = [1, 0, 1];
      const startPixel = 1;

      const embedded = PixelDataUtility.embedBits(samplePixelData, bits, startPixel);
      const extracted = PixelDataUtility.extractBits(embedded, bits.length, startPixel);

      expect(extracted).toEqual(bits);
    });
  });

  describe('redundancy encoding and decoding', () => {
    it('should embed and extract bits with triple redundancy', () => {
      const bits = [1, 0, 1, 0];
      const embedded = PixelDataUtility.embedBitsWithRedundancy(samplePixelData, bits, 3);
      const extracted = PixelDataUtility.extractBitsWithRedundancy(embedded, bits.length, 3);

      expect(extracted).toEqual(bits);
    });

    it('should handle error correction with majority voting', () => {
      const bits = [1, 0];
      const redundancyFactor = 3;

      // Manually create corrupted redundant data
      const redundantBits = [1, 1, 0, 0, 1, 0]; // First bit: 1,1,0 -> majority 1; Second bit: 0,1,0 -> majority 0
      const embedded = PixelDataUtility.embedBits(samplePixelData, redundantBits);
      const extracted = PixelDataUtility.extractBitsWithRedundancy(embedded, bits.length, redundancyFactor);

      expect(extracted).toEqual(bits);
    });

    it('should use custom redundancy factor', () => {
      const bits = [1, 0];
      const redundancyFactor = 5;

      const embedded = PixelDataUtility.embedBitsWithRedundancy(samplePixelData, bits, redundancyFactor);
      const extracted = PixelDataUtility.extractBitsWithRedundancy(embedded, bits.length, redundancyFactor);

      expect(extracted).toEqual(bits);
    });
  });

  describe('capacity calculations', () => {
    it('should calculate pixels needed correctly', () => {
      const bitCount = 10;
      const channelsUsed = 3;
      const bitsPerChannel = 1;

      const pixelsNeeded = PixelDataUtility.calculatePixelsNeeded(bitCount, channelsUsed, bitsPerChannel);
      expect(pixelsNeeded).toBe(4); // ceil(10 / (3 * 1)) = ceil(3.33) = 4
    });

    it('should calculate maximum bits correctly', () => {
      const maxBits = PixelDataUtility.calculateMaxBits(samplePixelData, 3, 1, 0);
      expect(maxBits).toBe(12); // 4 pixels * 3 channels * 1 bit = 12
    });

    it('should account for reserved pixels', () => {
      const maxBits = PixelDataUtility.calculateMaxBits(samplePixelData, 3, 1, 1);
      expect(maxBits).toBe(9); // (4 - 1) pixels * 3 channels * 1 bit = 9
    });

    it('should validate capacity correctly', () => {
      const validation1 = PixelDataUtility.validateCapacity(samplePixelData, 10, 3, 1, 0);
      expect(validation1.canFit).toBe(true);
      expect(validation1.maxBits).toBe(12);
      expect(validation1.pixelsNeeded).toBe(4);

      const validation2 = PixelDataUtility.validateCapacity(samplePixelData, 15, 3, 1, 0);
      expect(validation2.canFit).toBe(false);
      expect(validation2.maxBits).toBe(12);
      expect(validation2.pixelsNeeded).toBe(5);
    });
  });

  describe('pixel data manipulation', () => {
    it('should clone pixel data correctly', () => {
      const cloned = PixelDataUtility.clonePixelData(samplePixelData);

      expect(PixelDataUtility.pixelDataEqual(samplePixelData, cloned)).toBe(true);
      expect(cloned.channels.red).not.toBe(samplePixelData.channels.red); // Different references
    });

    it('should compare pixel data correctly', () => {
      const cloned = PixelDataUtility.clonePixelData(samplePixelData);
      expect(PixelDataUtility.pixelDataEqual(samplePixelData, cloned)).toBe(true);

      cloned.channels.red[0] = 100; // Modify clone
      expect(PixelDataUtility.pixelDataEqual(samplePixelData, cloned)).toBe(false);
    });

    it('should detect dimension differences', () => {
      const different = { ...samplePixelData, width: 3 };
      expect(PixelDataUtility.pixelDataEqual(samplePixelData, different)).toBe(false);
    });

    it('should get pixel at coordinates', () => {
      const pixel = PixelDataUtility.getPixel(samplePixelData, 1, 0); // Top-right
      expect(pixel.red).toBe(128);
      expect(pixel.green).toBe(64);
      expect(pixel.blue).toBe(255);
    });

    it('should throw error for out of bounds coordinates', () => {
      expect(() => PixelDataUtility.getPixel(samplePixelData, 2, 0)).toThrow('Pixel coordinates out of bounds');
      expect(() => PixelDataUtility.getPixel(samplePixelData, 0, 2)).toThrow('Pixel coordinates out of bounds');
    });

    it('should set pixel at coordinates', () => {
      const modified = PixelDataUtility.clonePixelData(samplePixelData);
      PixelDataUtility.setPixel(modified, 1, 1, { red: 100, green: 150, blue: 200 });

      const pixel = PixelDataUtility.getPixel(modified, 1, 1);
      expect(pixel.red).toBe(100);
      expect(pixel.green).toBe(150);
      expect(pixel.blue).toBe(200);
    });

    it('should clamp pixel values to valid range', () => {
      const modified = PixelDataUtility.clonePixelData(samplePixelData);
      PixelDataUtility.setPixel(modified, 0, 0, { red: -10, green: 300, blue: 127.7 });

      const pixel = PixelDataUtility.getPixel(modified, 0, 0);
      expect(pixel.red).toBe(0); // Clamped from -10
      expect(pixel.green).toBe(255); // Clamped from 300
      expect(pixel.blue).toBe(128); // Rounded from 127.7
    });
  });

  describe('difference map and statistics', () => {
    it('should create difference map correctly', () => {
      const modified = PixelDataUtility.clonePixelData(samplePixelData);
      modified.channels.red[0] = 254; // Change by 1

      const diffMap = PixelDataUtility.createDifferenceMap(samplePixelData, modified);

      expect(diffMap.channels.red[0]).toBe(50); // 1 * 50 amplification
      expect(diffMap.channels.green[0]).toBe(0); // No change
      expect(diffMap.channels.blue[0]).toBe(0); // No change
    });

    it('should throw error for mismatched dimensions in difference map', () => {
      const different = { ...samplePixelData, width: 3 };
      expect(() => PixelDataUtility.createDifferenceMap(samplePixelData, different)).toThrow(
        'Pixel data dimensions must match'
      );
    });

    it('should calculate statistics correctly', () => {
      const stats = PixelDataUtility.calculateStatistics(samplePixelData);

      expect(stats.red.min).toBe(0);
      expect(stats.red.max).toBe(255);
      expect(stats.red.mean).toBe(111.75); // (255 + 128 + 64 + 0) / 4

      expect(stats.green.min).toBe(0);
      expect(stats.green.max).toBe(255);

      expect(stats.blue.min).toBe(0);
      expect(stats.blue.max).toBe(255);
    });
  });

  describe('validation', () => {
    it('should validate correct pixel data', () => {
      const validation = PixelDataUtility.validatePixelData(samplePixelData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid dimensions', () => {
      const invalid = { ...samplePixelData, width: 0 };
      const validation = PixelDataUtility.validatePixelData(invalid);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid dimensions'))).toBe(true);
    });

    it('should detect total pixels mismatch', () => {
      const invalid = { ...samplePixelData, totalPixels: 5 };
      const validation = PixelDataUtility.validatePixelData(invalid);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Total pixels mismatch'))).toBe(true);
    });

    it('should detect channel length mismatch', () => {
      const invalid = {
        ...samplePixelData,
        channels: {
          ...samplePixelData.channels,
          red: [255, 128], // Wrong length
        },
      };
      const validation = PixelDataUtility.validatePixelData(invalid);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Red channel length mismatch'))).toBe(true);
    });

    it('should detect invalid channel values', () => {
      const invalid = {
        ...samplePixelData,
        channels: {
          ...samplePixelData.channels,
          green: [0, 64, 256, 255], // 256 is out of range
        },
      };
      const validation = PixelDataUtility.validatePixelData(invalid);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid green channel value'))).toBe(true);
    });

    it('should detect non-integer values', () => {
      const invalid = {
        ...samplePixelData,
        channels: {
          ...samplePixelData.channels,
          blue: [128, 255.5, 0, 64], // Non-integer
        },
      };
      const validation = PixelDataUtility.validatePixelData(invalid);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid blue channel value'))).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle 1x1 pixel data', () => {
      const tiny: PixelData = {
        width: 1,
        height: 1,
        channels: { red: [128], green: [64], blue: [192] },
        totalPixels: 1,
      };

      const validation = PixelDataUtility.validatePixelData(tiny);
      expect(validation.isValid).toBe(true);

      const maxBits = PixelDataUtility.calculateMaxBits(tiny);
      expect(maxBits).toBe(3); // 1 pixel * 3 channels * 1 bit
    });

    it('should handle large pixel data dimensions', () => {
      const large = PixelDataUtility.extractPixelData(
        new Uint8Array(1000000).fill(128),
        new Uint8Array(1000000).fill(64),
        new Uint8Array(1000000).fill(192),
        1000,
        1000
      );

      expect(large.totalPixels).toBe(1000000);
      expect(PixelDataUtility.calculateMaxBits(large)).toBe(3000000);
    });

    it('should handle empty bit arrays', () => {
      const embedded = PixelDataUtility.embedBits(samplePixelData, []);
      expect(PixelDataUtility.pixelDataEqual(samplePixelData, embedded)).toBe(true);

      const extracted = PixelDataUtility.extractBits(samplePixelData, 0);
      expect(extracted).toEqual([]);
    });
  });
});
