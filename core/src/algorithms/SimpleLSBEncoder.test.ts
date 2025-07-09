import { describe, it, expect, beforeEach } from 'vitest';
import { SimpleLSBEncoder } from './SimpleLSBEncoder';
import { SimpleLSBDecoder } from './SimpleLSBDecoder';
import { createHeader } from '../utils/HeaderUtility/HeaderUtility';
import { createTestPixelData, createPixelDataForMessage } from '../../tests/utils/pixelDataHelpers';
import { TEST_MESSAGES, expectToThrowWithMessage } from '../../tests/utils/testHelpers';
import type { PixelData } from '../types/PixelData';
import type { LSBConfig } from '../types/LSBConfig';

describe('SimpleLSBEncoder', () => {
  let encoder: SimpleLSBEncoder;
  let decoder: SimpleLSBDecoder;

  beforeEach(() => {
    encoder = new SimpleLSBEncoder();
    decoder = new SimpleLSBDecoder();
  });

  describe('capacity calculation', () => {
    it('should calculate capacity correctly for different image sizes', () => {
      expect(encoder.calculateCapacity(10, 10)).toBe(21); // (300 bits - 128 header bits) / 8
      expect(encoder.calculateCapacity(20, 20)).toBe(134); // (1200 bits - 128 header bits) / 8
      expect(encoder.calculateCapacity(100, 100)).toBe(3734); // (30000 bits - 128 header bits) / 8
    });

    it('should handle minimum image size', () => {
      expect(encoder.calculateCapacity(1, 1)).toBe(0); // Too small for even header
    });

    it('should handle edge case dimensions', () => {
      expect(encoder.calculateCapacity(2, 2)).toBe(0); // Too small for header (12 bits < 128 bits)
    });
  });

  describe('canEncode validation', () => {
    it('should correctly validate message capacity', () => {
      const smallPixelData = createTestPixelData(10, 10);
      const largePixelData = createTestPixelData(100, 100);

      // Small message should fit in both
      expect(encoder.canEncode(smallPixelData, 5)).toBe(true);
      expect(encoder.canEncode(largePixelData, 5)).toBe(true);

      // Large message should only fit in large pixel data
      expect(encoder.canEncode(smallPixelData, 100)).toBe(false);
      expect(encoder.canEncode(largePixelData, 100)).toBe(true);
    });

    it('should handle exact capacity boundaries', () => {
      const pixelData = createTestPixelData(10, 10);
      const capacity = encoder.calculateCapacity(10, 10);

      expect(encoder.canEncode(pixelData, capacity)).toBe(true);
      expect(encoder.canEncode(pixelData, capacity + 1)).toBe(false);
    });
  });

  describe('encoding behavior', () => {
    it('should encode and allow decoding of simple messages', async () => {
      const originalMessage = TEST_MESSAGES.short;
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createTestPixelData(50, 50);

      const header = createHeader(messageData.length, 'simple-lsb', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Verify encoding produces valid pixel data
      expect(encodedPixelData.width).toBe(pixelData.width);
      expect(encodedPixelData.height).toBe(pixelData.height);
      expect(encodedPixelData.channels.red).toHaveLength(pixelData.totalPixels);
      expect(encodedPixelData.channels.green).toHaveLength(pixelData.totalPixels);
      expect(encodedPixelData.channels.blue).toHaveLength(pixelData.totalPixels);

      // Verify the encoded data can be decoded
      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(originalMessage);
    });

    it('should handle various message sizes', async () => {
      const testCases = [
        { name: 'empty', message: TEST_MESSAGES.empty },
        { name: 'single char', message: TEST_MESSAGES.single },
        { name: 'normal', message: TEST_MESSAGES.normal },
        { name: 'special chars', message: TEST_MESSAGES.special },
      ];

      for (const { message } of testCases) {
        const messageData = new TextEncoder().encode(message);
        const pixelData = createPixelDataForMessage(message.length, 'simple-lsb');

        const header = createHeader(messageData.length, 'simple-lsb', messageData);
        const encodedPixelData = await encoder.encode(pixelData, messageData, header);

        // Verify round-trip
        const extractedHeader = await decoder.extractHeader(encodedPixelData);
        const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
        const decodedMessage = new TextDecoder().decode(decodedBytes);

        expect(decodedMessage).toBe(message);
      }
    });

    it('should preserve pixel data structure during encoding', async () => {
      const originalMessage = TEST_MESSAGES.short;
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createTestPixelData(50, 50);

      const header = createHeader(messageData.length, 'simple-lsb', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Structure should be preserved
      expect(encodedPixelData.width).toBe(pixelData.width);
      expect(encodedPixelData.height).toBe(pixelData.height);
      expect(encodedPixelData.totalPixels).toBe(pixelData.totalPixels);
      expect(encodedPixelData.channels.red).toHaveLength(pixelData.totalPixels);
      expect(encodedPixelData.channels.green).toHaveLength(pixelData.totalPixels);
      expect(encodedPixelData.channels.blue).toHaveLength(pixelData.totalPixels);

      // Pixel values should be minimally modified (only LSBs changed)
      for (let i = 0; i < pixelData.totalPixels; i++) {
        const redDiff = Math.abs(encodedPixelData.channels.red[i] - pixelData.channels.red[i]);
        const greenDiff = Math.abs(encodedPixelData.channels.green[i] - pixelData.channels.green[i]);
        const blueDiff = Math.abs(encodedPixelData.channels.blue[i] - pixelData.channels.blue[i]);

        expect(redDiff).toBeLessThanOrEqual(1);
        expect(greenDiff).toBeLessThanOrEqual(1);
        expect(blueDiff).toBeLessThanOrEqual(1);
      }
    });

    it('should handle maximum capacity messages', async () => {
      const pixelData = createTestPixelData(20, 20);
      const capacity = encoder.calculateCapacity(20, 20);
      const maxMessage = 'A'.repeat(capacity);
      const messageData = new TextEncoder().encode(maxMessage);

      const header = createHeader(messageData.length, 'simple-lsb', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Should successfully encode without error
      expect(encodedPixelData).toBeDefined();

      // Should be decodable
      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(maxMessage);
    });
  });

  describe('error handling', () => {
    it('should reject messages that exceed capacity', async () => {
      const pixelData = createTestPixelData(10, 10);
      const capacity = encoder.calculateCapacity(10, 10);
      const oversizedMessage = 'A'.repeat(capacity + 1);
      const messageData = new TextEncoder().encode(oversizedMessage);

      const header = createHeader(messageData.length, 'simple-lsb', messageData);

      await expectToThrowWithMessage(
        () => encoder.encode(pixelData, messageData, header),
        'Message too large for image'
      );
    });

    it('should handle invalid pixel data gracefully', async () => {
      const invalidPixelData: PixelData = {
        width: 0,
        height: 0,
        channels: {
          red: [],
          green: [],
          blue: [],
        },
        totalPixels: 0,
      };

      const messageData = new TextEncoder().encode('test');
      const header = createHeader(4, 'simple-lsb', messageData);

      await expectToThrowWithMessage(
        () => encoder.encode(invalidPixelData, messageData, header),
        'Image dimensions must be positive'
      );
    });

    it('should validate header consistency', () => {
      const message = TEST_MESSAGES.short;
      const messageData = new TextEncoder().encode(message);

      // Create header with wrong length - should fail during header creation
      expect(() => createHeader(message.length + 5, 'simple-lsb', messageData)).toThrow(
        'Message data length does not match specified length'
      );
    });
  });

  describe('configuration support', () => {
    it('should use default configuration when none provided', async () => {
      const message = TEST_MESSAGES.short;
      const messageData = new TextEncoder().encode(message);
      const pixelData = createTestPixelData(50, 50);

      const header = createHeader(messageData.length, 'simple-lsb', messageData);

      // Should work without explicit config
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);
      expect(encodedPixelData).toBeDefined();
    });

    it('should accept custom LSB configuration', async () => {
      const message = TEST_MESSAGES.short;
      const messageData = new TextEncoder().encode(message);
      const pixelData = createTestPixelData(50, 50);
      const config: LSBConfig = {
        bitsPerChannel: 1,
        channels: ['red', 'green', 'blue'],
        randomizeBits: false,
        startOffset: 0,
      };

      const header = createHeader(messageData.length, 'simple-lsb', messageData);

      // Should work with explicit config
      const encodedPixelData = await encoder.encode(pixelData, messageData, header, config);
      expect(encodedPixelData).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty message', async () => {
      const messageData = new Uint8Array(0);
      const pixelData = createTestPixelData(50, 50);

      const header = createHeader(0, 'simple-lsb', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Should successfully encode header even with empty message
      expect(encodedPixelData).toBeDefined();

      // Should be decodable
      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      expect(extractedHeader.messageLength).toBe(0);

      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
      expect(decodedBytes).toHaveLength(0);
    });

    it('should handle single byte messages', async () => {
      const messageData = new Uint8Array([65]); // 'A'
      const pixelData = createTestPixelData(50, 50);

      const header = createHeader(1, 'simple-lsb', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe('A');
    });

    it('should handle Unicode characters correctly', async () => {
      const originalMessage = TEST_MESSAGES.unicode;
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createPixelDataForMessage(originalMessage.length, 'simple-lsb');

      const header = createHeader(messageData.length, 'simple-lsb', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(originalMessage);
    });
  });
});
