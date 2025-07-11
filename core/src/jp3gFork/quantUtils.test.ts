import { describe, it, expect } from 'vitest';
import { buildQuantTables } from './quantUtils';

describe('quantUtils - buildQuantTables', () => {
  const { YTable, UVTable, fdtbl_Y, fdtbl_UV } = buildQuantTables(50);

  it('should generate tables of length 64', () => {
    expect(YTable.length).toBe(64);
    expect(UVTable.length).toBe(64);
    expect(fdtbl_Y.length).toBe(64);
    expect(fdtbl_UV.length).toBe(64);
  });

  it('quantised values should be in range 1..255', () => {
    for (const v of YTable) expect(v).toBeGreaterThanOrEqual(1);
    for (const v of YTable) expect(v).toBeLessThanOrEqual(255);
    for (const v of UVTable) expect(v).toBeGreaterThanOrEqual(1);
    for (const v of UVTable) expect(v).toBeLessThanOrEqual(255);
  });

  it('fdtbl divisors should be positive', () => {
    for (const v of fdtbl_Y) expect(v).toBeGreaterThan(0);
    for (const v of fdtbl_UV) expect(v).toBeGreaterThan(0);
  });
});
