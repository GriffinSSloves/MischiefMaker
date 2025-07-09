import { describe, it, expect } from 'vitest';
import {
  createHeader,
  createHeaderWithChecksum,
  serializeHeader,
  deserializeHeader,
  validateHeader,
  getHeaderSizeInBits,
  getHeaderSizeInBytes,
  headersEqual,
  parseAndValidateHeader,
  verifyMessageIntegrity,
  calculateHeaderOverhead,
  summarizeHeader,
} from './HeaderUtility';
import type { EncodingMethod } from '../../types/EncodingMethod';
import { bitsToNumber, numberToBits } from '../BitOperations/BitOperations';

describe('HeaderUtility', () => {
  // Test data
  const testMessage = new TextEncoder().encode('Hello, MischiefMaker!');
  const emptyMessage = new Uint8Array(0);

  describe('header creation', () => {
    it('should create header without message data', () => {
      const header = createHeader(100, 'simple-lsb');

      expect(header.magicSignature).toBe(0x4d534348); // "MSCH"
      expect(header.version).toBe(1);
      expect(header.messageLength).toBe(100);
      expect(header.checksum).toBe(0); // No message data provided
      expect(header.encodingMethod).toBe('simple-lsb');
      expect(header.reserved).toBe(0);
    });

    it('should create header with message data and checksum', () => {
      const header = createHeader(testMessage.length, 'triple-redundancy', testMessage);

      expect(header.messageLength).toBe(testMessage.length);
      expect(header.encodingMethod).toBe('triple-redundancy');
      expect(header.checksum).toBeGreaterThan(0);
    });

    it('should throw error for negative message length', () => {
      expect(() => createHeader(-1, 'simple-lsb')).toThrow('Message length cannot be negative');
    });

    it('should throw error for oversized message length', () => {
      expect(() => createHeader(0xffffffff + 1, 'simple-lsb')).toThrow('Message length exceeds maximum supported size');
    });

    it('should throw error for mismatched message data length', () => {
      expect(() => createHeader(10, 'simple-lsb', testMessage)).toThrow(
        'Message data length does not match specified length'
      );
    });

    it('should create header with automatic checksum calculation', () => {
      const header = createHeaderWithChecksum(testMessage, 'adaptive-lsb');

      expect(header.messageLength).toBe(testMessage.length);
      expect(header.encodingMethod).toBe('adaptive-lsb');
      expect(header.checksum).toBeGreaterThan(0);
    });

    it('should handle empty message data', () => {
      const header = createHeaderWithChecksum(emptyMessage, 'simple-lsb');

      expect(header.messageLength).toBe(0);
      expect(typeof header.checksum).toBe('number'); // CRC32 of empty data is a valid number
    });
  });

  describe('header serialization', () => {
    it('should serialize header to bit array correctly', () => {
      const header = createHeader(1024, 'simple-lsb');
      const bits = serializeHeader(header);

      expect(bits).toBeInstanceOf(Array);
      expect(bits.length).toBe(getHeaderSizeInBits());
      expect(bits.every(bit => bit === 0 || bit === 1)).toBe(true);
    });

    it('should produce correct bit count for header', () => {
      const expectedBits = 16 * 8; // 16 bytes total
      expect(getHeaderSizeInBits()).toBe(expectedBits);
      expect(getHeaderSizeInBytes()).toBe(16);
    });

    it('should serialize different encoding methods correctly', () => {
      const testCases = [
        { method: 'simple-lsb' as EncodingMethod, expectedValue: 0 },
        { method: 'triple-redundancy' as EncodingMethod, expectedValue: 1 },
      ];

      testCases.forEach(({ method, expectedValue }) => {
        const header = createHeader(100, method);
        const bits = serializeHeader(header);

        // Check encoding method bits (at offset 112, 8 bits)
        const methodBits = bits.slice(112, 120);
        const methodValue = bitsToNumber(methodBits);
        expect(methodValue).toBe(expectedValue);
      });
    });
  });

  describe('header deserialization', () => {
    it('should deserialize header correctly', () => {
      const originalHeader = createHeaderWithChecksum(testMessage, 'triple-redundancy');
      const bits = serializeHeader(originalHeader);
      const deserializedHeader = deserializeHeader(bits);

      expect(headersEqual(originalHeader, deserializedHeader)).toBe(true);
    });

    it('should be bidirectional (serialize -> deserialize -> equal)', () => {
      const testCases = [{ method: 'simple-lsb' as EncodingMethod }, { method: 'triple-redundancy' as EncodingMethod }];

      testCases.forEach(({ method }) => {
        const original = createHeader(100, method);
        const bits = serializeHeader(original);
        const deserialized = deserializeHeader(bits);
        expect(headersEqual(original, deserialized)).toBe(true);
      });
    });

    it('should throw error for invalid bit array length', () => {
      const shortBits = new Array(64).fill(0); // Too short
      expect(() => deserializeHeader(shortBits)).toThrow('Invalid header size');

      const longBits = new Array(256).fill(0); // Too long
      expect(() => deserializeHeader(longBits)).toThrow('Invalid header size');
    });

    it('should handle all encoding method values', () => {
      const testCases = [
        { value: 0, expected: 'simple-lsb' },
        { value: 1, expected: 'triple-redundancy' },
      ];

      testCases.forEach(({ value, expected }) => {
        const header = createHeader(100, 'simple-lsb');
        const bits = serializeHeader(header);

        // Modify encoding method bits
        const methodOffset = 112;
        const valueBits = numberToBits(value, 8);
        for (let i = 0; i < 8; i++) {
          bits[methodOffset + i] = valueBits[i];
        }

        const deserialized = deserializeHeader(bits);
        expect(deserialized.encodingMethod).toBe(expected);
      });
    });
  });

  describe('header validation', () => {
    it('should validate correct header', () => {
      const header = createHeader(100, 'simple-lsb');
      const validation = validateHeader(header);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid magic signature', () => {
      const header = createHeader(100, 'simple-lsb');
      header.magicSignature = 0x12345678; // Wrong magic

      const validation = validateHeader(header);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid magic signature'))).toBe(true);
    });

    it('should detect unsupported version', () => {
      const header = createHeader(100, 'simple-lsb');
      header.version = 999; // Future version

      const validation = validateHeader(header);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Unsupported version'))).toBe(true);
    });

    it('should detect invalid version', () => {
      const header = createHeader(100, 'simple-lsb');
      header.version = 0; // Invalid version

      const validation = validateHeader(header);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid version'))).toBe(true);
    });

    it('should detect invalid message length', () => {
      const header = createHeader(100, 'simple-lsb');
      header.messageLength = -1; // Negative length

      const validation = validateHeader(header);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid message length'))).toBe(true);
    });

    it('should detect oversized message length', () => {
      const header = createHeader(100, 'simple-lsb');
      header.messageLength = 0xffffffff + 1; // Too large

      const validation = validateHeader(header);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Message length too large'))).toBe(true);
    });

    it('should detect invalid encoding method', () => {
      const header = createHeader(100, 'simple-lsb');
      // @ts-expect-error - testing invalid encoding method
      header.encodingMethod = 'invalid-method';

      const validation = validateHeader(header);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid encoding method'))).toBe(true);
    });

    it('should accumulate multiple errors', () => {
      const header = createHeader(100, 'simple-lsb');
      header.magicSignature = 0x12345678; // Wrong
      header.version = 0; // Invalid
      header.messageLength = -1; // Invalid

      const validation = validateHeader(header);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(1);
    });
  });

  describe('message integrity verification', () => {
    it('should verify correct message integrity', () => {
      const header = createHeaderWithChecksum(testMessage, 'simple-lsb');
      const isValid = verifyMessageIntegrity(header, testMessage);

      expect(isValid).toBe(true);
    });

    it('should detect corrupted message data', () => {
      const header = createHeaderWithChecksum(testMessage, 'simple-lsb');
      const corruptedMessage = new Uint8Array(testMessage);
      corruptedMessage[0] = corruptedMessage[0] ^ 1; // Flip one bit

      const isValid = verifyMessageIntegrity(header, corruptedMessage);
      expect(isValid).toBe(false);
    });

    it('should detect wrong message length', () => {
      const header = createHeaderWithChecksum(testMessage, 'simple-lsb');
      const shorterMessage = testMessage.slice(0, -1);

      const isValid = verifyMessageIntegrity(header, shorterMessage);
      expect(isValid).toBe(false);
    });

    it('should handle empty message verification', () => {
      const header = createHeaderWithChecksum(emptyMessage, 'simple-lsb');
      const isValid = verifyMessageIntegrity(header, emptyMessage);

      expect(isValid).toBe(true);
    });
  });

  describe('parse and validate combined', () => {
    it('should parse and validate correct header', () => {
      const originalHeader = createHeader(1024, 'triple-redundancy');
      const bits = serializeHeader(originalHeader);
      const result = parseAndValidateHeader(bits);

      expect(result.isValid).toBe(true);
      expect(result.header).toBeDefined();
      expect(result.errors).toHaveLength(0);
      expect(headersEqual(originalHeader, result.header!)).toBe(true);
    });

    it('should handle parsing errors gracefully', () => {
      const invalidBits = new Array(64).fill(0); // Wrong size
      const result = parseAndValidateHeader(invalidBits);

      expect(result.isValid).toBe(false);
      expect(result.header).toBeUndefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle validation errors after successful parsing', () => {
      const header = createHeader(100, 'simple-lsb');
      header.magicSignature = 0x12345678; // Invalid magic signature

      const bits = serializeHeader(header);
      const result = parseAndValidateHeader(bits);

      expect(result.isValid).toBe(false);
      expect(result.header).toBeDefined(); // Header is still returned even when validation fails
      expect(result.errors.some(e => e.includes('Invalid magic signature'))).toBe(true);
    });
  });

  describe('header overhead calculation', () => {
    it('should calculate correct overhead for different encoding methods', () => {
      const baseBits = getHeaderSizeInBits();

      expect(calculateHeaderOverhead('simple-lsb')).toBe(baseBits);
      expect(calculateHeaderOverhead('triple-redundancy')).toBe(baseBits * 3);
      expect(calculateHeaderOverhead('adaptive-lsb')).toBe(baseBits);
    });
  });

  describe('header summary and comparison', () => {
    it('should generate human-readable summary', () => {
      const testMessage = 'Test message';
      const header = createHeader(testMessage.length, 'simple-lsb');
      const summary = summarizeHeader(header);

      expect(summary).toContain(`Header: ${testMessage.length} bytes`);
      expect(summary).toContain('simple-lsb encoding');
      expect(summary).toContain('checksum:');
    });

    it('should compare headers correctly', () => {
      const header1 = createHeader(100, 'simple-lsb');
      const header2 = createHeader(100, 'simple-lsb');
      const header3 = createHeader(200, 'simple-lsb');

      expect(headersEqual(header1, header2)).toBe(true);
      expect(headersEqual(header1, header3)).toBe(false);
    });

    it('should detect differences in all header fields', () => {
      const base = createHeader(100, 'simple-lsb');

      const different = [
        { ...base, magicSignature: base.magicSignature + 1 },
        { ...base, version: base.version + 1 },
        { ...base, messageLength: base.messageLength + 1 },
        { ...base, checksum: base.checksum + 1 },
        { ...base, encodingMethod: 'triple-redundancy' as const },
        { ...base, reserved: base.reserved + 1 },
      ];

      different.forEach(modified => {
        expect(headersEqual(base, modified)).toBe(false);
      });
    });
  });

  describe('error handling edge cases', () => {
    it('should handle unknown encoding method in deserialization', () => {
      const header = createHeader(100, 'simple-lsb');
      const bits = serializeHeader(header);

      // Set invalid encoding method value (255)
      const methodOffset = 112;
      for (let i = 0; i < 8; i++) {
        bits[methodOffset + i] = 1; // Set all bits to 1 (value 255)
      }

      expect(() => deserializeHeader(bits)).toThrow('Invalid encoding method value: 255');
    });

    it('should handle unknown encoding method in serialization', () => {
      const header = createHeader(100, 'simple-lsb');
      header.encodingMethod = 'unknown-method' as any;

      expect(() => serializeHeader(header)).toThrow('Unsupported encoding method: unknown-method');
    });

    it('should handle large values correctly', () => {
      const header = createHeader(100, 'simple-lsb');
      header.messageLength = 0xffffffff; // Max 32-bit value

      // Should not throw error for valid large values
      expect(() => serializeHeader(header)).not.toThrow();
    });
  });
});
