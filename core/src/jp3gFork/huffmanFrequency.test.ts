import { describe, it, expect } from 'vitest';
import { getHuffmanFrequencies } from './huffmanFrequency';

// Helper to create a blank 8×8 block
const blankBlock = () => new Array(64).fill(0);

describe('getHuffmanFrequencies', () => {
  it('returns correct DC counts for single-block image', () => {
    // Build Y/Cb/Cr components as 1×1 block images
    const yBlock = blankBlock();
    yBlock[0] = 5; // DC value 5

    const cbBlock = blankBlock();
    cbBlock[0] = -3; // Cb DC value

    const crBlock = blankBlock();
    crBlock[0] = 4; // Cr DC value

    const components = [
      [[yBlock]], // Y
      [[cbBlock]], // Cb
      [[crBlock]], // Cr
    ];

    const { Y_DC_freq, UV_DC_freq } = getHuffmanFrequencies(components);

    // There should be exactly one Y DC symbol and two UV DC symbols
    const yTotal = Y_DC_freq.reduce((a, b) => a + b, 0);
    const uvTotal = UV_DC_freq.reduce((a, b) => a + b, 0);
    expect(yTotal).toBe(1);
    expect(uvTotal).toBe(2);
  });

  it('counts EOB symbol when all ACs are zero', () => {
    const components = [[[blankBlock()]], [[blankBlock()]], [[blankBlock()]]];
    const { Y_AC_freq, UV_AC_freq } = getHuffmanFrequencies(components);
    // For 1×1 block scenario: one Y block + two chroma blocks -> 3 EOBs
    expect(Y_AC_freq[0x00]).toBe(1);
    expect(UV_AC_freq[0x00]).toBe(2);
  });
});
