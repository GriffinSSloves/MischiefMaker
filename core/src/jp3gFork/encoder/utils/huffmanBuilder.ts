/*
 * Utility for building JPEG-compatible Huffman tables **from symbol
 * frequencies**. Extracted from the legacy `jp3gEncoder.ts` so it can be
 * reused and unit-tested in isolation.
 *
 * The implementation follows the canonical algorithm described in
 * Annex C of the JPEG specification: we repeatedly pick the two lowest-
 * frequency nodes, merge them, and then assign canonical codes based on
 * the resulting binary tree.
 */

export type THuffmanEntry = [number, number]; // [code, length]
export type THuffmanTable = Array<THuffmanEntry | undefined>;

interface IHuffmanNode {
  value?: number; // symbol (0-255) when leaf node
  freq: number;
  children?: [IHuffmanNode, IHuffmanNode];
}

/**
 * Build a canonical JPEG Huffman table from an array of 256 symbol
 * frequencies.  Entries with a frequency of 0 are ignored.
 *
 * The returned array is indexed by symbol and contains `[code, length]` for
 * every symbol that appeared in the input.  Symbols that never occurred will
 * have `undefined` in the corresponding slot.
 */
export function buildHuffmanTable(frequencies: number[]): THuffmanTable {
  // 1. Create an initial leaf node for every symbol that occurs.
  const nodes: IHuffmanNode[] = [];
  for (let i = 0; i < frequencies.length; i++) {
    if (frequencies[i] > 0) {
      nodes.push({ value: i, freq: frequencies[i] });
    }
  }

  // Edge-case: no symbols at all → return empty table.
  if (nodes.length === 0) {
    return new Array(frequencies.length);
  }

  // 2. Build merge tree (always combine two least-frequent nodes).
  //    We repeatedly sort the active node list by frequency.
  //    For N ≤ 256 this O(N² log N) method is fine and mirrors the
  //    behaviour in the original code.
  while (nodes.length > 1) {
    nodes.sort((a, b) => a.freq - b.freq);
    const node1 = nodes.shift() as IHuffmanNode;
    const node2 = nodes.shift() as IHuffmanNode;
    nodes.push({ freq: node1.freq + node2.freq, children: [node1, node2] });
  }

  // 3. Walk the tree to assign canonical codes.
  const table: THuffmanTable = new Array(frequencies.length);
  const generateCodes = (node: IHuffmanNode, code: number, depth: number): void => {
    if (node.children) {
      // Left child keeps current code (0-bit), right child sets the next high bit.
      generateCodes(node.children[0], code, depth + 1);
      generateCodes(node.children[1], code | (1 << (15 - depth)), depth + 1);
    } else if (node.value !== undefined) {
      // Store only the lowest `depth` bits of `code` (JPEG stores codes MSB-aligned).
      table[node.value] = [code >> (16 - depth), depth];
    }
  };

  generateCodes(nodes[0], 0, 0);
  return table;
}
