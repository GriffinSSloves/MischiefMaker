import { describe, it, expect } from 'vitest';
import { computeHuffmanTable, generateHuffmanNrcodesValues } from './huffmanUtils';
import { STD_DC_LUMINANCE_NRCODES, STD_DC_LUMINANCE_VALUES } from '../../constants/huffmanConstants';

// Clone readonly constant arrays into mutable copies for the utility functions
const DC_NR = [...STD_DC_LUMINANCE_NRCODES];
const DC_VAL = [...STD_DC_LUMINANCE_VALUES];

describe('huffmanUtils', () => {
  it('computeHuffmanTable -> generateHuffmanNrcodesValues round-trip should be lossless', () => {
    const ht = computeHuffmanTable(DC_NR, DC_VAL);

    const { nrcodes, values } = generateHuffmanNrcodesValues(ht);

    expect(nrcodes).toEqual(DC_NR.slice(1)); // slice(1) because index 0 is unused in JPEG spec
    expect(values).toEqual(DC_VAL);
  });

  it('computeHuffmanTable assigns expected code lengths for first few symbols', () => {
    const ht = computeHuffmanTable(DC_NR, DC_VAL);

    // Expected JPEG baseline DC luminance lengths: first symbol (0) -> 2 bits, next five -> 3 bits
    expect(ht[0][1]).toBe(2);
    for (let i = 1; i <= 5; i++) {
      expect(ht[i][1]).toBe(3);
    }
  });
});
