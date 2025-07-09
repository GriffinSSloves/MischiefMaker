import { describe, it, expect, beforeEach } from 'vitest';
import { TripleRedundancyDecoder } from './TripleRedundancyDecoder';
import { TripleRedundancyEncoder } from './TripleRedundancyEncoder';
import { createHeader } from '../utils/HeaderUtility/HeaderUtility';
import {
  createTestPixelData,
  createPixelDataForMessage,
  corruptPixelDataLSBs,
  corruptPixelDataSparse,
} from '../../tests/utils/pixelDataHelpers';
import { TEST_MESSAGES, expectToThrowWithMessage, createCorruptedHeader } from '../../tests/utils/testHelpers';

describe('TripleRedundancyDecoder', () => {
  let decoder: TripleRedundancyDecoder;
  let encoder: TripleRedundancyEncoder;

  beforeEach(() => {
    decoder = new TripleRedundancyDecoder();
    encoder = new TripleRedundancyEncoder();
  });

  describe('header extraction', () => {
    it('should extract valid header from encoded pixel data', async () => {
      const originalMessage = TEST_MESSAGES.short;
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createPixelDataForMessage(originalMessage.length, 'triple-redundancy');

      // Use encoder to create valid encoded pixel data
      const header = createHeader(messageData.length, 'triple-redundancy', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Test the decoder's header extraction
      const extractedHeader = await decoder.extractHeader(encodedPixelData);

      expect(extractedHeader.magicSignature).toBe(0x4d534348);
      expect(extractedHeader.encodingMethod).toBe('triple-redundancy');
      expect(extractedHeader.messageLength).toBe(originalMessage.length);
      expect(extractedHeader.version).toBe(1);
      expect(extractedHeader.reserved).toBe(0);
    });

    it('should extract header from various message sizes', async () => {
      const testCases = [
        { message: TEST_MESSAGES.single },
        { message: TEST_MESSAGES.normal },
        { message: TEST_MESSAGES.special },
      ];

      for (const { message } of testCases) {
        const messageData = new TextEncoder().encode(message);
        const pixelData = createPixelDataForMessage(message.length, 'triple-redundancy');

        const header = createHeader(messageData.length, 'triple-redundancy', messageData);
        const encodedPixelData = await encoder.encode(pixelData, messageData, header);

        const extractedHeader = await decoder.extractHeader(encodedPixelData);

        expect(extractedHeader.magicSignature).toBe(0x4d534348);
        expect(extractedHeader.encodingMethod).toBe('triple-redundancy');
        expect(extractedHeader.messageLength).toBe(message.length);
      }
    });

    it('should handle corrupted header data with redundancy', async () => {
      const originalMessage = TEST_MESSAGES.short;
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createPixelDataForMessage(originalMessage.length, 'triple-redundancy');

      const header = createHeader(messageData.length, 'triple-redundancy', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Corrupt some bits sparsely (minor corruption should be recoverable)
      const corruptedPixelData = corruptPixelDataSparse(encodedPixelData, 15);

      // Should still be able to extract header due to triple redundancy
      const extractedHeader = await decoder.extractHeader(corruptedPixelData);
      expect(extractedHeader.magicSignature).toBe(0x4d534348);
      expect(extractedHeader.encodingMethod).toBe('triple-redundancy');
    });
  });

  describe('decoding behavior', () => {
    it('should decode simple messages with triple redundancy', async () => {
      const originalMessage = TEST_MESSAGES.short;
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createPixelDataForMessage(originalMessage.length, 'triple-redundancy');

      const header = createHeader(originalMessage.length, 'triple-redundancy', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Decode the message
      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(originalMessage);
    });

    it('should decode various message types', async () => {
      const testCases = [
        { message: TEST_MESSAGES.empty },
        { message: TEST_MESSAGES.single },
        { message: TEST_MESSAGES.normal },
        { message: TEST_MESSAGES.special },
        { message: TEST_MESSAGES.unicode },
      ];

      for (const { message } of testCases) {
        const messageData = new TextEncoder().encode(message);
        const pixelData = createPixelDataForMessage(message.length, 'triple-redundancy');

        const header = createHeader(messageData.length, 'triple-redundancy', messageData);
        const encodedPixelData = await encoder.encode(pixelData, messageData, header);

        const extractedHeader = await decoder.extractHeader(encodedPixelData);
        const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
        const decodedMessage = new TextDecoder().decode(decodedBytes);

        expect(decodedMessage).toBe(message);
      }
    });

    it('should handle maximum capacity messages', async () => {
      const pixelData = createTestPixelData(50, 50);
      const capacity = encoder.calculateCapacity(50, 50);
      const maxMessage = 'A'.repeat(capacity);
      const messageData = new TextEncoder().encode(maxMessage);

      const header = createHeader(messageData.length, 'triple-redundancy', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(maxMessage);
    });

    it('should validate message consistency', async () => {
      const originalMessage = TEST_MESSAGES.normal;
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createPixelDataForMessage(originalMessage.length, 'triple-redundancy');

      const header = createHeader(originalMessage.length, 'triple-redundancy', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);

      // Message should be exactly the same length as expected
      expect(decodedBytes.length).toBe(originalMessage.length);

      // Checksum should match
      const decodedMessage = new TextDecoder().decode(decodedBytes);
      expect(decodedMessage).toBe(originalMessage);
    });
  });

  describe('error handling', () => {
    it('should reject invalid encoding method', async () => {
      const pixelData = createTestPixelData(50, 50);
      const messageData = new TextEncoder().encode('test');
      const header = createHeader(messageData.length, 'simple-lsb', messageData);

      await expectToThrowWithMessage(
        () => decoder.decode(pixelData, header),
        'Invalid encoding method for TripleRedundancyDecoder: simple-lsb'
      );
    });

    it('should detect corrupted magic signature', async () => {
      const messageData = new TextEncoder().encode('test');
      const pixelData = createTestPixelData(50, 50);

      const corruptedHeader = createCorruptedHeader(messageData, 'triple-redundancy', 'magic');

      await expectToThrowWithMessage(() => decoder.decode(pixelData, corruptedHeader), 'Invalid magic signature');
    });

    it('should detect checksum mismatches', async () => {
      const messageData = new TextEncoder().encode('test');
      const pixelData = createTestPixelData(50, 50);

      const corruptedHeader = createCorruptedHeader(messageData, 'triple-redundancy', 'checksum');

      await expectToThrowWithMessage(() => decoder.decode(pixelData, corruptedHeader), 'Checksum mismatch');
    });

    it('should detect length mismatches', async () => {
      const messageData = new TextEncoder().encode('test');
      const pixelData = createTestPixelData(50, 50);

      const corruptedHeader = createCorruptedHeader(messageData, 'triple-redundancy', 'length');

      // When header length is corrupted, decoder extracts wrong number of bits
      // This causes checksum mismatch, which is the correct behavior
      await expectToThrowWithMessage(() => decoder.decode(pixelData, corruptedHeader), 'Checksum mismatch');
    });

    it('should handle insufficient pixel data', async () => {
      const tinyPixelData = createTestPixelData(2, 2);
      const testData = new TextEncoder().encode('test');
      const header = createHeader(testData.length, 'triple-redundancy', testData);

      await expectToThrowWithMessage(() => decoder.decode(tinyPixelData, header), 'Insufficient pixel data');
    });
  });

  describe('corruption resistance', () => {
    it('should recover from minor corruption using triple redundancy', async () => {
      const originalMessage = TEST_MESSAGES.short;
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createPixelDataForMessage(originalMessage.length, 'triple-redundancy');

      const header = createHeader(originalMessage.length, 'triple-redundancy', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Corrupt some bits sparsely (this should be recoverable with triple redundancy)
      const corruptedPixelData = corruptPixelDataSparse(encodedPixelData, 20);

      // Should still be able to decode due to triple redundancy
      const extractedHeader = await decoder.extractHeader(corruptedPixelData);
      const decodedBytes = await decoder.decode(corruptedPixelData, extractedHeader);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(originalMessage);
    });

    it('should fail gracefully with excessive corruption', async () => {
      const originalMessage = TEST_MESSAGES.short;
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createPixelDataForMessage(originalMessage.length, 'triple-redundancy');

      const header = createHeader(originalMessage.length, 'triple-redundancy', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Corrupt many pixels - should exceed redundancy capability
      const heavilyCorrupted = corruptPixelDataLSBs(
        encodedPixelData,
        0,
        Math.floor(encodedPixelData.totalPixels * 0.8)
      );

      // Should either fail validation or produce incorrect results
      try {
        const extractedHeader = await decoder.extractHeader(heavilyCorrupted);
        const decodedBytes = await decoder.decode(heavilyCorrupted, extractedHeader);
        const decodedMessage = new TextDecoder().decode(decodedBytes);

        // If it succeeds, the message might be wrong (depends on corruption pattern)
        // This is expected behavior - redundancy has limits
        expect(typeof decodedMessage).toBe('string');
      } catch (error) {
        // Failure is also acceptable with heavy corruption
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('redundancy factor support', () => {
    it('should support custom redundancy factors', async () => {
      const originalMessage = TEST_MESSAGES.short;
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createTestPixelData(150, 150); // Use larger pixel data for higher redundancy

      const header = createHeader(messageData.length, 'triple-redundancy', messageData);

      // Encode with different redundancy factors
      const encodedWith5 = await encoder.encodeWithRedundancy(pixelData, messageData, header, 5);
      const encodedWith7 = await encoder.encodeWithRedundancy(pixelData, messageData, header, 7);

      // Decode with matching redundancy factors (using known header)
      const decodedBytes5 = await decoder.decodeWithRedundancy(encodedWith5, header, 5);
      const decodedMessage5 = new TextDecoder().decode(decodedBytes5);

      const decodedBytes7 = await decoder.decodeWithRedundancy(encodedWith7, header, 7);
      const decodedMessage7 = new TextDecoder().decode(decodedBytes7);

      expect(decodedMessage5).toBe(originalMessage);
      expect(decodedMessage7).toBe(originalMessage);
    });

    it('should default to triple redundancy', async () => {
      const originalMessage = TEST_MESSAGES.short;
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createPixelDataForMessage(originalMessage.length, 'triple-redundancy');

      const header = createHeader(originalMessage.length, 'triple-redundancy', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Default decode should work with triple redundancy
      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(originalMessage);
    });
  });

  describe('majority voting', () => {
    it('should correctly implement majority voting', () => {
      // Test the public majority voting method
      expect(decoder.majorityVote([1, 1, 0])).toBe(1);
      expect(decoder.majorityVote([0, 0, 1])).toBe(0);
      expect(decoder.majorityVote([1, 1, 1])).toBe(1);
      expect(decoder.majorityVote([0, 0, 0])).toBe(0);
      expect(decoder.majorityVote([1, 0])).toBe(0); // Tie goes to 0
      expect(decoder.majorityVote([1])).toBe(1);
      expect(decoder.majorityVote([0])).toBe(0);
    });

    it('should handle larger voting groups', () => {
      expect(decoder.majorityVote([1, 1, 1, 0, 0])).toBe(1);
      expect(decoder.majorityVote([0, 0, 0, 1, 1])).toBe(0);
      expect(decoder.majorityVote([1, 0, 1, 0, 1])).toBe(1);
      expect(decoder.majorityVote([0, 1, 0, 1, 0])).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty messages', async () => {
      const messageData = new Uint8Array(0);
      const pixelData = createTestPixelData(100, 100);

      const header = createHeader(0, 'triple-redundancy', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);

      expect(decodedBytes.length).toBe(0);
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

    it('should handle special characters and unicode', async () => {
      const originalMessage = TEST_MESSAGES.unicode;
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createPixelDataForMessage(originalMessage.length, 'triple-redundancy');

      const header = createHeader(messageData.length, 'triple-redundancy', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(originalMessage);
    });

    it('should handle minimum viable pixel data', async () => {
      const messageData = new TextEncoder().encode('A');
      const pixelData = createTestPixelData(20, 20);

      const header = createHeader(1, 'triple-redundancy', messageData);

      // Should either encode successfully or fail gracefully
      if (encoder.canEncode(pixelData, 1)) {
        const encodedPixelData = await encoder.encode(pixelData, messageData, header);
        const extractedHeader = await decoder.extractHeader(encodedPixelData);
        const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
        const decodedMessage = new TextDecoder().decode(decodedBytes);

        expect(decodedMessage).toBe('A');
      } else {
        // If encoder rejects it, that's also correct behavior
        await expectToThrowWithMessage(() => encoder.encode(pixelData, messageData, header), 'Message too large');
      }
    });
  });
});
