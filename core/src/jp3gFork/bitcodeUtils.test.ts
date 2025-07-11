import { describe, it, expect } from 'vitest';
import { buildCategoryAndBitcode } from './bitcodeUtils';

describe('bitcodeUtils - buildCategoryAndBitcode', () => {
  const { category, bitcode } = buildCategoryAndBitcode();

  it('should generate correct category for small positive numbers', () => {
    expect(category[32767 + 0]).toBeUndefined(); // 0 is not valid here
    expect(category[32767 + 1]).toBe(1);
    expect(category[32767 + 2]).toBe(2);
    expect(category[32767 + 3]).toBe(2);
    expect(category[32767 + 4]).toBe(3);
  });

  it('should generate symmetric categories for negatives', () => {
    expect(category[32767 - 1]).toBe(category[32767 + 1]); // -1 same as +1
    expect(category[32767 - 2]).toBe(category[32767 + 2]);
  });

  it('bitcode entries should have matching length with category', () => {
    for (let val = -10; val <= 10; val++) {
      if (val === 0) continue;
      const index = 32767 + val;
      const entry = bitcode[index];
      expect(entry[1]).toBe(category[index]);
    }
  });
});
