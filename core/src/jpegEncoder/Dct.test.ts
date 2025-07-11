import { describe, it, expect } from 'vitest';
import { forwardDctQuantize, ZigZag } from './Dct';

describe('Dct', () => {
  it('performs forward DCT on 8x8 block', () => {
    // Create a simple 8x8 test block (all pixels = 128)
    const testBlock = new Array(64).fill(128);
    const quantTable = new Array(64).fill(1); // No quantization for testing

    const result = forwardDctQuantize(testBlock, quantTable);

    // DC coefficient should be 8192 (8*8*128)
    expect(result[0]).toBe(8192);

    // All AC coefficients should be 0 for uniform input
    for (let i = 1; i < 64; i++) {
      expect(result[i]).toBe(0);
    }
  });

  it('applies quantization correctly', () => {
    const testBlock = new Array(64).fill(128);
    const quantTable = new Array(64).fill(2); // Quantization factor of 2 (multiplies, not divides)

    const result = forwardDctQuantize(testBlock, quantTable);

    // DC coefficient should be 16384 (8192*2)
    expect(result[0]).toBe(16384);
  });

  it('handles edge case with zero input', () => {
    const testBlock = new Array(64).fill(0);
    const quantTable = new Array(64).fill(1);

    const result = forwardDctQuantize(testBlock, quantTable);

    // All coefficients should be 0
    for (let i = 0; i < 64; i++) {
      expect(result[i]).toBe(0);
    }
  });

  it('exports correct zig-zag order', () => {
    expect(ZigZag).toHaveLength(64);
    expect(ZigZag[0]).toBe(0); // DC coefficient first
    expect(ZigZag[63]).toBe(63); // Last coefficient
  });

  it('produces different results for non-uniform input', () => {
    // Create a gradient pattern
    const testBlock = new Array(64);
    for (let i = 0; i < 64; i++) {
      testBlock[i] = i * 2;
    }
    const quantTable = new Array(64).fill(1);

    const result = forwardDctQuantize(testBlock, quantTable);

    // Should have non-zero AC coefficients
    let hasNonZeroAC = false;
    for (let i = 1; i < 64; i++) {
      if (result[i] !== 0) {
        hasNonZeroAC = true;
        break;
      }
    }
    expect(hasNonZeroAC).toBe(true);
  });
});
