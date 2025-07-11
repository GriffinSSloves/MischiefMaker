/*
 * Quantisation table builder extracted from the legacy jp3g encoder.
 * Given a scaling factor (derived from JPEG quality), it produces:
 *   • YTable / UVTable   – 8×8 quantisation tables for luminance & chroma
 *   • fdtbl_Y / fdtbl_UV – pre-scaled floating-point divisors used during DCT
 */

import { ZIG_ZAG } from './constants/constants';
import { Y_LUMA_QT_BASE, UV_CHROMA_QT_BASE, AA_SF } from './constants/quantTables';

export interface QuantTablesResult {
  YTable: number[];
  UVTable: number[];
  fdtbl_Y: number[];
  fdtbl_UV: number[];
}

/**
 * Build JPEG quantisation tables for a given scaling factor (1‥5000).
 * The scaling factor is computed in the encoder as:
 *   sf = quality < 50 ? 5000 / quality : 200 - quality * 2
 */
export function buildQuantTables(sf: number): QuantTablesResult {
  const YTable = new Array<number>(64);
  const UVTable = new Array<number>(64);
  const fdtbl_Y = new Array<number>(64);
  const fdtbl_UV = new Array<number>(64);

  // Clamp scale factor to sane range
  if (sf < 1) {
    sf = 1;
  }
  if (sf > 5000) {
    sf = 5000;
  }

  for (let i = 0; i < 64; i++) {
    let t = Math.floor((Y_LUMA_QT_BASE[i] * sf + 50) / 100);
    if (t < 1) {
      t = 1;
    }
    if (t > 255) {
      t = 255;
    }
    YTable[ZIG_ZAG[i]] = t;
  }

  for (let j = 0; j < 64; j++) {
    let u = Math.floor((UV_CHROMA_QT_BASE[j] * sf + 50) / 100);
    if (u < 1) {
      u = 1;
    }
    if (u > 255) {
      u = 255;
    }
    UVTable[ZIG_ZAG[j]] = u;
  }

  let k = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      fdtbl_Y[k] = 1.0 / (YTable[ZIG_ZAG[k]] * AA_SF[row] * AA_SF[col] * 8.0);
      fdtbl_UV[k] = 1.0 / (UVTable[ZIG_ZAG[k]] * AA_SF[row] * AA_SF[col] * 8.0);
      k++;
    }
  }

  return { YTable, UVTable, fdtbl_Y, fdtbl_UV };
}
