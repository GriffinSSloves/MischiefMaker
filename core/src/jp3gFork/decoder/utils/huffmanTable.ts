/*
 * Huffman table utilities for jp3g decoder – builds a decoding tree that maps
 * bit sequences to symbol values. This mirrors the original buildHuffmanTable
 * logic but is now reusable and testable on its own.
 */

export type HuffmanDecodeTree = (number | HuffmanDecodeTree)[];

/**
 * Build a Huffman decode tree from JPEG `codeLengths` / `values` arrays.
 * Each entry in the resulting array can be either:
 *   • a number   – decoded symbol
 *   • an array   – next branch in the tree (index by next bit)
 */
export function buildHuffmanTable(codeLengths: Uint8Array, values: Uint8Array): HuffmanDecodeTree {
  let k = 0;
  const code: { children: HuffmanDecodeTree; index: number }[] = [];

  // Find real max length (JPEG spec caps at 16)
  let length = 16;
  while (length > 0 && !codeLengths[length - 1]) {
    length--;
  }

  code.push({ children: [], index: 0 });
  let p = code[0];
  let q: { children: HuffmanDecodeTree; index: number } | undefined;

  for (let i = 0; i < length; i++) {
    for (let j = 0; j < codeLengths[i]; j++) {
      p = code.pop()!;
      (p.children as HuffmanDecodeTree)[p.index] = values[k];
      while (p.index > 0) {
        if (code.length === 0) {
          throw new Error('Could not recreate Huffman Table');
        }
        p = code.pop()!;
      }
      p.index++;
      code.push(p);
      while (code.length <= i) {
        code.push((q = { children: [], index: 0 }));
        (p.children as HuffmanDecodeTree)[p.index] = q.children;
        p = q;
      }
      k++;
    }
    if (i + 1 < length) {
      // p here points to last code
      code.push((q = { children: [], index: 0 }));
      (p.children as HuffmanDecodeTree)[p.index] = q.children;
      p = q;
    }
  }

  return code[0].children;
}
