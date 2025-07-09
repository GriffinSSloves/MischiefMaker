import { describe, it, expect } from 'vitest';
import { SimpleLSBEncoder } from '../../src/algorithms/SimpleLSBEncoder';
import { SimpleLSBDecoder } from '../../src/algorithms/SimpleLSBDecoder';
import { TripleRedundancyEncoder } from '../../src/algorithms/TripleRedundancyEncoder';
import { TripleRedundancyDecoder } from '../../src/algorithms/TripleRedundancyDecoder';
import type { PixelData } from '../../src/types/PixelData';
import { createHeader } from '../../src/utils/HeaderUtility/HeaderUtility';

/**
 * Create deterministic test pixel data for consistent testing
 */
function createDeterministicPixelData(width: number, height: number): PixelData {
  const totalPixels = width * height;
  const red = new Array(totalPixels);
  const green = new Array(totalPixels);
  const blue = new Array(totalPixels);

  // Generate deterministic but varied pixel values
  for (let i = 0; i < totalPixels; i++) {
    red[i] = (i * 17) % 256;
    green[i] = (i * 31) % 256;
    blue[i] = (i * 47) % 256;
  }

  return {
    width,
    height,
    channels: { red, green, blue },
    totalPixels,
  };
}

describe('Integration: Encode-Decode Workflow', () => {
  describe('SimpleLSB Algorithm', () => {
    it('should encode and decode a simple message', async () => {
      const originalMessage = 'Hello, World!';
      const pixelData = createDeterministicPixelData(100, 100);
      const messageData = new TextEncoder().encode(originalMessage);

      const encoder = new SimpleLSBEncoder();
      const decoder = new SimpleLSBDecoder();

      // 1. Create header for the message
      const header = createHeader(originalMessage.length, 'simple-lsb', messageData);

      // 2. Encode the message
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // 3. Extract header from encoded data
      const extractedHeader = await decoder.extractHeader(encodedPixelData);

      // 4. Decode the message
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      // 5. Verify round-trip success
      expect(decodedMessage).toBe(originalMessage);
      expect(extractedHeader.encodingMethod).toBe('simple-lsb');
      expect(extractedHeader.messageLength).toBe(originalMessage.length);
    });

    it('should handle empty message', async () => {
      const originalMessage = '';
      const pixelData = createDeterministicPixelData(50, 50);
      const messageData = new TextEncoder().encode(originalMessage);

      const encoder = new SimpleLSBEncoder();
      const decoder = new SimpleLSBDecoder();

      const header = createHeader(originalMessage.length, 'simple-lsb', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);
      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(originalMessage);
      expect(extractedHeader.messageLength).toBe(0);
    });

    it('should handle longer message', async () => {
      const originalMessage =
        'This is a longer message that should test the encoder and decoder with more realistic data. It contains various characters and punctuation!';
      const pixelData = createDeterministicPixelData(200, 200); // Larger image for longer message
      const messageData = new TextEncoder().encode(originalMessage);

      const encoder = new SimpleLSBEncoder();
      const decoder = new SimpleLSBDecoder();

      const header = createHeader(originalMessage.length, 'simple-lsb', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);
      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(originalMessage);
      expect(extractedHeader.messageLength).toBe(originalMessage.length);
    });

    it('should handle special characters', async () => {
      const originalMessage = 'Special chars: !@#$%^&*()[]{}|;:,.<>?';
      const pixelData = createDeterministicPixelData(100, 100);
      const messageData = new TextEncoder().encode(originalMessage);

      const encoder = new SimpleLSBEncoder();
      const decoder = new SimpleLSBDecoder();

      const header = createHeader(originalMessage.length, 'simple-lsb', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);
      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(originalMessage);
    });
  });

  describe('TripleRedundancy Algorithm', () => {
    it('should encode and decode a simple message with redundancy', async () => {
      const originalMessage = 'Hello!';
      const pixelData = createDeterministicPixelData(200, 200); // Larger image needed for redundancy
      const messageData = new TextEncoder().encode(originalMessage);

      const encoder = new TripleRedundancyEncoder();
      const decoder = new TripleRedundancyDecoder();

      // 1. Create header for the message
      const header = createHeader(originalMessage.length, 'triple-redundancy', messageData);

      // 2. Encode the message
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // 3. Extract header from encoded data
      const extractedHeader = await decoder.extractHeader(encodedPixelData);

      // 4. Decode the message
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      // 5. Verify round-trip success
      expect(decodedMessage).toBe(originalMessage);
      expect(extractedHeader.encodingMethod).toBe('triple-redundancy');
      expect(extractedHeader.messageLength).toBe(originalMessage.length);
    });

    it('should handle message with error correction', async () => {
      const originalMessage = 'Error test';
      const pixelData = createDeterministicPixelData(300, 300); // Large image for redundancy
      const messageData = new TextEncoder().encode(originalMessage);

      const encoder = new TripleRedundancyEncoder();
      const decoder = new TripleRedundancyDecoder();

      const header = createHeader(originalMessage.length, 'triple-redundancy', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Simulate some bit corruption (flip a few bits)
      // This should still decode correctly due to redundancy
      encodedPixelData.channels.red[100] ^= 1; // Flip LSB
      encodedPixelData.channels.green[200] ^= 1; // Flip LSB
      encodedPixelData.channels.blue[300] ^= 1; // Flip LSB

      const extractedHeader = await decoder.extractHeader(encodedPixelData);
      const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(originalMessage);
    });
  });

  describe('Cross-Algorithm Error Handling', () => {
    it('should fail when using wrong decoder for encoded data', async () => {
      const originalMessage = 'Hello!';
      const pixelData = createDeterministicPixelData(200, 200);
      const messageData = new TextEncoder().encode(originalMessage);

      // Encode with SimpleLSB
      const encoder = new SimpleLSBEncoder();
      const header = createHeader(originalMessage.length, 'simple-lsb', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Try to decode with TripleRedundancy (should fail during header extraction)
      const decoder = new TripleRedundancyDecoder();

      // This should fail because TripleRedundancyDecoder expects 3x redundancy but data was encoded with 1x
      await expect(decoder.extractHeader(encodedPixelData)).rejects.toThrow();
    });

    it('should fail when pixel data is too small for message', async () => {
      const originalMessage = 'This message is too long for the tiny image';
      const pixelData = createDeterministicPixelData(10, 10); // Very small image
      const messageData = new TextEncoder().encode(originalMessage);

      const encoder = new SimpleLSBEncoder();
      const header = createHeader(originalMessage.length, 'simple-lsb', messageData);

      // Should fail during encoding due to insufficient capacity
      await expect(encoder.encode(pixelData, messageData, header)).rejects.toThrow();
    });
  });
});
