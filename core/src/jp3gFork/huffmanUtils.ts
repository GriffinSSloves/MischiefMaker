/*
 * Huffman table utilities extracted from the legacy jp3g encoder so they can
 * be tested and reused independently.
 */

export type HuffmanTable = Array<[number, number]>;

/**
 * Compute a JPEG Huffman table from the standard `nrcodes`/`values` pair.
 * Returns an array where each symbol index holds `[code, length]`.
 */
export function computeHuffmanTable(nrcodes: number[], values: number[]): HuffmanTable {
  let codeValue = 0;
  let posInTable = 0;
  const HT: HuffmanTable = [];

  for (let k = 1; k <= 16; k++) {
    for (let j = 1; j <= nrcodes[k]; j++) {
      const symbol = values[posInTable++];
      HT[symbol] = [codeValue, k];
      codeValue++;
    }
    codeValue <<= 1; // advance to next code length
  }
  return HT;
}

/**
 * Given a complete Huffman table (result from `computeHuffmanTable`), generate
 * the JPEG DHT segment structures: `nrcodes` (array of 16 counts) and `values`
 * ordered by increasing code length.
 */
export function generateHuffmanNrcodesValues(ht: HuffmanTable): { nrcodes: number[]; values: number[] } {
  const counts = new Array(17).fill(0);
  const valueList: number[] = [];

  for (let symbol = 0; symbol < ht.length; symbol++) {
    const entry = ht[symbol];
    if (!entry) continue;
    const len = entry[1];
    counts[len]++;
  }

  // Build `values` list ordered by code length then symbol order.
  for (let len = 1; len <= 16; len++) {
    for (let symbol = 0; symbol < ht.length; symbol++) {
      const entry = ht[symbol];
      if (entry && entry[1] === len) {
        valueList.push(symbol);
      }
    }
  }
  return { nrcodes: counts.slice(1), values: valueList };
}
