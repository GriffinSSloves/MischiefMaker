import type { BitOperation } from '../../types/BitOperation';
import { ALGORITHM_CONSTANTS, CAPACITY_CONSTANTS } from '../../types/Constants';

/**
 * Bit manipulation operations for steganography
 * Pure functions for LSB extraction, insertion, and bit-level data operations
 */

/**
 * Extract the least significant bit from a byte value
 */
export function extractLSB(value: number): number {
  return value & 1;
}

/**
 * Set the least significant bit of a byte value
 */
export function setLSB(value: number, bit: number): number {
  // Clear the LSB and set the new bit
  return (value & 0xfe) | (bit & 1);
}

/**
 * Extract multiple LSBs from a byte value
 */
export function extractLSBs(value: number, depth: number = ALGORITHM_CONSTANTS.lsbDepth): number {
  const mask = (1 << depth) - 1; // Create mask for specified depth
  return value & mask;
}

/**
 * Set multiple LSBs in a byte value
 */
export function setLSBs(value: number, bits: number, depth: number = ALGORITHM_CONSTANTS.lsbDepth): number {
  const mask = (1 << depth) - 1; // Create mask for specified depth
  const clearMask = ~mask; // Invert mask to clear bits
  return (value & clearMask) | (bits & mask);
}

/**
 * Convert a byte to an array of bits (MSB first)
 */
export function byteToBits(byte: number): number[] {
  const bits: number[] = [];
  for (let i = 7; i >= 0; i--) {
    bits.push((byte >> i) & 1);
  }
  return bits;
}

/**
 * Convert an array of bits to a byte value (MSB first)
 */
export function bitsToByte(bits: number[]): number {
  if (bits.length !== CAPACITY_CONSTANTS.BITS_PER_BYTE) {
    throw new Error(`Expected ${CAPACITY_CONSTANTS.BITS_PER_BYTE} bits, got ${bits.length}`);
  }

  let byte = 0;
  for (let i = 0; i < CAPACITY_CONSTANTS.BITS_PER_BYTE; i++) {
    byte = (byte << 1) | (bits[i] & 1);
  }
  return byte;
}

/**
 * Convert a string to an array of bits
 */
export function stringToBits(text: string): number[] {
  const bits: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const charBits = byteToBits(charCode);
    bits.push(...charBits);
  }
  return bits;
}

/**
 * Convert an array of bits to a string
 */
export function bitsToString(bits: number[]): string {
  if (bits.length % CAPACITY_CONSTANTS.BITS_PER_BYTE !== 0) {
    throw new Error('Bit array length must be a multiple of 8');
  }

  let result = '';
  for (let i = 0; i < bits.length; i += CAPACITY_CONSTANTS.BITS_PER_BYTE) {
    const byteBits = bits.slice(i, i + CAPACITY_CONSTANTS.BITS_PER_BYTE);
    const charCode = bitsToByte(byteBits);
    result += String.fromCharCode(charCode);
  }
  return result;
}

/**
 * Convert a number to an array of bits with specified bit length
 */
export function numberToBits(num: number, bitLength: number): number[] {
  const bits: number[] = [];
  for (let i = bitLength - 1; i >= 0; i--) {
    bits.push((num >> i) & 1);
  }
  return bits;
}

/**
 * Convert an array of bits to a number
 */
export function bitsToNumber(bits: number[]): number {
  let result = 0;
  for (let i = 0; i < bits.length; i++) {
    result = (result << 1) | (bits[i] & 1);
  }
  return result;
}

/**
 * Create a BitOperation record for tracking bit manipulations
 */
export function createBitOperation(
  pixelIndex: number,
  channel: 'red' | 'green' | 'blue',
  originalValue: number,
  newValue: number,
  extractedBit: number
): BitOperation {
  return {
    pixelIndex,
    channel,
    originalValue,
    newValue,
    extractedBit,
  };
}

/**
 * Apply triple redundancy encoding to bits
 * Each original bit becomes 3 bits (for error correction)
 */
export function applyTripleRedundancy(bits: number[]): number[] {
  const redundantBits: number[] = [];
  for (const bit of bits) {
    // Store each bit 3 times for redundancy
    redundantBits.push(bit, bit, bit);
  }
  return redundantBits;
}

/**
 * Decode triple redundancy bits using majority voting
 * Groups of 3 bits are decoded to 1 bit using majority rule
 */
export function decodeTripleRedundancy(redundantBits: number[]): number[] {
  if (redundantBits.length % ALGORITHM_CONSTANTS.redundancyFactor !== 0) {
    throw new Error(`Redundant bits length must be multiple of ${ALGORITHM_CONSTANTS.redundancyFactor}`);
  }

  const originalBits: number[] = [];
  for (let i = 0; i < redundantBits.length; i += ALGORITHM_CONSTANTS.redundancyFactor) {
    const group = redundantBits.slice(i, i + ALGORITHM_CONSTANTS.redundancyFactor);
    // Majority voting: if sum >= 2, the bit is 1
    const sum = group.reduce((acc, bit) => acc + bit, 0);
    originalBits.push(sum >= 2 ? 1 : 0);
  }
  return originalBits;
}

/**
 * Calculate bit corruption rate in triple redundancy data
 * Returns percentage of corrupted bit groups
 */
export function calculateCorruptionRate(redundantBits: number[]): number {
  if (redundantBits.length % ALGORITHM_CONSTANTS.redundancyFactor !== 0) {
    return 0;
  }

  let corruptedGroups = 0;
  const totalGroups = redundantBits.length / ALGORITHM_CONSTANTS.redundancyFactor;

  for (let i = 0; i < redundantBits.length; i += ALGORITHM_CONSTANTS.redundancyFactor) {
    const group = redundantBits.slice(i, i + ALGORITHM_CONSTANTS.redundancyFactor);
    // If not all bits in the group are the same, it's corrupted
    const firstBit = group[0];
    const isCorrupted = group.some(bit => bit !== firstBit);
    if (isCorrupted) {
      corruptedGroups++;
    }
  }

  return (corruptedGroups / totalGroups) * 100;
}

/**
 * Validate that a value is a valid bit (0 or 1)
 */
export function isValidBit(value: number): boolean {
  return value === 0 || value === 1;
}

/**
 * Validate that all values in an array are valid bits
 */
export function areValidBits(bits: number[]): boolean {
  return bits.every(isValidBit);
}

/**
 * XOR two bit arrays of equal length
 */
export function xorBits(bits1: number[], bits2: number[]): number[] {
  if (bits1.length !== bits2.length) {
    throw new Error('Bit arrays must have the same length');
  }

  return bits1.map((bit, index) => bit ^ bits2[index]);
}

/**
 * Calculate a simple checksum by XORing all bits
 */
export function calculateSimpleChecksum(bits: number[]): number {
  return bits.reduce((checksum, bit) => checksum ^ bit, 0);
}
