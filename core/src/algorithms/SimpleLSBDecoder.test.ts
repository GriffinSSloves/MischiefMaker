import { describe, it, expect, beforeEach } from 'vitest';
import { SimpleLSBDecoder } from './SimpleLSBDecoder';
import type { PixelData } from '../types/PixelData';
import type { SteganographyHeader } from '../types/SteganographyHeader';
import { createHeader } from '../utils/HeaderUtility/HeaderUtility';
import { SimpleLSBEncoder } from './SimpleLSBEncoder';

describe('SimpleLSBDecoder', () => {
  let decoder: SimpleLSBDecoder;

  beforeEach(() => {
    decoder = new SimpleLSBDecoder();
  });

  // Helper function to create test pixel data
  function createTestPixelData(width: number, height: number, fillValue: number = 128): PixelData {
    const totalPixels = width * height;
    return {
      width,
      height,
      channels: {
        red: new Array(totalPixels).fill(fillValue),
        green: new Array(totalPixels).fill(fillValue),
        blue: new Array(totalPixels).fill(fillValue),
      },
      totalPixels,
    };
  }

  // Helper function to create pixel data with specific bits encoded
  function createPixelDataWithBits(width: number, height: number, bits: number[]): PixelData {
    const totalPixels = width * height;
    const red = new Array(totalPixels).fill(128);
    const green = new Array(totalPixels).fill(128);
    const blue = new Array(totalPixels).fill(128);

    // Encode bits into LSBs (red channel first, then green, then blue)
    for (let i = 0; i < bits.length; i++) {
      const pixelIndex = Math.floor(i / 3);
      const channelIndex = i % 3;

      if (pixelIndex < totalPixels) {
        const originalValue = 128; // Base value
        const newValue = (originalValue & 0xfe) | bits[i]; // Clear LSB and set to bit value

        switch (channelIndex) {
          case 0:
            red[pixelIndex] = newValue;
            break;
          case 1:
            green[pixelIndex] = newValue;
            break;
          case 2:
            blue[pixelIndex] = newValue;
            break;
        }
      }
    }

    return {
      width,
      height,
      channels: { red, green, blue },
      totalPixels,
    };
  }

  describe('constructor', () => {
    it('should create decoder instance', () => {
      expect(decoder).toBeInstanceOf(SimpleLSBDecoder);
    });
  });

  describe('extractHeader', () => {
    it('should extract valid header from encoded pixel data', async () => {
      // Create a minimal valid message for encoding
      const originalMessage = 'Hi';
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createTestPixelData(50, 50);

      // Use encoder to create valid encoded pixel data
      const encoder = new SimpleLSBEncoder();
      const header = createHeader(originalMessage.length, 'simple-lsb', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Extract header using decoder
      const extractedHeader = await decoder.extractHeader(encodedPixelData);

      expect(extractedHeader.magicSignature).toBe(0x4d534348); // "MSCH"
      expect(extractedHeader.version).toBe(1);
      expect(extractedHeader.encodingMethod).toBe('simple-lsb');
      expect(extractedHeader.messageLength).toBe(originalMessage.length);
    });

    it('should fail with invalid magic signature', async () => {
      // Create pixel data with invalid magic signature (all zeros)
      const invalidBits = new Array(120).fill(0); // 120 bits = 15 bytes header
      const pixelData = createPixelDataWithBits(50, 50, invalidBits);

      await expect(decoder.extractHeader(pixelData)).rejects.toThrow('Invalid magic signature');
    });

    it('should fail with insufficient pixel data', async () => {
      // Create pixel data too small for even a header
      const pixelData = createTestPixelData(2, 2); // Only 12 bits available (2*2*3)

      await expect(decoder.extractHeader(pixelData)).rejects.toThrow();
    });
  });

  describe('validateMessage', () => {
    it('should validate message with correct checksum', async () => {
      const messageData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const header = createHeader(messageData.length, 'simple-lsb', messageData);

      const result = await decoder.validateMessage(messageData, header);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.checksumValid).toBe(true);
      expect(result.lengthValid).toBe(true);
    });

    it('should detect message length mismatch', async () => {
      const messageData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello" (5 bytes)
      const header = createHeader(messageData.length, 'simple-lsb', messageData); // Create valid header
      header.messageLength = 3; // Then corrupt the length to simulate mismatch

      const result = await decoder.validateMessage(messageData, header);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message length mismatch: expected 3, got 5');
      expect(result.lengthValid).toBe(false);
    });

    it('should detect checksum mismatch', async () => {
      const messageData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const header = createHeader(messageData.length, 'simple-lsb', messageData);

      // Corrupt the header checksum
      header.checksum = 0x12345678; // Wrong checksum

      const result = await decoder.validateMessage(messageData, header);

      expect(result.isValid).toBe(false);
      expect(result.errors?.some(e => e.includes('Checksum mismatch'))).toBe(true);
      expect(result.checksumValid).toBe(false);
    });
  });

  describe('decode', () => {
    it('should decode simple message successfully', async () => {
      const originalMessage = 'Test';
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createTestPixelData(50, 50);

      // Encode message first
      const encoder = new SimpleLSBEncoder();
      const header = createHeader(originalMessage.length, 'simple-lsb', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Decode the message
      const decodedBytes = await decoder.decode(encodedPixelData, header);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(originalMessage);
    });

    it('should reject invalid encoding method', async () => {
      const pixelData = createTestPixelData(50, 50);
      const invalidHeader: SteganographyHeader = {
        magicSignature: 0x4d534348,
        version: 1,
        messageLength: 5,
        checksum: 0x12345678,
        encodingMethod: 'triple-redundancy', // Wrong method for SimpleLSBDecoder
        reserved: 0,
      };

      await expect(decoder.decode(pixelData, invalidHeader)).rejects.toThrow(
        'Invalid encoding method for SimpleLSBDecoder: triple-redundancy'
      );
    });
  });

  describe('decodeSimple', () => {
    it('should decode using simple LSB method', async () => {
      const originalMessage = 'LSB';
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createTestPixelData(50, 50);

      // Encode message first
      const encoder = new SimpleLSBEncoder();
      const header = createHeader(originalMessage.length, 'simple-lsb', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Decode using decodeSimple
      const decodedBytes = await decoder.decodeSimple(encodedPixelData, header);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(originalMessage);
    });

    it('should handle empty message', async () => {
      const originalMessage = '';
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createTestPixelData(50, 50);

      // Encode empty message
      const encoder = new SimpleLSBEncoder();
      const header = createHeader(originalMessage.length, 'simple-lsb', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Decode empty message
      const decodedBytes = await decoder.decodeSimple(encodedPixelData, header);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(originalMessage);
      expect(decodedBytes.length).toBe(0);
    });

    it('should fail validation with corrupted message', async () => {
      const originalMessage = 'Test';
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createTestPixelData(50, 50);

      // Encode message first
      const encoder = new SimpleLSBEncoder();
      const header = createHeader(originalMessage.length, 'simple-lsb', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      // Corrupt the encoded pixel data more systematically
      // Message bits start after header (about 120 bits / 3 = 40 pixels)
      // Corrupt multiple pixels in the message area
      for (let i = 50; i < 60; i++) {
        encodedPixelData.channels.red[i] ^= 1; // Flip LSB
        encodedPixelData.channels.green[i] ^= 1; // Flip LSB
        encodedPixelData.channels.blue[i] ^= 1; // Flip LSB
      }

      // Decoding should fail due to checksum mismatch
      await expect(decoder.decodeSimple(encodedPixelData, header)).rejects.toThrow('Message validation failed');
    });
  });

  describe('edge cases', () => {
    it('should handle maximum message length', async () => {
      // Create a message that fills most of the available capacity
      const pixelData = createTestPixelData(100, 100); // 30,000 bits capacity
      const encoder = new SimpleLSBEncoder();
      const availableBytes = encoder.calculateCapacity(pixelData.width, pixelData.height);
      const maxMessage = 'A'.repeat(availableBytes - 1); // Leave some room for header

      const messageData = new TextEncoder().encode(maxMessage);
      const header = createHeader(maxMessage.length, 'simple-lsb', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      const decodedBytes = await decoder.decode(encodedPixelData, header);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(maxMessage);
    });

    it('should handle single character message', async () => {
      const originalMessage = 'A';
      const messageData = new TextEncoder().encode(originalMessage);
      const pixelData = createTestPixelData(50, 50);

      const encoder = new SimpleLSBEncoder();
      const header = createHeader(originalMessage.length, 'simple-lsb', messageData);
      const encodedPixelData = await encoder.encode(pixelData, messageData, header);

      const decodedBytes = await decoder.decode(encodedPixelData, header);
      const decodedMessage = new TextDecoder().decode(decodedBytes);

      expect(decodedMessage).toBe(originalMessage);
    });
  });
});
