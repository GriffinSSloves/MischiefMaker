import { BitOperations } from '../BitOperations/BitOperations';
import { CAPACITY_CONSTANTS } from '../../types/Constants';

/**
 * Utility class for calculating and verifying checksums in steganography operations
 * Supports multiple checksum algorithms for data integrity verification
 */
export class ChecksumUtility {
  /**
   * Calculate CRC32 checksum for data integrity
   * Uses standard CRC32 polynomial for compatibility
   */
  static calculateCRC32(data: Uint8Array): number {
    const CRC32_POLYNOMIAL = 0xedb88320;
    let crc = 0xffffffff;

    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? CRC32_POLYNOMIAL : 0);
      }
    }

    return (crc ^ 0xffffffff) >>> 0; // Ensure unsigned 32-bit result
  }

  /**
   * Calculate CRC32 checksum from a string
   */
  static calculateCRC32FromString(text: string): number {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    return this.calculateCRC32(data);
  }

  /**
   * Calculate CRC32 checksum from bit array
   */
  static calculateCRC32FromBits(bits: number[]): number {
    if (bits.length % CAPACITY_CONSTANTS.BITS_PER_BYTE !== 0) {
      throw new Error('Bit array length must be a multiple of 8');
    }

    const bytes = new Uint8Array(bits.length / CAPACITY_CONSTANTS.BITS_PER_BYTE);
    for (let i = 0; i < bytes.length; i++) {
      const bitOffset = i * CAPACITY_CONSTANTS.BITS_PER_BYTE;
      const byteBits = bits.slice(bitOffset, bitOffset + CAPACITY_CONSTANTS.BITS_PER_BYTE);
      bytes[i] = BitOperations.bitsToNumber(byteBits);
    }

    return this.calculateCRC32(bytes);
  }

  /**
   * Verify CRC32 checksum matches expected value
   */
  static verifyCRC32(data: Uint8Array, expectedChecksum: number): boolean {
    const actualChecksum = this.calculateCRC32(data);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Verify CRC32 checksum from string
   */
  static verifyCRC32FromString(text: string, expectedChecksum: number): boolean {
    const actualChecksum = this.calculateCRC32FromString(text);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Verify CRC32 checksum from bit array
   */
  static verifyCRC32FromBits(bits: number[], expectedChecksum: number): boolean {
    const actualChecksum = this.calculateCRC32FromBits(bits);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Calculate simple XOR checksum (faster but less robust than CRC32)
   * Useful for quick integrity checks or when CRC32 is too expensive
   */
  static calculateXORChecksum(data: Uint8Array): number {
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
      checksum ^= data[i];
    }
    return checksum;
  }

  /**
   * Calculate XOR checksum from string
   */
  static calculateXORChecksumFromString(text: string): number {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    return this.calculateXORChecksum(data);
  }

  /**
   * Calculate XOR checksum from bit array
   */
  static calculateXORChecksumFromBits(bits: number[]): number {
    return BitOperations.calculateSimpleChecksum(bits);
  }

  /**
   * Verify XOR checksum matches expected value
   */
  static verifyXORChecksum(data: Uint8Array, expectedChecksum: number): boolean {
    const actualChecksum = this.calculateXORChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Calculate Fletcher-16 checksum (good balance of speed and error detection)
   * Detects all single-bit errors and most double-bit errors
   */
  static calculateFletcher16(data: Uint8Array): number {
    let sum1 = 0;
    let sum2 = 0;

    for (let i = 0; i < data.length; i++) {
      sum1 = (sum1 + data[i]) % 255;
      sum2 = (sum2 + sum1) % 255;
    }

    return (sum2 << 8) | sum1;
  }

  /**
   * Calculate Fletcher-16 checksum from string
   */
  static calculateFletcher16FromString(text: string): number {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    return this.calculateFletcher16(data);
  }

  /**
   * Verify Fletcher-16 checksum matches expected value
   */
  static verifyFletcher16(data: Uint8Array, expectedChecksum: number): boolean {
    const actualChecksum = this.calculateFletcher16(data);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Calculate Adler-32 checksum (used by zlib)
   * Faster than CRC32 but still provides good error detection
   */
  static calculateAdler32(data: Uint8Array): number {
    const MOD_ADLER = 65521;
    let a = 1;
    let b = 0;

    for (let i = 0; i < data.length; i++) {
      a = (a + data[i]) % MOD_ADLER;
      b = (b + a) % MOD_ADLER;
    }

    return (b << 16) | a;
  }

  /**
   * Calculate Adler-32 checksum from string
   */
  static calculateAdler32FromString(text: string): number {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    return this.calculateAdler32(data);
  }

  /**
   * Verify Adler-32 checksum matches expected value
   */
  static verifyAdler32(data: Uint8Array, expectedChecksum: number): boolean {
    const actualChecksum = this.calculateAdler32(data);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Get the appropriate checksum algorithm based on data size and requirements
   * Recommends the best checksum algorithm for the given context
   */
  static getRecommendedAlgorithm(
    dataSize: number,
    requiresHighAccuracy: boolean = true
  ): 'crc32' | 'adler32' | 'fletcher16' | 'xor' {
    // For very small data (< 64 bytes), XOR is sufficient
    if (dataSize < 64 && !requiresHighAccuracy) {
      return 'xor';
    }

    // For small to medium data (< 1KB), Fletcher-16 provides good balance
    if (dataSize < 1024 && !requiresHighAccuracy) {
      return 'fletcher16';
    }

    // For medium data (< 64KB), Adler-32 is faster than CRC32 with good detection
    if (dataSize < 65536) {
      return requiresHighAccuracy ? 'crc32' : 'adler32';
    }

    // For large data, CRC32 provides the best error detection
    return 'crc32';
  }

  /**
   * Calculate checksum using the recommended algorithm
   */
  static calculateRecommendedChecksum(data: Uint8Array, requiresHighAccuracy: boolean = true): number {
    const algorithm = this.getRecommendedAlgorithm(data.length, requiresHighAccuracy);

    switch (algorithm) {
      case 'crc32':
        return this.calculateCRC32(data);
      case 'adler32':
        return this.calculateAdler32(data);
      case 'fletcher16':
        return this.calculateFletcher16(data);
      case 'xor':
        return this.calculateXORChecksum(data);
      default:
        return this.calculateCRC32(data); // Default fallback
    }
  }

  /**
   * Verify checksum using the specified algorithm
   */
  static verifyChecksum(
    data: Uint8Array,
    expectedChecksum: number,
    algorithm: 'crc32' | 'adler32' | 'fletcher16' | 'xor'
  ): boolean {
    switch (algorithm) {
      case 'crc32':
        return this.verifyCRC32(data, expectedChecksum);
      case 'adler32':
        return this.verifyAdler32(data, expectedChecksum);
      case 'fletcher16':
        return this.verifyFletcher16(data, expectedChecksum);
      case 'xor':
        return this.verifyXORChecksum(data, expectedChecksum);
      default:
        return false;
    }
  }

  /**
   * Calculate and compare multiple checksums for enhanced validation
   * Returns true only if all specified algorithms agree
   */
  static verifyMultipleChecksums(
    data: Uint8Array,
    checksums: { algorithm: 'crc32' | 'adler32' | 'fletcher16' | 'xor'; expected: number }[]
  ): boolean {
    return checksums.every(({ algorithm, expected }) => this.verifyChecksum(data, expected, algorithm));
  }
}
