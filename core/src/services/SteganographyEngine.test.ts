import { describe, it, expect, beforeEach } from 'vitest';
import { SteganographyEngine } from './SteganographyEngine';
import { MockImageProcessor, createTestImageBuffer } from '../../tests/utils/MockImageProcessor';
import type { CompressionOptions } from '../types/CompressionOptions';
import { ERROR_CODES } from '../types/Constants';

describe('SteganographyEngine', () => {
  let engine: SteganographyEngine;
  let mockImageProcessor: MockImageProcessor;

  beforeEach(() => {
    mockImageProcessor = new MockImageProcessor();
    engine = new SteganographyEngine(mockImageProcessor);
  });

  describe('encodeMessage', () => {
    it('should encode a simple message using SimpleLSB', async () => {
      const message = 'Hello, World!';
      const imageBuffer = createTestImageBuffer(100, 100);

      const result = await engine.encodeMessage(imageBuffer, message);

      expect(result.success).toBe(true);
      expect(result.methodUsed).toBe('simple-lsb');
      expect(result.usedFallback).toBe(false);
      expect(result.fileSize).toBeLessThan(1024 * 1024); // Under 1MB
      expect(result.dimensions).toEqual({ width: 100, height: 100 });
      expect(result.capacityInfo).toBeDefined();
    });

    it('should encode a longer message using SimpleLSB', async () => {
      const message = 'This is a longer message that tests the SimpleLSB encoding with more realistic data content.';
      const imageBuffer = createTestImageBuffer(200, 200);

      const result = await engine.encodeMessage(imageBuffer, message);

      expect(result.success).toBe(true);
      expect(result.methodUsed).toBe('simple-lsb');
      expect(result.usedFallback).toBe(false);
      expect(result.fileSize).toBeLessThan(1024 * 1024);
    });

    it('should fallback to TripleRedundancy when SimpleLSB fails due to data corruption', async () => {
      // Create a normal-sized message that would fit in SimpleLSB capacity
      const message = 'Test message that should trigger fallback due to data loss during JPEG compression';
      const imageBuffer = createTestImageBuffer(200, 200);

      // Enable data loss simulation with 'every-3rd' corruption pattern
      // This corrupts 1/3 of Simple LSB data (causing failure) but only 1/3 of each Triple Redundancy copy (allowing recovery)
      const mockProcessorWithLoss = new MockImageProcessor('every-3rd');
      const engineWithLoss = new SteganographyEngine(mockProcessorWithLoss);

      const result = await engineWithLoss.encodeMessage(imageBuffer, message);

      expect(result.success).toBe(true);
      expect(result.methodUsed).toBe('triple-redundancy');
      expect(result.usedFallback).toBe(true);
      expect(result.fileSize).toBeLessThan(1024 * 1024);
    });

    it('should successfully decode message encoded with fallback method', async () => {
      // Create a normal-sized message that would fit in SimpleLSB capacity
      const originalMessage = 'Test message for fallback decoding verification';
      const imageBuffer = createTestImageBuffer(200, 200);

      // Enable data loss simulation with 'every-3rd' corruption pattern
      const mockProcessorWithLoss = new MockImageProcessor('every-3rd');
      const engineWithLoss = new SteganographyEngine(mockProcessorWithLoss);

      // Encode with fallback (should use Triple Redundancy)
      const encodeResult = await engineWithLoss.encodeMessage(imageBuffer, originalMessage);
      expect(encodeResult.success).toBe(true);
      expect(encodeResult.methodUsed).toBe('triple-redundancy');
      expect(encodeResult.usedFallback).toBe(true);

      // Decode should work correctly (Triple Redundancy is more robust)
      const decodeResult = await engineWithLoss.decodeMessage(encodeResult.imageData!);
      expect(decodeResult.success).toBe(true);
      expect(decodeResult.message).toBe(originalMessage);
      expect(decodeResult.methodDetected).toBe('triple-redundancy');
    });

    it('should fail when corruption is too severe for both algorithms', async () => {
      // Create a normal-sized message
      const message = 'Test message with severe corruption that should fail both algorithms';
      const imageBuffer = createTestImageBuffer(200, 200);

      // Enable severe data loss simulation with 'every-2nd' corruption pattern
      // This corrupts 50% of bit positions, causing both algorithms to fail
      const mockProcessorWithSevereCorruption = new MockImageProcessor('every-2nd');
      const engineWithSevereCorruption = new SteganographyEngine(mockProcessorWithSevereCorruption);

      const result = await engineWithSevereCorruption.encodeMessage(imageBuffer, message);

      console.log('Debug - Severe corruption test result:', {
        success: result.success,
        methodUsed: result.methodUsed,
        usedFallback: result.usedFallback,
        error: result.error,
        errorCode: result.errorCode,
      });

      // Both algorithms should fail, resulting in encoding failure
      expect(result.success).toBe(false);
      expect(result.error).toContain('Message encoding failed');
      expect(result.errorCode).toBe(ERROR_CODES.MESSAGE_TOO_LARGE);
    });

    it('should fail when message is too large for both methods', async () => {
      const veryLongMessage = 'A'.repeat(50000); // Very long message
      const imageBuffer = createTestImageBuffer(50, 50); // Small image (capacity ~833 bytes for SimpleLSB, ~277 bytes for TripleRedundancy)

      const result = await engine.encodeMessage(imageBuffer, veryLongMessage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Message encoding failed');
      expect(result.errorCode).toBe(ERROR_CODES.MESSAGE_TOO_LARGE);
    });

    it('should handle empty message', async () => {
      const message = '';
      const imageBuffer = createTestImageBuffer(100, 100);

      const result = await engine.encodeMessage(imageBuffer, message);

      expect(result.success).toBe(true);
      expect(result.methodUsed).toBe('simple-lsb');
      expect(result.usedFallback).toBe(false);
    });

    it('should apply compression options', async () => {
      const message = 'Test message';
      const imageBuffer = createTestImageBuffer(100, 100);
      const options: Partial<CompressionOptions> = {
        quality: 80,
        maxSize: 500 * 1024, // 500KB
      };

      const result = await engine.encodeMessage(imageBuffer, message, options);

      expect(result.success).toBe(true);
      expect(result.fileSize).toBeLessThan(500 * 1024);
    });

    it('should handle special characters', async () => {
      const message = 'Special chars: !@#$%^&*()[]{}|;:,.<>?';
      const imageBuffer = createTestImageBuffer(100, 100);

      const result = await engine.encodeMessage(imageBuffer, message);

      expect(result.success).toBe(true);
      expect(result.methodUsed).toBe('simple-lsb');
    });

    it('should handle Unicode characters', async () => {
      const message = '你好世界 🌍 émojis';
      const imageBuffer = createTestImageBuffer(200, 200);

      const result = await engine.encodeMessage(imageBuffer, message);

      expect(result.success).toBe(true);
      expect(result.methodUsed).toBe('simple-lsb');
    });

    it('should handle invalid image buffer gracefully', async () => {
      const message = 'Test message';
      const invalidBuffer = new ArrayBuffer(0); // Empty buffer

      const result = await engine.encodeMessage(invalidBuffer, message);

      // MockImageProcessor handles invalid buffers gracefully by returning default 100x100 image
      expect(result.success).toBe(true);
      expect(result.methodUsed).toBe('simple-lsb');
    });
  });

  describe('decodeMessage', () => {
    it('should decode SimpleLSB encoded message', async () => {
      const originalMessage = 'Hello, World!';
      const imageBuffer = createTestImageBuffer(100, 100);

      // First encode the message
      const encodeResult = await engine.encodeMessage(imageBuffer, originalMessage);
      expect(encodeResult.success).toBe(true);

      // Then decode it
      const decodeResult = await engine.decodeMessage(encodeResult.imageData!);

      expect(decodeResult.success).toBe(true);
      expect(decodeResult.message).toBe(originalMessage);
      expect(decodeResult.methodDetected).toBe('simple-lsb');
      expect(decodeResult.messageLength).toBe(originalMessage.length);
      expect(decodeResult.validation?.isValid).toBe(true);
    });

    it('should decode TripleRedundancy encoded message', async () => {
      const originalMessage = 'Message to test TripleRedundancy decoding';
      const imageBuffer = createTestImageBuffer(200, 200);

      // Use data loss simulation to trigger TripleRedundancy encoding
      const mockProcessorWithLoss = new MockImageProcessor('every-3rd');
      const engineWithLoss = new SteganographyEngine(mockProcessorWithLoss);

      // First encode the message (should use TripleRedundancy due to data loss simulation)
      const encodeResult = await engineWithLoss.encodeMessage(imageBuffer, originalMessage);
      expect(encodeResult.success).toBe(true);
      expect(encodeResult.methodUsed).toBe('triple-redundancy');

      // Then decode it
      const decodeResult = await engineWithLoss.decodeMessage(encodeResult.imageData!);

      expect(decodeResult.success).toBe(true);
      expect(decodeResult.message).toBe(originalMessage);
      expect(decodeResult.methodDetected).toBe('triple-redundancy');
      expect(decodeResult.messageLength).toBe(originalMessage.length);
      expect(decodeResult.validation?.isValid).toBe(true);
    });

    it('should handle empty message decoding', async () => {
      const originalMessage = '';
      const imageBuffer = createTestImageBuffer(100, 100);

      const encodeResult = await engine.encodeMessage(imageBuffer, originalMessage);
      expect(encodeResult.success).toBe(true);

      const decodeResult = await engine.decodeMessage(encodeResult.imageData!);

      expect(decodeResult.success).toBe(true);
      expect(decodeResult.message).toBe(originalMessage);
      expect(decodeResult.messageLength).toBe(0);
    });

    it('should handle special characters in decoding', async () => {
      const originalMessage = 'Special chars: !@#$%^&*()[]{}|;:,.<>?';
      const imageBuffer = createTestImageBuffer(200, 200);

      const encodeResult = await engine.encodeMessage(imageBuffer, originalMessage);
      expect(encodeResult.success).toBe(true);

      const decodeResult = await engine.decodeMessage(encodeResult.imageData!);

      expect(decodeResult.success).toBe(true);
      expect(decodeResult.message).toBe(originalMessage);
    });

    it('should handle Unicode characters in decoding', async () => {
      const originalMessage = '你好世界 🌍 émojis';
      const imageBuffer = createTestImageBuffer(200, 200);

      const encodeResult = await engine.encodeMessage(imageBuffer, originalMessage);
      expect(encodeResult.success).toBe(true);

      const decodeResult = await engine.decodeMessage(encodeResult.imageData!);

      expect(decodeResult.success).toBe(true);
      expect(decodeResult.message).toBe(originalMessage);
    });

    it('should fail when no steganographic data is present', async () => {
      const plainImageBuffer = createTestImageBuffer(100, 100);

      const result = await engine.decodeMessage(plainImageBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid steganography header found');
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_MAGIC_SIGNATURE);
    });

    it('should handle corrupted image buffer', async () => {
      const corruptedBuffer = new ArrayBuffer(100);
      const view = new Uint8Array(corruptedBuffer);
      view.fill(0xff); // Fill with invalid data

      const result = await engine.decodeMessage(corruptedBuffer);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_MAGIC_SIGNATURE);
    });
  });

  describe('checkCapacity', () => {
    it('should check capacity for small message', async () => {
      const messageLength = 100;
      const imageBuffer = createTestImageBuffer(200, 200);

      const result = await engine.checkCapacity(imageBuffer, messageLength);

      expect(result.canFit).toBe(true);
      expect(result.capacity).toBeDefined();
      expect(result.capacity.capacity).toBeGreaterThan(messageLength);
    });

    it('should check capacity for large message', async () => {
      const messageLength = 50000; // Large message
      const imageBuffer = createTestImageBuffer(100, 100); // Small image

      const result = await engine.checkCapacity(imageBuffer, messageLength);

      expect(result.canFit).toBe(false);
      expect(result.capacity).toBeDefined();
      expect(result.capacity.capacity).toBeLessThan(messageLength);
    });

    it('should check capacity for different image sizes', async () => {
      const messageLength = 1000;
      const smallImageBuffer = createTestImageBuffer(50, 50);
      const largeImageBuffer = createTestImageBuffer(500, 500);

      const smallResult = await engine.checkCapacity(smallImageBuffer, messageLength);
      const largeResult = await engine.checkCapacity(largeImageBuffer, messageLength);

      expect(largeResult.capacity.capacity).toBeGreaterThan(smallResult.capacity.capacity);
      expect(largeResult.canFit).toBe(true);
    });

    it('should handle zero-length message', async () => {
      const messageLength = 0;
      const imageBuffer = createTestImageBuffer(100, 100);

      const result = await engine.checkCapacity(imageBuffer, messageLength);

      expect(result.canFit).toBe(true);
      expect(result.capacity.capacity).toBeGreaterThan(0);
    });

    it('should handle invalid image buffer gracefully', async () => {
      const messageLength = 100;
      const invalidBuffer = new ArrayBuffer(0);

      // MockImageProcessor handles invalid buffers gracefully by returning default dimensions
      const result = await engine.checkCapacity(invalidBuffer, messageLength);

      expect(result.canFit).toBe(true);
      expect(result.capacity).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle full encode-decode workflow', async () => {
      const originalMessage = 'Full integration test message with various characters: !@#$%^&*()';
      const imageBuffer = createTestImageBuffer(300, 300);

      // Encode
      const encodeResult = await engine.encodeMessage(imageBuffer, originalMessage);
      expect(encodeResult.success).toBe(true);

      // Decode
      const decodeResult = await engine.decodeMessage(encodeResult.imageData!);
      expect(decodeResult.success).toBe(true);
      expect(decodeResult.message).toBe(originalMessage);

      // Check that the method used matches the method detected
      expect(decodeResult.methodDetected).toBe(encodeResult.methodUsed);
    });

    it('should handle workflow with compression options', async () => {
      const originalMessage = 'Test message with compression';
      const imageBuffer = createTestImageBuffer(200, 200);
      const options: Partial<CompressionOptions> = {
        quality: 85,
        maxSize: 800 * 1024, // 800KB
      };

      const encodeResult = await engine.encodeMessage(imageBuffer, originalMessage, options);
      expect(encodeResult.success).toBe(true);
      expect(encodeResult.fileSize).toBeLessThan(800 * 1024);

      const decodeResult = await engine.decodeMessage(encodeResult.imageData!);
      expect(decodeResult.success).toBe(true);
      expect(decodeResult.message).toBe(originalMessage);
    });

    it('should handle fallback workflow', async () => {
      // Create a message that will trigger fallback due to data corruption
      const message = 'Integration test message for fallback workflow verification';
      const imageBuffer = createTestImageBuffer(200, 200);

      // Enable data loss simulation to trigger fallback
      const mockProcessorWithLoss = new MockImageProcessor('every-3rd');
      const engineWithLoss = new SteganographyEngine(mockProcessorWithLoss);

      const encodeResult = await engineWithLoss.encodeMessage(imageBuffer, message);
      expect(encodeResult.success).toBe(true);
      expect(encodeResult.usedFallback).toBe(true);
      expect(encodeResult.methodUsed).toBe('triple-redundancy');

      const decodeResult = await engineWithLoss.decodeMessage(encodeResult.imageData!);
      expect(decodeResult.success).toBe(true);
      expect(decodeResult.message).toBe(message);
      expect(decodeResult.methodDetected).toBe('triple-redundancy');
    });

    it('should handle capacity checking integration', async () => {
      const message = 'Test message for capacity integration';
      const imageBuffer = createTestImageBuffer(150, 150);

      // Check capacity first
      const capacityResult = await engine.checkCapacity(imageBuffer, message.length);
      expect(capacityResult.canFit).toBe(true);

      // Encode should succeed
      const encodeResult = await engine.encodeMessage(imageBuffer, message);
      expect(encodeResult.success).toBe(true);

      // Decode should succeed
      const decodeResult = await engine.decodeMessage(encodeResult.imageData!);
      expect(decodeResult.success).toBe(true);
      expect(decodeResult.message).toBe(message);
    });

    it('should handle multiple encoding methods properly', async () => {
      const shortMessage = 'Short';
      const imageBuffer = createTestImageBuffer(200, 200);

      // Short message with normal processor should use SimpleLSB
      const shortResult = await engine.encodeMessage(imageBuffer, shortMessage);
      expect(shortResult.success).toBe(true);
      expect(shortResult.methodUsed).toBe('simple-lsb');

      // Same message with data loss simulation should use TripleRedundancy
      const mockProcessorWithLoss = new MockImageProcessor('every-3rd');
      const engineWithLoss = new SteganographyEngine(mockProcessorWithLoss);

      const longResult = await engineWithLoss.encodeMessage(imageBuffer, shortMessage);
      expect(longResult.success).toBe(true);
      expect(longResult.methodUsed).toBe('triple-redundancy');

      // Both should decode correctly
      const shortDecodeResult = await engine.decodeMessage(shortResult.imageData!);
      expect(shortDecodeResult.success).toBe(true);
      expect(shortDecodeResult.message).toBe(shortMessage);

      const longDecodeResult = await engineWithLoss.decodeMessage(longResult.imageData!);
      expect(longDecodeResult.success).toBe(true);
      expect(longDecodeResult.message).toBe(shortMessage);
    });

    it('should maintain data integrity through compression', async () => {
      const originalMessage = 'Message integrity test with compression 🔒';
      const imageBuffer = createTestImageBuffer(250, 250);
      const options: Partial<CompressionOptions> = {
        quality: 70, // Lower quality to test compression effects
        maxSize: 600 * 1024,
      };

      const encodeResult = await engine.encodeMessage(imageBuffer, originalMessage, options);
      expect(encodeResult.success).toBe(true);

      const decodeResult = await engine.decodeMessage(encodeResult.imageData!);
      expect(decodeResult.success).toBe(true);
      expect(decodeResult.message).toBe(originalMessage);
    });
  });

  describe('Error Handling', () => {
    it('should handle encoding errors gracefully', async () => {
      const message = 'Test message';
      const invalidBuffer = new ArrayBuffer(10); // Too small

      const result = await engine.encodeMessage(invalidBuffer, message);

      // MockImageProcessor handles invalid buffers gracefully by returning default image
      expect(result.success).toBe(true);
      expect(result.methodUsed).toBe('simple-lsb');
    });

    it('should handle decoding errors gracefully', async () => {
      const invalidBuffer = new ArrayBuffer(10);

      const result = await engine.decodeMessage(invalidBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorCode).toBeDefined();
    });

    it('should handle capacity check errors gracefully', async () => {
      const invalidBuffer = new ArrayBuffer(0);

      // MockImageProcessor handles invalid buffers gracefully by returning default dimensions
      const result = await engine.checkCapacity(invalidBuffer, 100);

      expect(result.canFit).toBe(true);
      expect(result.capacity).toBeDefined();
    });
  });
});
