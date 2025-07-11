import { describe, test, expect } from 'vitest';
import { buildComponentData } from './componentDataBuilder';
import { resetMaxMemoryUsage } from './memoryManager';

// Dummy quantisation table: all ones
const qt = new Int32Array(64).fill(1);

// Helper to create an 8×8 block with specified DC value
function makeBlock(dc: number): Int32Array {
  const block = new Int32Array(64);
  block[0] = dc;
  return block;
}

describe('componentDataBuilder', () => {
  test('converts single zero block to 128-value lines', () => {
    resetMaxMemoryUsage(1024 * 1024); // 1 MB limit for small test

    const component = {
      blocksPerLine: 1,
      blocksPerColumn: 1,
      blocks: [[makeBlock(0)]],
      quantizationTable: qt,
    } as any;

    const lines = buildComponentData(component);
    expect(lines.length).toBe(8);
    for (const line of lines) {
      expect(Array.from(line)).toEqual(new Array(8).fill(128));
    }
  });
});
