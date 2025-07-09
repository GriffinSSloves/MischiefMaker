import { describe, it, expect, beforeEach } from 'vitest';
import { TripleRedundancyEncoder } from './TripleRedundancyEncoder';
import { TripleRedundancyDecoder } from './TripleRedundancyDecoder';
import { createHeader } from '../utils/HeaderUtility/HeaderUtility';
import { createTestPixelData, createPixelDataForMessage } from '../../tests/utils/pixelDataHelpers';
import { TEST_MESSAGES, expectToThrowWithMessage } from '../../tests/utils/testHelpers';
import type { PixelData } from '../types/PixelData';

describe('TripleRedundancyEncoder', () => {
  let encoder: TripleRedundancyEncoder;
  let decoder: TripleRedundancyDecoder;

  beforeEach(() => {
    encoder = new TripleRedundancyEncoder();
    decoder = new TripleRedundancyDecoder();
  });

  describe('capacity calculation', () => {
    it('should calculate triple redundancy capacity correctly', () => {
      // Triple redundancy needs 3x the bits, so capacity is 1/3 of simple LSB
      expect(encoder.calculateCapacity(20, 20)).toBe(34); // (1200 bits / 3 - 128 header bits) / 8
      expect(encoder.calculateCapacity(50, 50)).toBe(296); // (7500 bits / 3 - 128 header bits) / 8
      expect(encoder.calculateCapacity(100, 100)).toBe(1234); // (30000 bits / 3 - 128 header bits) / 8
    });

    it('should handle minimum image size for triple redundancy', () => {
      expect(encoder.calculateCapacity(2, 2)).toBe(0); // Too small for header with triple redundancy
      expect(encoder.calculateCapacity(5, 5)).toBe(0); // Still too small for header (75 bits / 3 = 25 bits < 128 bits)
    });

    it('should provide significantly less capacity than simple LSB', () => {
      const tripleCapacity = encoder.calculateCapacity(50, 50);
      const simpleLSBCapacity = Math.floor((50 * 50 * 3) / 8) - 15; // Approximate simple LSB capacity

      expect(tripleCapacity).toBeLessThan(simpleLSBCapacity / 2);
    });
  });

  describe('canEncode validation', () => {
    it('should correctly validate triple redundancy capacity', () => {
      const pixelData = createTestPixelData(50, 50);
      const capacity = encoder.calculateCapacity(50, 50);

      expect(encoder.canEncode(pixelData, capacity)).toBe(true);
      expect(encoder.canEncode(pixelData, capacity + 1)).toBe(false);
    });

    it('should be more restrictive than simple LSB', () => {
      const pixelData = createTestPixelData(20, 20);

      // Message that might fit in simple LSB but not triple redundancy
      const mediumMessage = 'A'.repeat(80);
      expect(encoder.canEncode(pixelData, mediumMessage.length)).toBe(false);
    });
  });

  describe('encoding behavior', () => {
    it('should encode and decode with triple redundancy', async () => {
      const originalMessage = TEST_MESSAGES.short;
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createPixelDataForMessage(originalMessage.length, 'triple-redundancy');

      const header = createHeader(messageData.length, 'triple-redundancy', messageData);
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

    it('should handle various message types with triple redundancy', async () => {
      const testCases = [
        { message: TEST_MESSAGES.empty },
        { message: TEST_MESSAGES.single },
        { message: TEST_MESSAGES.normal },
        { message: TEST_MESSAGES.special },
      ];

      for (const { message } of testCases) {
        const messageData = new TextEncoder().encode(message);
        const pixelData = createPixelDataForMessage(message.length, 'triple-redundancy');

        const header = createHeader(messageData.length, 'triple-redundancy', messageData);
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
      const pixelData = createTestPixelData(100, 100);

      const header = createHeader(messageData.length, 'triple-redundancy', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Structure should be preserved
      expect(encodedPixelData.width).toBe(pixelData.width);
      expect(encodedPixelData.height).toBe(pixelData.height);
      expect(encodedPixelData.totalPixels).toBe(pixelData.totalPixels);

      // Pixel values should be minimally modified (only LSBs changed)
      for (let i = 0; i < Math.min(1000, pixelData.totalPixels); i++) {
        const redDiff = Math.abs(encodedPixelData.channels.red[i] - pixelData.channels.red[i]);
        const greenDiff = Math.abs(encodedPixelData.channels.green[i] - pixelData.channels.green[i]);
        const blueDiff = Math.abs(encodedPixelData.channels.blue[i] - pixelData.channels.blue[i]);

        expect(redDiff).toBeLessThanOrEqual(1);
        expect(greenDiff).toBeLessThanOrEqual(1);
        expect(blueDiff).toBeLessThanOrEqual(1);
      }
    });

    it('should handle maximum capacity messages', async () => {
      const pixelData = createTestPixelData(50, 50);
      const capacity = encoder.calculateCapacity(50, 50);
      const maxMessage = 'A'.repeat(capacity);
      const messageData = new TextEncoder().encode(maxMessage);

      const header = createHeader(messageData.length, 'triple-redundancy', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Should successfully encode without error
      expect(encodedPixelData).toBeDefined();

      // Should be decodable
      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(maxMessage);
    });

    it('should set correct encoding method in header', async () => {
      const originalMessage = TEST_MESSAGES.short;
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createPixelDataForMessage(originalMessage.length, 'triple-redundancy');

      const header = createHeader(messageData.length, 'triple-redundancy', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      expect(extractedHeader.encodingMethod).toBe('triple-redundancy');
    });
  });

  describe('error handling', () => {
    it('should reject messages that exceed triple redundancy capacity', async () => {
      const pixelData = createTestPixelData(20, 20);
      const capacity = encoder.calculateCapacity(20, 20);
      const oversizedMessage = 'A'.repeat(capacity + 1);
      const messageData = new TextEncoder().encode(oversizedMessage);

      const header = createHeader(messageData.length, 'triple-redundancy', messageData);

      await expectToThrowWithMessage(() => encoder.encode(pixelData, messageData, header), 'Message too large');
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
      const header = createHeader(4, 'triple-redundancy', messageData);

      await expectToThrowWithMessage(
        () => encoder.encode(invalidPixelData, messageData, header),
        'Image dimensions must be positive'
      );
    });

    it('should validate header consistency', () => {
      const message = TEST_MESSAGES.short;
      const messageData = new TextEncoder().encode(message);

      // Create header with wrong length - should fail during header creation
      expect(() => createHeader(message.length + 5, 'triple-redundancy', messageData)).toThrow(
        'Message data length does not match specified length'
      );
    });
  });

  describe('redundancy factor', () => {
    it('should support custom redundancy factors', async () => {
      const originalMessage = TEST_MESSAGES.short;
      const messageData = new TextEncoder().encode(originalMessage);
      // Use much larger pixel data to accommodate higher redundancy factors
      const pixelData = createTestPixelData(150, 150);

      const header = createHeader(messageData.length, 'triple-redundancy', messageData);

      // Test with different redundancy factors
      const result3 = await encoder.encodeWithRedundancy(pixelData, messageData, header, 3);
      const result5 = await encoder.encodeWithRedundancy(pixelData, messageData, header, 5);

      expect(result3).toBeDefined();
      expect(result5).toBeDefined();
    });

    it('should default to triple redundancy', async () => {
      const originalMessage = TEST_MESSAGES.short;
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createPixelDataForMessage(originalMessage.length, 'triple-redundancy');

      const header = createHeader(messageData.length, 'triple-redundancy', messageData);

      // Default encode should be equivalent to redundancy factor 3
      const defaultResult = await encoder.encode(pixelData, messageData, header);
      const explicitResult = await encoder.encodeWithRedundancy(pixelData, messageData, header, 3);

      // Both should produce valid encodings (we can't expect identical results due to potential randomization)
      expect(defaultResult).toBeDefined();
      expect(explicitResult).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty message with triple redundancy', async () => {
      const messageData = new Uint8Array(0);
      const pixelData = createTestPixelData(100, 100);

      const header = createHeader(0, 'triple-redundancy', messageData);
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
      const pixelData = createTestPixelData(100, 100);

      const header = createHeader(1, 'triple-redundancy', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe('A');
    });

    it('should handle minimum viable image size', async () => {
      const messageData = new Uint8Array([65]); // 'A'
      const pixelData = createTestPixelData(10, 10); // Very small image

      const header = createHeader(1, 'triple-redundancy', messageData);

      // Should either encode successfully or fail gracefully
      if (encoder.canEncode(pixelData, 1)) {
        const encodedPixelData = await encoder.encode(pixelData, messageData, header);
        expect(encodedPixelData).toBeDefined();
      } else {
        await expectToThrowWithMessage(() => encoder.encode(pixelData, messageData, header), 'Message too large');
      }
    });
  });
});
