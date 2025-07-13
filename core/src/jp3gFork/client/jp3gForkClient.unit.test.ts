import { describe, it, expect, beforeEach } from 'vitest';
import { EnhancedJp3gForkClient } from './EnhancedJp3gForkClient';

describe('Jp3gForkClient Unit Tests', () => {
  let client: EnhancedJp3gForkClient;

  beforeEach(() => {
    client = new EnhancedJp3gForkClient(false); // Disable debug mode for unit tests
  });

  describe('constructor', () => {
    it('should create a new instance', () => {
      expect(client).toBeInstanceOf(EnhancedJp3gForkClient);
    });
  });

  describe('input validation', () => {
    it('should handle empty image buffer', async () => {
      const emptyBuffer = new Uint8Array(0);
      const result = await client.embedMessage(emptyBuffer, 'test');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid JPEG magic bytes', async () => {
      const invalidBuffer = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      const result = await client.embedMessage(invalidBuffer, 'test');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate message parameters for embedding', async () => {
      const mockBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // JPEG header

      // Test empty message
      const result1 = await client.embedMessage(mockBuffer, '');
      expect(result1.success).toBe(false);
      expect(result1.error).toBeDefined();

      // Test with minimal JPEG buffer (should fail due to invalid structure)
      const result2 = await client.embedMessage(mockBuffer, 'test');
      expect(result2.success).toBe(false);
      expect(result2.error).toBeDefined();
    });

    it('should validate message length for extraction', async () => {
      const mockBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

      // Test negative length (should handle gracefully)
      const result1 = await client.extractMessage(mockBuffer, -1);
      expect(result1.success).toBe(false);
      expect(result1.error).toBeDefined();

      // Test zero length (should handle gracefully)
      const result2 = await client.extractMessage(mockBuffer, 0);
      expect(result2.success).toBe(false);
      expect(result2.error).toBeDefined();

      // Test excessively large length
      const result3 = await client.extractMessage(mockBuffer, 1000000);
      expect(result3.success).toBe(false);
      expect(result3.error).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle corrupted JPEG data gracefully', async () => {
      // Create a buffer that starts like JPEG but has corrupted data
      const corruptedBuffer = new Uint8Array([
        0xff,
        0xd8, // JPEG SOI
        0xff,
        0xe0, // APP0 marker
        0x00,
        0x10, // Length
        ...Array(10).fill(0xff), // Corrupted data
        0xff,
        0xd9, // EOI
      ]);

      const result = await client.embedMessage(corruptedBuffer, 'test');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle memory allocation failures gracefully', async () => {
      // Test with minimal valid JPEG that might cause allocation issues
      const minimalBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]); // Just SOI + EOI

      const result = await client.embedMessage(minimalBuffer, 'test');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('parameter boundary testing', () => {
    it('should handle quality parameter boundaries', async () => {
      const buffer = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

      // Test minimum quality
      const result1 = await client.embedMessage(buffer, 'test', { quality: 1 });
      expect(result1.success).toBe(false); // Should fail due to invalid JPEG

      // Test maximum quality
      const result2 = await client.embedMessage(buffer, 'test', { quality: 100 });
      expect(result2.success).toBe(false); // Should fail due to invalid JPEG

      // Test invalid quality values (should be handled gracefully)
      const result3 = await client.embedMessage(buffer, 'test', { quality: 0 });
      expect(result3.success).toBe(false);

      const result4 = await client.embedMessage(buffer, 'test', { quality: 101 });
      expect(result4.success).toBe(false);
    });

    it('should handle very long messages', async () => {
      const buffer = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
      const longMessage = 'x'.repeat(10000); // 10KB message

      const result = await client.embedMessage(buffer, longMessage);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
