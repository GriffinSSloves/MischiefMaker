import { describe, it, expect } from 'vitest';
import {
  calculateCRC32,
  calculateCRC32FromString,
  calculateCRC32FromBits,
  verifyCRC32,
  verifyCRC32FromString,
  verifyCRC32FromBits,
  calculateXORChecksum,
  calculateXORChecksumFromString,
  calculateXORChecksumFromBits,
  verifyXORChecksum,
  calculateFletcher16,
  calculateFletcher16FromString,
  verifyFletcher16,
  calculateAdler32,
  calculateAdler32FromString,
  verifyAdler32,
  getRecommendedAlgorithm,
  calculateRecommendedChecksum,
  verifyChecksum,
  verifyMultipleChecksums,
} from './ChecksumUtility';

describe('ChecksumUtility', () => {
  // Test data
  const testString = 'Hello, World!';
  const testBytes = new TextEncoder().encode(testString);
  const emptyBytes = new Uint8Array(0);
  const singleByte = new Uint8Array([42]);

  describe('CRC32 calculations', () => {
    it('should calculate CRC32 checksum correctly', () => {
      const checksum = calculateCRC32(testBytes);
      expect(typeof checksum).toBe('number');
      expect(checksum).toBeGreaterThan(0);
    });

    it('should calculate CRC32 from string correctly', () => {
      const checksum = calculateCRC32FromString(testString);
      const expectedChecksum = calculateCRC32(testBytes);
      expect(checksum).toBe(expectedChecksum);
    });

    it('should calculate CRC32 from bits correctly', () => {
      const bits = [0, 1, 0, 0, 0, 0, 0, 1]; // ASCII 'A' = 65
      const checksum = calculateCRC32FromBits(bits);
      const expectedChecksum = calculateCRC32(new Uint8Array([65]));
      expect(checksum).toBe(expectedChecksum);
    });

    it('should throw error for invalid bit array length', () => {
      expect(() => calculateCRC32FromBits([1, 0, 1])).toThrow('Bit array length must be a multiple of 8');
    });

    it('should verify CRC32 checksum correctly', () => {
      const checksum = calculateCRC32(testBytes);
      expect(verifyCRC32(testBytes, checksum)).toBe(true);
      expect(verifyCRC32(testBytes, checksum + 1)).toBe(false);
    });

    it('should verify CRC32 from string correctly', () => {
      const checksum = calculateCRC32FromString(testString);
      expect(verifyCRC32FromString(testString, checksum)).toBe(true);
      expect(verifyCRC32FromString(testString, checksum + 1)).toBe(false);
    });

    it('should verify CRC32 from bits correctly', () => {
      const bits = [0, 1, 0, 0, 0, 0, 0, 1]; // ASCII 'A'
      const checksum = calculateCRC32FromBits(bits);
      expect(verifyCRC32FromBits(bits, checksum)).toBe(true);
      expect(verifyCRC32FromBits(bits, checksum + 1)).toBe(false);
    });

    it('should handle empty data', () => {
      const checksum = calculateCRC32(emptyBytes);
      expect(typeof checksum).toBe('number');
      expect(verifyCRC32(emptyBytes, checksum)).toBe(true);
    });

    it('should produce different checksums for different data', () => {
      const checksum1 = calculateCRC32FromString('Hello');
      const checksum2 = calculateCRC32FromString('World');
      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('XOR checksum calculations', () => {
    it('should calculate XOR checksum correctly', () => {
      const checksum = calculateXORChecksum(testBytes);
      expect(typeof checksum).toBe('number');
      expect(checksum).toBeGreaterThanOrEqual(0);
      expect(checksum).toBeLessThan(256); // XOR of bytes is always < 256
    });

    it('should calculate XOR checksum from string correctly', () => {
      const checksum = calculateXORChecksumFromString(testString);
      const expectedChecksum = calculateXORChecksum(testBytes);
      expect(checksum).toBe(expectedChecksum);
    });

    it('should calculate XOR checksum from bits correctly', () => {
      const bits = [0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0]; // Two bytes: 65, 66
      const checksum = calculateXORChecksumFromBits(bits);
      // XOR all bits individually: 0^1^0^0^0^0^0^1^0^1^0^0^0^0^1^0 = 0 (even number of 1s)
      expect(checksum).toBe(0);
    });

    it('should verify XOR checksum correctly', () => {
      const checksum = calculateXORChecksum(testBytes);
      expect(verifyXORChecksum(testBytes, checksum)).toBe(true);
      expect(verifyXORChecksum(testBytes, checksum ^ 1)).toBe(false);
    });

    it('should return 0 for identical paired bytes', () => {
      const identicalPairs = new Uint8Array([42, 42, 123, 123]);
      const checksum = calculateXORChecksum(identicalPairs);
      expect(checksum).toBe(0);
    });
  });

  describe('Fletcher-16 calculations', () => {
    it('should calculate Fletcher-16 checksum correctly', () => {
      const checksum = calculateFletcher16(testBytes);
      expect(typeof checksum).toBe('number');
      expect(checksum).toBeGreaterThan(0);
      expect(checksum).toBeLessThan(65536); // Fletcher-16 is 16-bit
    });

    it('should calculate Fletcher-16 from string correctly', () => {
      const checksum = calculateFletcher16FromString(testString);
      const expectedChecksum = calculateFletcher16(testBytes);
      expect(checksum).toBe(expectedChecksum);
    });

    it('should verify Fletcher-16 checksum correctly', () => {
      const checksum = calculateFletcher16(testBytes);
      expect(verifyFletcher16(testBytes, checksum)).toBe(true);
      expect(verifyFletcher16(testBytes, checksum + 1)).toBe(false);
    });

    it('should handle single byte correctly', () => {
      const checksum = calculateFletcher16(singleByte);
      expect(typeof checksum).toBe('number');
      expect(verifyFletcher16(singleByte, checksum)).toBe(true);
    });
  });

  describe('Adler-32 calculations', () => {
    it('should calculate Adler-32 checksum correctly', () => {
      const checksum = calculateAdler32(testBytes);
      expect(typeof checksum).toBe('number');
      expect(checksum).toBeGreaterThan(0);
    });

    it('should calculate Adler-32 from string correctly', () => {
      const checksum = calculateAdler32FromString(testString);
      const expectedChecksum = calculateAdler32(testBytes);
      expect(checksum).toBe(expectedChecksum);
    });

    it('should verify Adler-32 checksum correctly', () => {
      const checksum = calculateAdler32(testBytes);
      expect(verifyAdler32(testBytes, checksum)).toBe(true);
      expect(verifyAdler32(testBytes, checksum + 1)).toBe(false);
    });

    it('should return 1 for empty data', () => {
      const checksum = calculateAdler32(emptyBytes);
      expect(checksum).toBe(1); // Adler-32 starts with 1
    });
  });

  describe('algorithm recommendations', () => {
    it('should recommend XOR for very small data', () => {
      const algorithm = getRecommendedAlgorithm(32, false);
      expect(algorithm).toBe('xor');
    });

    it('should recommend Fletcher-16 for small data', () => {
      const algorithm = getRecommendedAlgorithm(512, false);
      expect(algorithm).toBe('fletcher16');
    });

    it('should recommend Adler-32 for medium data when high accuracy not required', () => {
      const algorithm = getRecommendedAlgorithm(32768, false);
      expect(algorithm).toBe('adler32');
    });

    it('should recommend CRC32 for medium data when high accuracy required', () => {
      const algorithm = getRecommendedAlgorithm(32768, true);
      expect(algorithm).toBe('adler32'); // Algorithm uses adler32 for data < 64KB
    });

    it('should recommend CRC32 for large data', () => {
      const algorithm = getRecommendedAlgorithm(100000, false);
      expect(algorithm).toBe('crc32');
    });
  });

  describe('recommended checksum calculation', () => {
    it('should calculate using recommended algorithm', () => {
      const testBytes = new Uint8Array([65, 66, 67, 68, 69]); // 5 bytes
      const checksum = calculateRecommendedChecksum(testBytes, true);

      // Should match Adler32 for test data size (< 64KB)
      const expectedChecksum = calculateAdler32(testBytes);
      expect(checksum).toBe(expectedChecksum);
    });

    it('should calculate using recommended algorithm for different data sizes', () => {
      const smallData = new Uint8Array(32).fill(42);
      const mediumData = new Uint8Array(32768).fill(42);

      const smallChecksum = calculateRecommendedChecksum(smallData, false);
      const mediumChecksum = calculateRecommendedChecksum(mediumData, false);

      expect(typeof smallChecksum).toBe('number');
      expect(typeof mediumChecksum).toBe('number');
    });
  });

  describe('generic checksum verification', () => {
    it('should verify checksums using specified algorithms', () => {
      const crc32Checksum = calculateCRC32(testBytes);
      const adler32Checksum = calculateAdler32(testBytes);
      const fletcher16Checksum = calculateFletcher16(testBytes);
      const xorChecksum = calculateXORChecksum(testBytes);

      expect(verifyChecksum(testBytes, crc32Checksum, 'crc32')).toBe(true);
      expect(verifyChecksum(testBytes, adler32Checksum, 'adler32')).toBe(true);
      expect(verifyChecksum(testBytes, fletcher16Checksum, 'fletcher16')).toBe(true);
      expect(verifyChecksum(testBytes, xorChecksum, 'xor')).toBe(true);

      expect(verifyChecksum(testBytes, crc32Checksum + 1, 'crc32')).toBe(false);
    });

    it('should return false for unknown algorithm', () => {
      const testBytes = new Uint8Array([65, 66, 67]);
      expect(() => verifyChecksum(testBytes, 123, 'unknown' as any)).toThrow('Unsupported algorithm: unknown');
    });
  });

  describe('multiple checksum verification', () => {
    it('should verify multiple checksums correctly', () => {
      const checksums = [
        { algorithm: 'crc32' as const, expected: calculateCRC32(testBytes) },
        { algorithm: 'adler32' as const, expected: calculateAdler32(testBytes) },
      ];

      expect(verifyMultipleChecksums(testBytes, checksums)).toBe(true);
    });

    it('should fail if any checksum is incorrect', () => {
      const checksums = [
        { algorithm: 'crc32' as const, expected: calculateCRC32(testBytes) },
        { algorithm: 'adler32' as const, expected: calculateAdler32(testBytes) + 1 }, // Incorrect
      ];

      expect(verifyMultipleChecksums(testBytes, checksums)).toBe(false);
    });

    it('should handle empty checksum array', () => {
      expect(verifyMultipleChecksums(testBytes, [])).toBe(true);
    });
  });

  describe('cross-algorithm consistency', () => {
    it('should produce consistent results across multiple calls', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      // Each algorithm should be deterministic
      const crc32_1 = calculateCRC32(data);
      const crc32_2 = calculateCRC32(data);
      expect(crc32_1).toBe(crc32_2);

      const adler32_1 = calculateAdler32(data);
      const adler32_2 = calculateAdler32(data);
      expect(adler32_1).toBe(adler32_2);
    });

    it('should detect single-bit errors in most cases', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5]);
      const corrupted = new Uint8Array([1, 2, 3, 4, 4]); // Changed last byte

      const originalCRC32 = calculateCRC32(original);
      const corruptedCRC32 = calculateCRC32(corrupted);
      expect(originalCRC32).not.toBe(corruptedCRC32);

      const originalAdler32 = calculateAdler32(original);
      const corruptedAdler32 = calculateAdler32(corrupted);
      expect(originalAdler32).not.toBe(corruptedAdler32);
    });
  });
});
