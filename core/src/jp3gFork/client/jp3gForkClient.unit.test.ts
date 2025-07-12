import { describe, it, expect, beforeEach } from 'vitest';
import { Jp3gForkClient } from './jp3gForkClient';

describe('Jp3gForkClient Unit Tests', () => {
  let client: Jp3gForkClient;

  beforeEach(() => {
    client = new Jp3gForkClient();
  });

  describe('constructor', () => {
    it('should create a new instance', () => {
      expect(client).toBeInstanceOf(Jp3gForkClient);
    });
  });

  describe('input validation', () => {
    // TODO: Fix this test
    it.skip('should handle empty image buffer', async () => {
      const emptyBuffer = new Uint8Array(0);
      const result = await client.parseWithInternalAccess(emptyBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('buffer');
    });

    it('should handle invalid JPEG magic bytes', async () => {
      const invalidBuffer = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      const result = await client.parseWithInternalAccess(invalidBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate message parameters for embedding', async () => {
      const mockBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // JPEG header

      // Test empty message
      const result1 = await client.embedMessageAndReencode(mockBuffer, '');
      expect(result1.success).toBe(false);
      expect(result1.error).toBeDefined();

      // Test undefined quality
      const result2 = await client.embedMessageAndReencode(mockBuffer, 'test', undefined as any);
      expect(result2.success).toBe(false);
      expect(result2.error).toBeDefined();
    });

    it('should validate message length for extraction', async () => {
      const mockBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

      // Test negative length
      const result1 = await client.extractMessage(mockBuffer, -1);
      expect(result1.success).toBe(false);
      expect(result1.error).toBeDefined();

      // Test zero length
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

      const result = await client.parseWithInternalAccess(corruptedBuffer);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle memory allocation failures gracefully', async () => {
      // Test with minimal valid JPEG that might cause allocation issues
      const minimalBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]); // Just SOI + EOI

      const result = await client.parseWithInternalAccess(minimalBuffer);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('parameter boundary testing', () => {
    it('should handle quality parameter boundaries', async () => {
      const buffer = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

      // Test minimum quality
      const result1 = await client.embedMessageAndReencode(buffer, 'test', 1);
      expect(result1.success).toBe(false); // Should fail due to invalid JPEG

      // Test maximum quality
      const result2 = await client.embedMessageAndReencode(buffer, 'test', 100);
      expect(result2.success).toBe(false); // Should fail due to invalid JPEG

      // Test invalid quality values
      const result3 = await client.embedMessageAndReencode(buffer, 'test', 0);
      expect(result3.success).toBe(false);

      const result4 = await client.embedMessageAndReencode(buffer, 'test', 101);
      expect(result4.success).toBe(false);
    });

    it('should handle very long messages', async () => {
      const buffer = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
      const longMessage = 'x'.repeat(10000); // 10KB message

      const result = await client.embedMessageAndReencode(buffer, longMessage);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
