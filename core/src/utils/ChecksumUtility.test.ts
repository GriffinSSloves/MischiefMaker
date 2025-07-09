import { describe, it, expect } from 'vitest';
import { ChecksumUtility } from './ChecksumUtility';

describe('ChecksumUtility', () => {
  // Test data
  const testString = 'Hello, World!';
  const testBytes = new TextEncoder().encode(testString);
  const emptyBytes = new Uint8Array(0);
  const singleByte = new Uint8Array([42]);

  describe('CRC32 calculations', () => {
    it('should calculate CRC32 checksum correctly', () => {
      const checksum = ChecksumUtility.calculateCRC32(testBytes);
      expect(typeof checksum).toBe('number');
      expect(checksum).toBeGreaterThan(0);
    });

    it('should calculate CRC32 from string correctly', () => {
      const checksum = ChecksumUtility.calculateCRC32FromString(testString);
      const expectedChecksum = ChecksumUtility.calculateCRC32(testBytes);
      expect(checksum).toBe(expectedChecksum);
    });

    it('should calculate CRC32 from bits correctly', () => {
      const bits = [0, 1, 0, 0, 0, 0, 0, 1]; // ASCII 'A' = 65
      const checksum = ChecksumUtility.calculateCRC32FromBits(bits);
      const expectedChecksum = ChecksumUtility.calculateCRC32(new Uint8Array([65]));
      expect(checksum).toBe(expectedChecksum);
    });

    it('should throw error for invalid bit array length', () => {
      expect(() => ChecksumUtility.calculateCRC32FromBits([1, 0, 1])).toThrow(
        'Bit array length must be a multiple of 8'
      );
    });

    it('should verify CRC32 checksum correctly', () => {
      const checksum = ChecksumUtility.calculateCRC32(testBytes);
      expect(ChecksumUtility.verifyCRC32(testBytes, checksum)).toBe(true);
      expect(ChecksumUtility.verifyCRC32(testBytes, checksum + 1)).toBe(false);
    });

    it('should verify CRC32 from string correctly', () => {
      const checksum = ChecksumUtility.calculateCRC32FromString(testString);
      expect(ChecksumUtility.verifyCRC32FromString(testString, checksum)).toBe(true);
      expect(ChecksumUtility.verifyCRC32FromString(testString, checksum + 1)).toBe(false);
    });

    it('should verify CRC32 from bits correctly', () => {
      const bits = [0, 1, 0, 0, 0, 0, 0, 1]; // ASCII 'A'
      const checksum = ChecksumUtility.calculateCRC32FromBits(bits);
      expect(ChecksumUtility.verifyCRC32FromBits(bits, checksum)).toBe(true);
      expect(ChecksumUtility.verifyCRC32FromBits(bits, checksum + 1)).toBe(false);
    });

    it('should handle empty data', () => {
      const checksum = ChecksumUtility.calculateCRC32(emptyBytes);
      expect(typeof checksum).toBe('number');
      expect(ChecksumUtility.verifyCRC32(emptyBytes, checksum)).toBe(true);
    });

    it('should produce different checksums for different data', () => {
      const checksum1 = ChecksumUtility.calculateCRC32FromString('Hello');
      const checksum2 = ChecksumUtility.calculateCRC32FromString('World');
      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('XOR checksum calculations', () => {
    it('should calculate XOR checksum correctly', () => {
      const checksum = ChecksumUtility.calculateXORChecksum(testBytes);
      expect(typeof checksum).toBe('number');
      expect(checksum).toBeGreaterThanOrEqual(0);
      expect(checksum).toBeLessThan(256); // XOR of bytes is always < 256
    });

    it('should calculate XOR checksum from string correctly', () => {
      const checksum = ChecksumUtility.calculateXORChecksumFromString(testString);
      const expectedChecksum = ChecksumUtility.calculateXORChecksum(testBytes);
      expect(checksum).toBe(expectedChecksum);
    });

    it('should calculate XOR checksum from bits correctly', () => {
      const bits = [0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0]; // Two bytes: 65, 66
      const checksum = ChecksumUtility.calculateXORChecksumFromBits(bits);
      expect(checksum).toBe(65 ^ 66); // XOR of the two bytes
    });

    it('should verify XOR checksum correctly', () => {
      const checksum = ChecksumUtility.calculateXORChecksum(testBytes);
      expect(ChecksumUtility.verifyXORChecksum(testBytes, checksum)).toBe(true);
      expect(ChecksumUtility.verifyXORChecksum(testBytes, checksum ^ 1)).toBe(false);
    });

    it('should return 0 for identical paired bytes', () => {
      const identicalPairs = new Uint8Array([42, 42, 123, 123]);
      const checksum = ChecksumUtility.calculateXORChecksum(identicalPairs);
      expect(checksum).toBe(0);
    });
  });

  describe('Fletcher-16 calculations', () => {
    it('should calculate Fletcher-16 checksum correctly', () => {
      const checksum = ChecksumUtility.calculateFletcher16(testBytes);
      expect(typeof checksum).toBe('number');
      expect(checksum).toBeGreaterThan(0);
      expect(checksum).toBeLessThan(65536); // Fletcher-16 is 16-bit
    });

    it('should calculate Fletcher-16 from string correctly', () => {
      const checksum = ChecksumUtility.calculateFletcher16FromString(testString);
      const expectedChecksum = ChecksumUtility.calculateFletcher16(testBytes);
      expect(checksum).toBe(expectedChecksum);
    });

    it('should verify Fletcher-16 checksum correctly', () => {
      const checksum = ChecksumUtility.calculateFletcher16(testBytes);
      expect(ChecksumUtility.verifyFletcher16(testBytes, checksum)).toBe(true);
      expect(ChecksumUtility.verifyFletcher16(testBytes, checksum + 1)).toBe(false);
    });

    it('should handle single byte correctly', () => {
      const checksum = ChecksumUtility.calculateFletcher16(singleByte);
      expect(typeof checksum).toBe('number');
      expect(ChecksumUtility.verifyFletcher16(singleByte, checksum)).toBe(true);
    });
  });

  describe('Adler-32 calculations', () => {
    it('should calculate Adler-32 checksum correctly', () => {
      const checksum = ChecksumUtility.calculateAdler32(testBytes);
      expect(typeof checksum).toBe('number');
      expect(checksum).toBeGreaterThan(0);
    });

    it('should calculate Adler-32 from string correctly', () => {
      const checksum = ChecksumUtility.calculateAdler32FromString(testString);
      const expectedChecksum = ChecksumUtility.calculateAdler32(testBytes);
      expect(checksum).toBe(expectedChecksum);
    });

    it('should verify Adler-32 checksum correctly', () => {
      const checksum = ChecksumUtility.calculateAdler32(testBytes);
      expect(ChecksumUtility.verifyAdler32(testBytes, checksum)).toBe(true);
      expect(ChecksumUtility.verifyAdler32(testBytes, checksum + 1)).toBe(false);
    });

    it('should return 1 for empty data', () => {
      const checksum = ChecksumUtility.calculateAdler32(emptyBytes);
      expect(checksum).toBe(1); // Adler-32 starts with 1
    });
  });

  describe('algorithm recommendations', () => {
    it('should recommend XOR for very small data', () => {
      const algorithm = ChecksumUtility.getRecommendedAlgorithm(32, false);
      expect(algorithm).toBe('xor');
    });

    it('should recommend Fletcher-16 for small data', () => {
      const algorithm = ChecksumUtility.getRecommendedAlgorithm(512, false);
      expect(algorithm).toBe('fletcher16');
    });

    it('should recommend Adler-32 for medium data when high accuracy not required', () => {
      const algorithm = ChecksumUtility.getRecommendedAlgorithm(32768, false);
      expect(algorithm).toBe('adler32');
    });

    it('should recommend CRC32 for medium data when high accuracy required', () => {
      const algorithm = ChecksumUtility.getRecommendedAlgorithm(32768, true);
      expect(algorithm).toBe('crc32');
    });

    it('should recommend CRC32 for large data', () => {
      const algorithm = ChecksumUtility.getRecommendedAlgorithm(100000, false);
      expect(algorithm).toBe('crc32');
    });
  });

  describe('recommended checksum calculation', () => {
    it('should calculate using recommended algorithm', () => {
      const checksum = ChecksumUtility.calculateRecommendedChecksum(testBytes, true);
      expect(typeof checksum).toBe('number');

      // Should match CRC32 for test data size with high accuracy
      const expectedChecksum = ChecksumUtility.calculateCRC32(testBytes);
      expect(checksum).toBe(expectedChecksum);
    });

    it('should calculate using recommended algorithm for different data sizes', () => {
      const smallData = new Uint8Array(32).fill(42);
      const mediumData = new Uint8Array(32768).fill(42);

      const smallChecksum = ChecksumUtility.calculateRecommendedChecksum(smallData, false);
      const mediumChecksum = ChecksumUtility.calculateRecommendedChecksum(mediumData, false);

      expect(typeof smallChecksum).toBe('number');
      expect(typeof mediumChecksum).toBe('number');
    });
  });

  describe('generic checksum verification', () => {
    it('should verify checksums using specified algorithms', () => {
      const crc32Checksum = ChecksumUtility.calculateCRC32(testBytes);
      const adler32Checksum = ChecksumUtility.calculateAdler32(testBytes);
      const fletcher16Checksum = ChecksumUtility.calculateFletcher16(testBytes);
      const xorChecksum = ChecksumUtility.calculateXORChecksum(testBytes);

      expect(ChecksumUtility.verifyChecksum(testBytes, crc32Checksum, 'crc32')).toBe(true);
      expect(ChecksumUtility.verifyChecksum(testBytes, adler32Checksum, 'adler32')).toBe(true);
      expect(ChecksumUtility.verifyChecksum(testBytes, fletcher16Checksum, 'fletcher16')).toBe(true);
      expect(ChecksumUtility.verifyChecksum(testBytes, xorChecksum, 'xor')).toBe(true);

      expect(ChecksumUtility.verifyChecksum(testBytes, crc32Checksum + 1, 'crc32')).toBe(false);
    });

    it('should return false for unknown algorithm', () => {
      // @ts-expect-error - testing invalid algorithm
      const result = ChecksumUtility.verifyChecksum(testBytes, 12345, 'unknown');
      expect(result).toBe(false);
    });
  });

  describe('multiple checksum verification', () => {
    it('should verify multiple checksums correctly', () => {
      const checksums = [
        { algorithm: 'crc32' as const, expected: ChecksumUtility.calculateCRC32(testBytes) },
        { algorithm: 'adler32' as const, expected: ChecksumUtility.calculateAdler32(testBytes) },
      ];

      expect(ChecksumUtility.verifyMultipleChecksums(testBytes, checksums)).toBe(true);
    });

    it('should fail if any checksum is incorrect', () => {
      const checksums = [
        { algorithm: 'crc32' as const, expected: ChecksumUtility.calculateCRC32(testBytes) },
        { algorithm: 'adler32' as const, expected: ChecksumUtility.calculateAdler32(testBytes) + 1 }, // Incorrect
      ];

      expect(ChecksumUtility.verifyMultipleChecksums(testBytes, checksums)).toBe(false);
    });

    it('should handle empty checksum array', () => {
      expect(ChecksumUtility.verifyMultipleChecksums(testBytes, [])).toBe(true);
    });
  });

  describe('cross-algorithm consistency', () => {
    it('should produce consistent results across multiple calls', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      // Each algorithm should be deterministic
      expect(ChecksumUtility.calculateCRC32(data)).toBe(ChecksumUtility.calculateCRC32(data));
      expect(ChecksumUtility.calculateAdler32(data)).toBe(ChecksumUtility.calculateAdler32(data));
      expect(ChecksumUtility.calculateFletcher16(data)).toBe(ChecksumUtility.calculateFletcher16(data));
      expect(ChecksumUtility.calculateXORChecksum(data)).toBe(ChecksumUtility.calculateXORChecksum(data));
    });

    it('should detect single-bit errors in most cases', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5]);
      const corrupted = new Uint8Array([1, 2, 3, 4, 4]); // Changed last byte

      const originalCRC32 = ChecksumUtility.calculateCRC32(original);
      const corruptedCRC32 = ChecksumUtility.calculateCRC32(corrupted);
      expect(originalCRC32).not.toBe(corruptedCRC32);

      const originalAdler32 = ChecksumUtility.calculateAdler32(original);
      const corruptedAdler32 = ChecksumUtility.calculateAdler32(corrupted);
      expect(originalAdler32).not.toBe(corruptedAdler32);
    });
  });
});
