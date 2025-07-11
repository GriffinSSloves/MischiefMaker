import { describe, it, expect } from 'vitest';
import { buildHuffmanTable } from './huffmanBuilder';

/**
 * Helper: verify prefix-free property of a Huffman table.
 */
function isPrefixFree(table: (readonly [number, number])[]): boolean {
  const codes: string[] = [];
  for (const entry of table) {
    if (!entry) continue;
    const [code, len] = entry;
    codes.push(code.toString(2).padStart(len, '0'));
  }
  // Check that no code is the prefix of another
  for (let i = 0; i < codes.length; i++) {
    for (let j = 0; j < codes.length; j++) {
      if (i === j) continue;
      if (codes[j].startsWith(codes[i])) return false;
    }
  }
  return true;
}

describe('huffmanBuilder.buildHuffmanTable', () => {
  it('creates single-bit codes for two-symbol alphabet', () => {
    const freqs = new Array(256).fill(0);
    freqs[10] = 5;
    freqs[200] = 5;

    const table = buildHuffmanTable(freqs);
    const code10 = table[10]!;
    const code200 = table[200]!;

    expect(code10[1]).toBe(1); // length
    expect(code200[1]).toBe(1);
    // Codes must differ
    expect(code10[0]).not.toBe(code200[0]);
  });

  it('assigns shorter code to more frequent symbol', () => {
    const freqs = new Array(256).fill(0);
    freqs[0] = 10; // most frequent
    freqs[1] = 5;
    freqs[2] = 1; // least frequent

    const table = buildHuffmanTable(freqs);
    const len0 = table[0]![1];
    const len1 = table[1]![1];
    const len2 = table[2]![1];

    expect(len0).toBeLessThanOrEqual(len1);
    expect(len1).toBeLessThanOrEqual(len2);
  });

  it('produces prefix-free code set', () => {
    const freqs = new Array(256).fill(1); // uniform distribution
    const table = buildHuffmanTable(freqs);

    // Filter undefined entries
    const defined = table.filter(Boolean) as [number, number][];
    expect(isPrefixFree(defined)).toBe(true);
  });
});
