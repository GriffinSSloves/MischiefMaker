import { describe, it, expect } from 'vitest';
import { buildRgbYuvLookupTable, RGB_YUV_TABLE_LENGTH } from './colorTables';

describe('colorTables - buildRgbYuvLookupTable', () => {
  const table = buildRgbYuvLookupTable();

  it('should create table of correct length', () => {
    expect(table.length).toBe(RGB_YUV_TABLE_LENGTH);
  });

  it('should match expected Y contribution for red component', () => {
    expect(table[0]).toBe(0);
    expect(table[255]).toBe(19595 * 255);
  });

  it('should match expected U contribution for red component', () => {
    expect(table[768]).toBe(-11059 * 0);
    expect(table[768 + 255]).toBe(-11059 * 255);
  });
});
