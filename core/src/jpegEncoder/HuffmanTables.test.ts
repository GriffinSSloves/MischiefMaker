import { describe, it, expect } from 'vitest';
import { buildBaselineHuffmanTables } from './HuffmanTables';

describe('HuffmanTables', () => {
  it('builds baseline tables with expected lengths', () => {
    const { YDC, YAC, UVDC, UVAC } = buildBaselineHuffmanTables();

    // Baseline tables should have 12 DC entries and 256 AC placeholder slots
    expect(YDC.length).toBeGreaterThanOrEqual(12);
    expect(UVDC.length).toBeGreaterThanOrEqual(12);

    // AC tables: up to 256 symbols (0x00 – 0xFF) but sparse
    expect(YAC.length).toBeGreaterThan(160);
    expect(UVAC.length).toBeGreaterThan(160);

    // Spot-check first DC symbol code length (should be 2 bits)
    expect(YDC[0][1]).toBe(2);
  });
});
