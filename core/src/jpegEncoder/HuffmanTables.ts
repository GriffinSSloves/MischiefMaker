/*
 * HuffmanTables – baseline DC/AC Huffman table generation for JPEG.
 * Extracted and typed from the legacy encoder.
 */

import {
  STD_DC_LUMINANCE_NRCODES,
  STD_DC_LUMINANCE_VALUES,
  STD_AC_LUMINANCE_NRCODES,
  STD_AC_LUMINANCE_VALUES,
  STD_DC_CHROMINANCE_NRCODES,
  STD_DC_CHROMINANCE_VALUES,
  STD_AC_CHROMINANCE_NRCODES,
  STD_AC_CHROMINANCE_VALUES,
} from './Constants';

export type THuffmanTable = Array<[number, number]>; // [code, length]

interface IBaselineHuffmanTables {
  YDC: THuffmanTable;
  YAC: THuffmanTable;
  UVDC: THuffmanTable;
  UVAC: THuffmanTable;
}

// ---------------------------------------------------------------------------

function computeTable(nrCodes: readonly number[], stdTable: readonly number[]): THuffmanTable {
  const HT: THuffmanTable = [];
  let codeValue = 0;
  let pos = 0;
  for (let k = 1; k <= 16; k++) {
    for (let j = 1; j <= nrCodes[k]; j++) {
      HT[stdTable[pos]] = [codeValue, k];
      pos++;
      codeValue++;
    }
    codeValue <<= 1; // next code length
  }
  return HT;
}

export function buildBaselineHuffmanTables(): IBaselineHuffmanTables {
  return {
    YDC: computeTable(STD_DC_LUMINANCE_NRCODES, STD_DC_LUMINANCE_VALUES),
    YAC: computeTable(STD_AC_LUMINANCE_NRCODES, STD_AC_LUMINANCE_VALUES),
    UVDC: computeTable(STD_DC_CHROMINANCE_NRCODES, STD_DC_CHROMINANCE_VALUES),
    UVAC: computeTable(STD_AC_CHROMINANCE_NRCODES, STD_AC_CHROMINANCE_VALUES),
  };
}
