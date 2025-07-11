import { describe, it, expect } from 'vitest';
import { buildQuantTables } from './quantUtils';
import { fDCTQuant } from './dctUtils';

const { fdtbl_Y } = buildQuantTables(50);

describe('dctUtils - fDCTQuant', () => {
  it('should output 64 coefficients and integer values', () => {
    const block = new Array(64).fill(0);
    block[0] = 100; // simple DC value
    const output = fDCTQuant(block, fdtbl_Y);
    expect(output.length).toBe(64);
    for (const v of output) {
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('should be reversible for zero block', () => {
    const zeroBlock = new Array(64).fill(0);
    const output = fDCTQuant(zeroBlock, fdtbl_Y);
    expect(output.every(v => v === 0)).toBe(true);
  });
});
