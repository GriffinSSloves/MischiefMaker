import { describe, it, expect } from 'vitest';
import { extractMessageFromDctBlocks } from './MessageExtractor';
import { IJpegInternalDecoder } from './IJpegDecoder';

const createBlockWithByte = (byte: number): number[] => {
  const block = new Array(64).fill(2); // safe magnitude ≥ 2
  block[0] = 15; // DC
  // encode byte into first 8 AC coefficients
  for (let i = 0; i < 8; i++) {
    const bit = (byte >> (7 - i)) & 1;
    block[i + 1] = 2 | bit; // ensure coef positive, set LSB
  }
  return block;
};

describe('MessageExtractor', () => {
  it('extracts a single encoded byte correctly', () => {
    const value = 0b01010101; // 0x55
    const decoder: IJpegInternalDecoder = {
      width: 8,
      height: 8,
      components: [
        {
          dctBlocks: [[createBlockWithByte(value)]],
        },
      ],
    };

    const result = extractMessageFromDctBlocks(decoder, 1);
    expect(result.bytes[0]).toBe(value);
    expect(result.bitsExtracted).toBe(8);
    expect(result.coefficientsRead).toBe(8);
  });
});
