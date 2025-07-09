import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimpleLSBEncoder } from './SimpleLSBEncoder';
import type { PixelData } from '../types/PixelData';
import type { SteganographyHeader } from '../types/SteganographyHeader';
import type { LSBConfig } from '../types/LSBConfig';
import { CapacityCalculator } from '../utils/CapacityCalculator/CapacityCalculator';

describe('SimpleLSBEncoder', () => {
  let encoder: SimpleLSBEncoder;
  let samplePixelData: PixelData;
  let sampleMessage: Uint8Array;
  let sampleHeader: SteganographyHeader;
  let config: LSBConfig;

  beforeEach(() => {
    encoder = new SimpleLSBEncoder();

    samplePixelData = {
      width: 10,
      height: 10,
      channels: {
        red: new Array(100).fill(128),
        green: new Array(100).fill(128),
        blue: new Array(100).fill(128),
      },
      totalPixels: 100,
    };

    sampleMessage = new TextEncoder().encode('Hello, World!');
    sampleHeader = {
      magicSignature: 0x4d534348,
      version: 1,
      messageLength: sampleMessage.length,
      checksum: 0x12345678,
      reserved: 0,
      encodingMethod: 'simple-lsb',
    };
    config = {
      bitsPerChannel: 1,
      channels: ['red', 'green', 'blue'],
      randomizeBits: false,
      startOffset: 0,
    };
  });

  describe('constructor', () => {
    it('should create encoder with default dependencies', () => {
      expect(encoder).toBeInstanceOf(SimpleLSBEncoder);
      expect(encoder.calculateCapacity).toBeDefined();
      expect(encoder.canEncode).toBeDefined();
      expect(encoder.encode).toBeDefined();
    });

    it('should create encoder with injected dependencies', () => {
      const customCapacityCalculator = new CapacityCalculator();
      const customEncoder = new SimpleLSBEncoder(customCapacityCalculator);
      expect(customEncoder).toBeInstanceOf(SimpleLSBEncoder);
    });
  });

  describe('calculateCapacity', () => {
    it('should calculate capacity using CapacityCalculator', () => {
      const capacity = encoder.calculateCapacity(samplePixelData.width, samplePixelData.height);
      expect(typeof capacity).toBe('number');
      expect(capacity).toBeGreaterThan(0);
    });

    it('should handle different image dimensions', () => {
      const capacity1 = encoder.calculateCapacity(20, 20);
      const capacity2 = encoder.calculateCapacity(10, 10);

      expect(capacity1).toBeGreaterThan(capacity2);
    });
  });

  describe('canEncode', () => {
    it('should return true when message fits in available capacity', () => {
      const canEncode = encoder.canEncode(samplePixelData, sampleMessage.length);
      expect(canEncode).toBe(true);
    });

    it('should return false when message exceeds available capacity', () => {
      const canEncode = encoder.canEncode(samplePixelData, 1000); // 1000 bytes
      expect(canEncode).toBe(false);
    });

    it('should handle edge case where message exactly fits capacity', () => {
      const capacity = encoder.calculateCapacity(samplePixelData.width, samplePixelData.height);
      const canEncode = encoder.canEncode(samplePixelData, capacity);
      expect(canEncode).toBe(true);
    });
  });

  describe('encode', () => {
    it('should delegate to encodeSimple method', async () => {
      const encodeSpy = vi.spyOn(encoder, 'encodeSimple');
      await encoder.encode(samplePixelData, sampleMessage, sampleHeader, config);
      expect(encodeSpy).toHaveBeenCalledWith(samplePixelData, sampleMessage, sampleHeader);
    });
  });

  describe('encodeSimple', () => {
    it('should encode message using simple LSB method', async () => {
      const result = await encoder.encodeSimple(samplePixelData, sampleMessage, sampleHeader);

      expect(result).toEqual(
        expect.objectContaining({
          width: samplePixelData.width,
          height: samplePixelData.height,
          channels: expect.objectContaining({
            red: expect.any(Array),
            green: expect.any(Array),
            blue: expect.any(Array),
          }),
        })
      );
    });

    it('should throw error when message is too large', async () => {
      const largeMessage = new Uint8Array(1000).fill(65);
      await expect(encoder.encodeSimple(samplePixelData, largeMessage, sampleHeader)).rejects.toThrow(
        'Message too large for image'
      );
    });

    it('should convert message bytes to bits correctly', async () => {
      const shortMessage = new Uint8Array([65, 66]); // 'AB'
      const result = await encoder.encodeSimple(samplePixelData, shortMessage, sampleHeader);

      // Should not throw errors and produce valid pixel data
      expect(result.channels.red).toHaveLength(100);
      expect(result.channels.green).toHaveLength(100);
      expect(result.channels.blue).toHaveLength(100);
    });

    it('should handle empty message data', async () => {
      const emptyMessage = new Uint8Array(0);
      const emptyHeader = { ...sampleHeader, messageLength: 0 };
      const result = await encoder.encodeSimple(samplePixelData, emptyMessage, emptyHeader);

      expect(result).toEqual(
        expect.objectContaining({
          width: samplePixelData.width,
          height: samplePixelData.height,
        })
      );
    });

    it('should propagate errors from utility methods', async () => {
      const invalidPixelData = {
        width: 0,
        height: 0,
        channels: {
          red: new Array(0),
          green: new Array(0),
          blue: new Array(0),
        },
        totalPixels: 0,
      };

      await expect(encoder.encodeSimple(invalidPixelData, sampleMessage, sampleHeader)).rejects.toThrow();
    });
  });
});
