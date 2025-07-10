import { describe, it, expect, beforeEach } from 'vitest';
import { DCTSteganographyEngine } from './DCTSteganographyEngine';
import { DCTEncodingOptions } from '../types/DCTEncodingOptions';
import { DCTDecodingOptions } from '../types/DCTDecodingOptions';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// TODO: WIP f5stegojs only works for baseline JPEG images
describe.skip('DCTSteganographyEngine', () => {
  let engine: DCTSteganographyEngine;
  let sampleJpegBuffer: ArrayBuffer;
  const testKey = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const testMessage = 'Hello, this is a secret message!';

  beforeEach(() => {
    engine = new DCTSteganographyEngine();

    // Load a sample JPEG image for testing
    try {
      const imagePath = join(__dirname, '../../tests/images/FacebookPFP.jpg');
      const imageBuffer = readFileSync(imagePath);
      sampleJpegBuffer = imageBuffer.buffer.slice(
        imageBuffer.byteOffset,
        imageBuffer.byteOffset + imageBuffer.byteLength
      );
    } catch {
      console.warn('Sample JPEG not found. Some tests will be skipped.');
    }
  });

  describe('Engine Initialization', () => {
    it('should initialize successfully', () => {
      expect(engine).toBeDefined();
      expect(engine.isReady()).toBe(true);
    });
  });

  describe('Capacity Analysis', () => {
    it('should calculate capacity for a JPEG image', async () => {
      if (!sampleJpegBuffer) {
        console.warn('Skipping capacity test - no sample image');
        return;
      }

      const capacity = await engine.getCapacity(sampleJpegBuffer, testKey);

      expect(capacity).toBeDefined();
      expect(capacity.maxBytes).toBeGreaterThan(0);
      expect(capacity.maxBits).toBe(capacity.maxBytes * 8);
      expect(capacity.capacityByMode).toBeInstanceOf(Array);
      expect(capacity.totalCoefficients).toBeGreaterThan(0);
      expect(capacity.usableCoefficients).toBeGreaterThan(0);
    });
  });

  describe('Encoding', () => {
    it('should encode a message into JPEG DCT coefficients', async () => {
      if (!sampleJpegBuffer) {
        console.warn('Skipping encoding test - no sample image');
        return;
      }

      const encodingOptions: DCTEncodingOptions = {
        stegoKey: testKey,
        verifyEmbedding: true,
      };

      const result = await engine.encode(sampleJpegBuffer, testMessage, encodingOptions);

      expect(result).toBeDefined();
      expect(result.stegoImage).toBeInstanceOf(ArrayBuffer);
      expect(result.stegoImage.byteLength).toBeGreaterThan(0);
      expect(result.statistics.originalSize).toBe(sampleJpegBuffer.byteLength);
      expect(result.statistics.messageSize).toBe(testMessage.length);
      expect(result.statistics.codingParameter).toBeGreaterThan(0);
      expect(result.statistics.efficiency).toBeGreaterThan(0);
      expect(result.verified).toBe(true);

      console.log(`Encoding statistics:`, result.statistics);
    });

    it('should handle encoding errors gracefully', async () => {
      const invalidJpegBuffer = new ArrayBuffer(10); // Invalid JPEG data
      const encodingOptions: DCTEncodingOptions = {
        stegoKey: testKey,
      };

      await expect(engine.encode(invalidJpegBuffer, testMessage, encodingOptions)).rejects.toThrow(
        'Invalid JPEG format'
      );
    });
  });

  describe('Decoding', () => {
    it('should decode a message from stego JPEG', async () => {
      if (!sampleJpegBuffer) {
        console.warn('Skipping decoding test - no sample image');
        return;
      }

      // First, encode a message
      const encodingOptions: DCTEncodingOptions = {
        stegoKey: testKey,
        verifyEmbedding: false,
      };

      const encodingResult = await engine.encode(sampleJpegBuffer, testMessage, encodingOptions);

      // Then, decode the message
      const decodingOptions: DCTDecodingOptions = {
        stegoKey: testKey,
        outputFormat: 'string',
      };

      const decodingResult = await engine.decode(encodingResult.stegoImage, decodingOptions);

      expect(decodingResult).toBeDefined();
      expect(decodingResult.success).toBe(true);
      expect(decodingResult.message).toBe(testMessage);
      expect(decodingResult.statistics.stegoSize).toBe(encodingResult.stegoImage.byteLength);
      expect(decodingResult.statistics.messageSize).toBe(testMessage.length);
      expect(decodingResult.error).toBeUndefined();

      console.log(`Decoding statistics:`, decodingResult.statistics);
    });

    it('should return error for invalid stego image', async () => {
      const invalidStegoBuffer = new ArrayBuffer(10);
      const decodingOptions: DCTDecodingOptions = {
        stegoKey: testKey,
        outputFormat: 'string',
      };

      const result = await engine.decode(invalidStegoBuffer, decodingOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.message).toBe('');
    });
  });

  describe('Round-trip Testing', () => {
    it('should successfully encode and decode various message types', async () => {
      if (!sampleJpegBuffer) {
        console.warn('Skipping round-trip test - no sample image');
        return;
      }

      const testCases = [
        { message: 'Short message', description: 'short text' },
        {
          message:
            'A much longer message that contains more text to test the capacity and efficiency of the DCT steganography algorithm',
          description: 'long text',
        },
        { message: '{"type":"json","data":{"key":"value"}}', description: 'JSON data' },
        { message: new Uint8Array([1, 2, 3, 4, 5, 255, 0, 128]), description: 'binary data' },
      ];

      for (const testCase of testCases) {
        const encodingOptions: DCTEncodingOptions = {
          stegoKey: testKey,
          verifyEmbedding: true,
        };

        const decodingOptions: DCTDecodingOptions = {
          stegoKey: testKey,
          outputFormat: typeof testCase.message === 'string' ? 'string' : 'uint8array',
        };

        const encodingResult = await engine.encode(sampleJpegBuffer, testCase.message, encodingOptions);
        const decodingResult = await engine.decode(encodingResult.stegoImage, decodingOptions);

        expect(decodingResult.success).toBe(true);

        if (typeof testCase.message === 'string') {
          expect(decodingResult.message).toBe(testCase.message);
        } else {
          expect(decodingResult.message).toEqual(testCase.message);
        }

        console.log(`Round-trip test passed for ${testCase.description}`);
      }
    });
  });
});
