import { describe, it, expect } from 'vitest';
import {
  extractLSB,
  setLSB,
  extractLSBs,
  setLSBs,
  byteToBits,
  bitsToByte,
  stringToBits,
  bitsToString,
  numberToBits,
  bitsToNumber,
  createBitOperation,
  applyTripleRedundancy,
  decodeTripleRedundancy,
  calculateCorruptionRate,
  isValidBit,
  areValidBits,
  xorBits,
  calculateSimpleChecksum,
} from './BitOperations';

describe('BitOperations', () => {
  describe('LSB operations', () => {
    it('should extract LSB correctly', () => {
      expect(extractLSB(0b10101010)).toBe(0);
      expect(extractLSB(0b10101011)).toBe(1);
      expect(extractLSB(255)).toBe(1);
      expect(extractLSB(254)).toBe(0);
    });

    it('should set LSB correctly', () => {
      expect(setLSB(0b10101010, 1)).toBe(0b10101011);
      expect(setLSB(0b10101011, 0)).toBe(0b10101010);
      expect(setLSB(254, 1)).toBe(255);
      expect(setLSB(255, 0)).toBe(254);
    });

    it('should handle multiple LSBs', () => {
      // Extract 2 LSBs
      expect(extractLSBs(0b10101010, 2)).toBe(0b10); // Last 2 bits
      expect(extractLSBs(0b10101011, 3)).toBe(0b011); // Last 3 bits

      // Set 2 LSBs
      expect(setLSBs(0b10101000, 0b11, 2)).toBe(0b10101011);
      expect(setLSBs(0b10101111, 0b00, 2)).toBe(0b10101100);
    });
  });

  describe('bit array conversions', () => {
    it('should convert byte to bits correctly', () => {
      expect(byteToBits(0b10101010)).toEqual([1, 0, 1, 0, 1, 0, 1, 0]);
      expect(byteToBits(0b11110000)).toEqual([1, 1, 1, 1, 0, 0, 0, 0]);
      expect(byteToBits(255)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
      expect(byteToBits(0)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    });

    it('should convert bits to byte correctly', () => {
      expect(bitsToByte([1, 0, 1, 0, 1, 0, 1, 0])).toBe(0b10101010);
      expect(bitsToByte([1, 1, 1, 1, 0, 0, 0, 0])).toBe(0b11110000);
      expect(bitsToByte([1, 1, 1, 1, 1, 1, 1, 1])).toBe(255);
      expect(bitsToByte([0, 0, 0, 0, 0, 0, 0, 0])).toBe(0);
    });

    it('should throw error for invalid bit array length', () => {
      expect(() => bitsToByte([1, 0, 1])).toThrow('Expected 8 bits, got 3');
      expect(() => bitsToByte([1, 0, 1, 0, 1, 0, 1, 0, 1])).toThrow('Expected 8 bits, got 9');
    });

    it('should be bidirectional for byte/bits conversion', () => {
      const testValues = [0, 1, 127, 128, 255, 170, 85];
      testValues.forEach(value => {
        const bits = byteToBits(value);
        const reconstructed = bitsToByte(bits);
        expect(reconstructed).toBe(value);
      });
    });
  });

  describe('string/bits conversions', () => {
    it('should convert string to bits correctly', () => {
      const bits = stringToBits('A');
      // 'A' is ASCII 65 = 0b01000001
      expect(bits).toEqual([0, 1, 0, 0, 0, 0, 0, 1]);
    });

    it('should convert bits to string correctly', () => {
      const bits = [0, 1, 0, 0, 0, 0, 0, 1]; // ASCII 'A'
      const result = bitsToString(bits);
      expect(result).toBe('A');
    });

    it('should handle multi-character strings', () => {
      const original = 'Hello';
      const bits = stringToBits(original);
      const reconstructed = bitsToString(bits);
      expect(reconstructed).toBe(original);
    });

    it('should throw error for invalid bit array length in string conversion', () => {
      expect(() => bitsToString([1, 0, 1])).toThrow('Bit array length must be a multiple of 8');
    });
  });

  describe('number/bits conversions', () => {
    it('should convert number to bits with specified length', () => {
      expect(numberToBits(5, 4)).toEqual([0, 1, 0, 1]);
      expect(numberToBits(15, 4)).toEqual([1, 1, 1, 1]);
      expect(numberToBits(255, 8)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    });

    it('should convert bits to number correctly', () => {
      expect(bitsToNumber([0, 1, 0, 1])).toBe(5);
      expect(bitsToNumber([1, 1, 1, 1])).toBe(15);
      expect(bitsToNumber([1, 1, 1, 1, 1, 1, 1, 1])).toBe(255);
    });

    it('should be bidirectional for number/bits conversion', () => {
      const testCases = [
        { num: 5, bits: 4 },
        { num: 255, bits: 8 },
        { num: 1023, bits: 10 },
      ];

      testCases.forEach(({ num, bits }) => {
        const bitArray = numberToBits(num, bits);
        const reconstructed = bitsToNumber(bitArray);
        expect(reconstructed).toBe(num);
      });
    });
  });

  describe('BitOperation creation', () => {
    it('should create BitOperation object correctly', () => {
      const operation = createBitOperation(100, 'red', 170, 171, 1);

      expect(operation).toEqual({
        pixelIndex: 100,
        channel: 'red',
        originalValue: 170,
        newValue: 171,
        extractedBit: 1,
      });
    });
  });

  describe('triple redundancy operations', () => {
    it('should apply triple redundancy correctly', () => {
      const originalBits = [1, 0, 1];
      const redundantBits = applyTripleRedundancy(originalBits);
      expect(redundantBits).toEqual([1, 1, 1, 0, 0, 0, 1, 1, 1]);
    });

    it('should decode perfect triple redundancy correctly', () => {
      const redundantBits = [1, 1, 1, 0, 0, 0, 1, 1, 1];
      const decoded = decodeTripleRedundancy(redundantBits);
      expect(decoded).toEqual([1, 0, 1]);
    });

    it('should handle corrupted triple redundancy with majority voting', () => {
      // Corrupted: one bit flipped in each group
      const corruptedBits = [1, 0, 1, 0, 1, 0, 1, 0, 1]; // Should decode to [1, 0, 1]
      const decoded = decodeTripleRedundancy(corruptedBits);
      expect(decoded).toEqual([1, 0, 1]);
    });

    it('should throw error for invalid redundant bits length', () => {
      expect(() => decodeTripleRedundancy([1, 0])).toThrow('Redundant bits length must be multiple of 3');
    });

    it('should be bidirectional for perfect data', () => {
      const originalBits = [1, 0, 1, 1, 0, 0, 1];
      const redundantBits = applyTripleRedundancy(originalBits);
      const decoded = decodeTripleRedundancy(redundantBits);
      expect(decoded).toEqual(originalBits);
    });
  });

  describe('corruption rate calculation', () => {
    it('should calculate 0% corruption for perfect data', () => {
      const perfectBits = [1, 1, 1, 0, 0, 0, 1, 1, 1];
      const rate = calculateCorruptionRate(perfectBits);
      expect(rate).toBe(0);
    });

    it('should calculate 100% corruption when all groups are corrupted', () => {
      const corruptedBits = [1, 0, 1, 0, 1, 0, 1, 0, 1];
      const rate = calculateCorruptionRate(corruptedBits);
      expect(rate).toBe(100);
    });

    it('should calculate partial corruption correctly', () => {
      // 2 perfect groups, 1 corrupted group
      const mixedBits = [1, 1, 1, 0, 0, 0, 1, 0, 1];
      const rate = calculateCorruptionRate(mixedBits);
      expect(rate).toBeCloseTo(33.33, 1);
    });

    it('should return 0 for invalid length arrays', () => {
      const invalidBits = [1, 0];
      const rate = calculateCorruptionRate(invalidBits);
      expect(rate).toBe(0);
    });
  });

  describe('validation functions', () => {
    it('should validate single bits correctly', () => {
      expect(isValidBit(0)).toBe(true);
      expect(isValidBit(1)).toBe(true);
      expect(isValidBit(2)).toBe(false);
      expect(isValidBit(-1)).toBe(false);
    });

    it('should validate bit arrays correctly', () => {
      expect(areValidBits([0, 1, 0, 1])).toBe(true);
      expect(areValidBits([0, 1, 2, 1])).toBe(false);
      expect(areValidBits([])).toBe(true);
    });
  });

  describe('XOR operations', () => {
    it('should XOR bit arrays correctly', () => {
      const bits1 = [1, 0, 1, 0];
      const bits2 = [0, 1, 1, 0];
      const result = xorBits(bits1, bits2);
      expect(result).toEqual([1, 1, 0, 0]);
    });

    it('should throw error for mismatched array lengths', () => {
      expect(() => xorBits([1, 0], [1, 0, 1])).toThrow('Bit arrays must have the same length');
    });

    it('should be self-inverse (XOR with same array gives zeros)', () => {
      const bits = [1, 0, 1, 1, 0];
      const result = xorBits(bits, bits);
      expect(result).toEqual([0, 0, 0, 0, 0]);
    });
  });

  describe('checksum operations', () => {
    it('should calculate simple checksum correctly', () => {
      // XOR all bits individually: 1^1^1^1^1^1^1^1^0^0^0^0^0^0^0^0 = 0 (8 ones XOR to 0)
      const bits = [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1, // 8 ones
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0, // 8 zeros
      ];
      const checksum = calculateSimpleChecksum(bits);
      expect(checksum).toBe(0);
    });

    it('should calculate checksum for mixed bits', () => {
      // XOR: 1^0^1^0^1 = 1 (odd number of 1s)
      const bits = [1, 0, 1, 0, 1];
      const checksum = calculateSimpleChecksum(bits);
      expect(checksum).toBe(1);
    });

    it('should return 0 for identical bytes', () => {
      const bits = [
        1,
        0,
        1,
        0,
        1,
        0,
        1,
        0, // Same byte
        1,
        0,
        1,
        0,
        1,
        0,
        1,
        0, // Same byte
      ];
      const checksum = calculateSimpleChecksum(bits);
      expect(checksum).toBe(0);
    });
  });
});
