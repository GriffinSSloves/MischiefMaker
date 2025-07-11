import { describe, it, expect } from 'vitest';
import { buildQuantTables } from './QuantTables';

describe('QuantTables', () => {
  it('generates expected tables for quality 50', () => {
    const { YTable, UVTable } = buildQuantTables(50);

    // Basic sanity checks
    expect(YTable).toHaveLength(64);
    expect(UVTable).toHaveLength(64);

    // Spot-check a few values that are known for quality 50
    expect(YTable[0]).toBe(16);
    expect(YTable[63]).toBe(99);
    expect(UVTable[0]).toBe(17);
    expect(UVTable[63]).toBe(99);
  });
});
