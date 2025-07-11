import { describe, it, expect } from 'vitest';
import { buildHuffmanTable, HuffmanDecodeTree } from './huffmanTable';
import { STD_DC_LUMINANCE_NRCODES, STD_DC_LUMINANCE_VALUES } from '../../constants/huffmanConstants';

/** Helper to collect all leaf symbols from the decode tree */
function collectLeaves(node: HuffmanDecodeTree, out: number[] = []): number[] {
  for (const child of node) {
    if (typeof child === 'number') {
      out.push(child);
    } else if (Array.isArray(child)) {
      collectLeaves(child as HuffmanDecodeTree, out);
    }
  }
  return out;
}

describe('decoder/utils/huffmanTable', () => {
  it('should build a decode tree for the JPEG DC luminance table', () => {
    const lengths = Uint8Array.from(STD_DC_LUMINANCE_NRCODES);
    const values = Uint8Array.from(STD_DC_LUMINANCE_VALUES);

    const tree = buildHuffmanTable(lengths, values);
    expect(Array.isArray(tree)).toBe(true);

    const leaves = collectLeaves(tree);
    // The set of leaves should match exactly the provided values (order not important).
    expect(leaves.sort((a, b) => a - b)).toEqual(Array.from(values).sort((a, b) => a - b));
  });

  it('should decode simple 1-bit table correctly', () => {
    // Very small table: symbol 0 -> code 0, symbol 1 -> code 1
    const lengths = Uint8Array.from([0, 2]); // two codes of length 1
    const values = Uint8Array.from([0, 1]);
    const tree = buildHuffmanTable(lengths, values);

    const simpleLeaves = collectLeaves(tree);
    expect(simpleLeaves.sort()).toEqual([0, 1]);
  });
});
