import { describe, it, expect } from 'vitest';
import { HeaderUtility } from './HeaderUtility';

describe('HeaderUtility', () => {
  // Test data
  const testMessage = new TextEncoder().encode('Hello, MischiefMaker!');
  const emptyMessage = new Uint8Array(0);

  describe('header creation', () => {
    it('should create header without message data', () => {
      const header = HeaderUtility.createHeader(100, 'simple-lsb');

      expect(header.magicSignature).toBe(0x4d534348); // "MSCH"
      expect(header.version).toBe(1);
      expect(header.messageLength).toBe(100);
      expect(header.checksum).toBe(0); // No message data provided
      expect(header.encodingMethod).toBe('simple-lsb');
      expect(header.reserved).toBe(0);
    });

    it('should create header with message data and checksum', () => {
      const header = HeaderUtility.createHeader(testMessage.length, 'triple-redundancy', testMessage);

      expect(header.messageLength).toBe(testMessage.length);
      expect(header.encodingMethod).toBe('triple-redundancy');
      expect(header.checksum).toBeGreaterThan(0);
    });

    it('should throw error for negative message length', () => {
      expect(() => HeaderUtility.createHeader(-1, 'simple-lsb')).toThrow('Message length cannot be negative');
    });

    it('should throw error for oversized message length', () => {
      expect(() => HeaderUtility.createHeader(0xffffffff + 1, 'simple-lsb')).toThrow(
        'Message length exceeds maximum supported size'
      );
    });

    it('should throw error for mismatched message data length', () => {
      expect(() => HeaderUtility.createHeader(10, 'simple-lsb', testMessage)).toThrow(
        'Message data length does not match specified length'
      );
    });

    it('should create header with automatic checksum calculation', () => {
      const header = HeaderUtility.createHeaderWithChecksum(testMessage, 'adaptive-lsb');

      expect(header.messageLength).toBe(testMessage.length);
      expect(header.encodingMethod).toBe('adaptive-lsb');
      expect(header.checksum).toBeGreaterThan(0);
    });

    it('should handle empty message data', () => {
      const header = HeaderUtility.createHeaderWithChecksum(emptyMessage, 'simple-lsb');

      expect(header.messageLength).toBe(0);
      expect(typeof header.checksum).toBe('number'); // CRC32 of empty data is a valid number
    });
  });

  describe('header serialization', () => {
    it('should serialize header to bit array correctly', () => {
      const header = HeaderUtility.createHeader(1024, 'simple-lsb');
      const bits = HeaderUtility.serializeHeader(header);

      expect(bits).toBeInstanceOf(Array);
      expect(bits.length).toBe(HeaderUtility.getHeaderSizeInBits());
      expect(bits.every(bit => bit === 0 || bit === 1)).toBe(true);
    });

    it('should produce correct bit count for header', () => {
      const expectedBits = 16 * 8; // 16 bytes total
      expect(HeaderUtility.getHeaderSizeInBits()).toBe(expectedBits);
      expect(HeaderUtility.getHeaderSizeInBytes()).toBe(16);
    });

    it('should serialize different encoding methods correctly', () => {
      const headers = [
        HeaderUtility.createHeader(100, 'simple-lsb'),
        HeaderUtility.createHeader(100, 'triple-redundancy'),
        HeaderUtility.createHeader(100, 'adaptive-lsb'),
      ];

      const serialized = headers.map(h => HeaderUtility.serializeHeader(h));

      // All should have same length
      expect(serialized.every(bits => bits.length === HeaderUtility.getHeaderSizeInBits())).toBe(true);

      // But different content (at least in encoding method bits)
      expect(serialized[0]).not.toEqual(serialized[1]);
      expect(serialized[1]).not.toEqual(serialized[2]);
    });
  });

  describe('header deserialization', () => {
    it('should deserialize header correctly', () => {
      const originalHeader = HeaderUtility.createHeaderWithChecksum(testMessage, 'triple-redundancy');
      const bits = HeaderUtility.serializeHeader(originalHeader);
      const deserializedHeader = HeaderUtility.deserializeHeader(bits);

      expect(HeaderUtility.headersEqual(originalHeader, deserializedHeader)).toBe(true);
    });

    it('should be bidirectional (serialize -> deserialize -> equal)', () => {
      const testCases = [
        { length: 0, method: 'simple-lsb' as const },
        { length: 1, method: 'triple-redundancy' as const },
        { length: 1024, method: 'adaptive-lsb' as const },
        { length: 0x7fffffff, method: 'simple-lsb' as const }, // Use safe integer value
      ];

      testCases.forEach(({ length, method }) => {
        const original = HeaderUtility.createHeader(length, method);
        const bits = HeaderUtility.serializeHeader(original);
        const deserialized = HeaderUtility.deserializeHeader(bits);

        expect(HeaderUtility.headersEqual(original, deserialized)).toBe(true);
      });
    });

    it('should throw error for invalid bit array length', () => {
      const shortBits = new Array(64).fill(0); // Too short
      expect(() => HeaderUtility.deserializeHeader(shortBits)).toThrow('Invalid header size');

      const longBits = new Array(256).fill(0); // Too long
      expect(() => HeaderUtility.deserializeHeader(longBits)).toThrow('Invalid header size');
    });

    it('should handle all encoding method values', () => {
      const methods: Array<'simple-lsb' | 'triple-redundancy' | 'adaptive-lsb'> = [
        'simple-lsb',
        'triple-redundancy',
        'adaptive-lsb',
      ];

      methods.forEach(method => {
        const header = HeaderUtility.createHeader(100, method);
        const bits = HeaderUtility.serializeHeader(header);
        const deserialized = HeaderUtility.deserializeHeader(bits);

        expect(deserialized.encodingMethod).toBe(method);
      });
    });
  });

  describe('header validation', () => {
    it('should validate correct header', () => {
      const header = HeaderUtility.createHeader(100, 'simple-lsb');
      const validation = HeaderUtility.validateHeader(header);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid magic signature', () => {
      const header = HeaderUtility.createHeader(100, 'simple-lsb');
      header.magicSignature = 0x12345678; // Wrong magic

      const validation = HeaderUtility.validateHeader(header);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid magic signature'))).toBe(true);
    });

    it('should detect unsupported version', () => {
      const header = HeaderUtility.createHeader(100, 'simple-lsb');
      header.version = 999; // Future version

      const validation = HeaderUtility.validateHeader(header);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Unsupported version'))).toBe(true);
    });

    it('should detect invalid version', () => {
      const header = HeaderUtility.createHeader(100, 'simple-lsb');
      header.version = 0; // Invalid version

      const validation = HeaderUtility.validateHeader(header);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid version'))).toBe(true);
    });

    it('should detect invalid message length', () => {
      const header = HeaderUtility.createHeader(100, 'simple-lsb');
      header.messageLength = -1; // Negative length

      const validation = HeaderUtility.validateHeader(header);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid message length'))).toBe(true);
    });

    it('should detect oversized message length', () => {
      const header = HeaderUtility.createHeader(100, 'simple-lsb');
      header.messageLength = 0xffffffff + 1; // Too large

      const validation = HeaderUtility.validateHeader(header);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Message length too large'))).toBe(true);
    });

    it('should detect invalid encoding method', () => {
      const header = HeaderUtility.createHeader(100, 'simple-lsb');
      // @ts-expect-error - testing invalid encoding method
      header.encodingMethod = 'invalid-method';

      const validation = HeaderUtility.validateHeader(header);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid encoding method'))).toBe(true);
    });

    it('should accumulate multiple errors', () => {
      const header = HeaderUtility.createHeader(100, 'simple-lsb');
      header.magicSignature = 0x12345678; // Wrong
      header.version = 0; // Invalid
      header.messageLength = -1; // Invalid

      const validation = HeaderUtility.validateHeader(header);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(1);
    });
  });

  describe('message integrity verification', () => {
    it('should verify correct message integrity', () => {
      const header = HeaderUtility.createHeaderWithChecksum(testMessage, 'simple-lsb');
      const isValid = HeaderUtility.verifyMessageIntegrity(header, testMessage);

      expect(isValid).toBe(true);
    });

    it('should detect corrupted message data', () => {
      const header = HeaderUtility.createHeaderWithChecksum(testMessage, 'simple-lsb');
      const corruptedMessage = new Uint8Array(testMessage);
      corruptedMessage[0] = corruptedMessage[0] ^ 1; // Flip one bit

      const isValid = HeaderUtility.verifyMessageIntegrity(header, corruptedMessage);
      expect(isValid).toBe(false);
    });

    it('should detect wrong message length', () => {
      const header = HeaderUtility.createHeaderWithChecksum(testMessage, 'simple-lsb');
      const shorterMessage = testMessage.slice(0, -1);

      const isValid = HeaderUtility.verifyMessageIntegrity(header, shorterMessage);
      expect(isValid).toBe(false);
    });

    it('should handle empty message verification', () => {
      const header = HeaderUtility.createHeaderWithChecksum(emptyMessage, 'simple-lsb');
      const isValid = HeaderUtility.verifyMessageIntegrity(header, emptyMessage);

      expect(isValid).toBe(true);
    });
  });

  describe('parse and validate combined', () => {
    it('should parse and validate correct header', () => {
      const originalHeader = HeaderUtility.createHeader(1024, 'triple-redundancy');
      const bits = HeaderUtility.serializeHeader(originalHeader);
      const result = HeaderUtility.parseAndValidateHeader(bits);

      expect(result.isValid).toBe(true);
      expect(result.header).toBeDefined();
      expect(result.errors).toHaveLength(0);
      expect(HeaderUtility.headersEqual(originalHeader, result.header!)).toBe(true);
    });

    it('should handle parsing errors gracefully', () => {
      const invalidBits = new Array(64).fill(0); // Wrong size
      const result = HeaderUtility.parseAndValidateHeader(invalidBits);

      expect(result.isValid).toBe(false);
      expect(result.header).toBeUndefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle validation errors after successful parsing', () => {
      const header = HeaderUtility.createHeader(100, 'simple-lsb');
      header.magicSignature = 0x12345678; // Invalid magic
      const bits = HeaderUtility.serializeHeader(header);
      const result = HeaderUtility.parseAndValidateHeader(bits);

      expect(result.isValid).toBe(false);
      expect(result.header).toBeUndefined();
      expect(result.errors.some(e => e.includes('Invalid magic signature'))).toBe(true);
    });
  });

  describe('header overhead calculation', () => {
    it('should calculate correct overhead for different encoding methods', () => {
      const baseBits = HeaderUtility.getHeaderSizeInBits();

      expect(HeaderUtility.calculateHeaderOverhead('simple-lsb')).toBe(baseBits);
      expect(HeaderUtility.calculateHeaderOverhead('triple-redundancy')).toBe(baseBits * 3);
      expect(HeaderUtility.calculateHeaderOverhead('adaptive-lsb')).toBe(baseBits);
    });
  });

  describe('header summary and comparison', () => {
    it('should generate human-readable summary', () => {
      const header = HeaderUtility.createHeaderWithChecksum(testMessage, 'simple-lsb');
      const summary = HeaderUtility.summarizeHeader(header);

      expect(summary).toContain('MischiefMaker Header v1');
      expect(summary).toContain(`Message Length: ${testMessage.length} bytes`);
      expect(summary).toContain('Encoding Method: simple-lsb');
      expect(summary).toContain('Checksum: 0x');
      expect(summary).toContain('Magic: 0x4D534348');
    });

    it('should compare headers correctly', () => {
      const header1 = HeaderUtility.createHeader(100, 'simple-lsb');
      const header2 = HeaderUtility.createHeader(100, 'simple-lsb');
      const header3 = HeaderUtility.createHeader(200, 'simple-lsb');

      expect(HeaderUtility.headersEqual(header1, header2)).toBe(true);
      expect(HeaderUtility.headersEqual(header1, header3)).toBe(false);
    });

    it('should detect differences in all header fields', () => {
      const base = HeaderUtility.createHeader(100, 'simple-lsb');

      const different = [
        { ...base, magicSignature: base.magicSignature + 1 },
        { ...base, version: base.version + 1 },
        { ...base, messageLength: base.messageLength + 1 },
        { ...base, checksum: base.checksum + 1 },
        { ...base, encodingMethod: 'triple-redundancy' as const },
        { ...base, reserved: base.reserved + 1 },
      ];

      different.forEach(modified => {
        expect(HeaderUtility.headersEqual(base, modified)).toBe(false);
      });
    });
  });

  describe('error handling edge cases', () => {
    it('should handle unknown encoding method in deserialization', () => {
      const header = HeaderUtility.createHeader(100, 'simple-lsb');
      const bits = HeaderUtility.serializeHeader(header);

      // Manually corrupt the encoding method bits to an invalid value
      const methodOffset = 32 + 16 + 32 + 32; // After magic, version, length, checksum
      for (let i = 0; i < 8; i++) {
        bits[methodOffset + i] = 1; // Set to 255 (invalid method)
      }

      expect(() => HeaderUtility.deserializeHeader(bits)).toThrow('Unknown encoding method value');
    });

    it('should handle unknown encoding method in serialization', () => {
      const header = HeaderUtility.createHeader(100, 'simple-lsb');
      // @ts-expect-error - testing unknown method
      header.encodingMethod = 'unknown-method';

      expect(() => HeaderUtility.serializeHeader(header)).toThrow('Unknown encoding method');
    });

    it('should handle large values correctly', () => {
      const largeHeader = HeaderUtility.createHeader(0x7fffffff, 'adaptive-lsb'); // Use safe integer
      const bits = HeaderUtility.serializeHeader(largeHeader);
      const deserialized = HeaderUtility.deserializeHeader(bits);

      expect(deserialized.messageLength).toBe(0x7fffffff);
      expect(HeaderUtility.headersEqual(largeHeader, deserialized)).toBe(true);
    });
  });
});
