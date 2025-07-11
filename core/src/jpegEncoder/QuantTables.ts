/*
 * QuantTables – Generate JPEG quantisation & DCT-scaling tables
 * Extracted from legacy jp3g encoder and rewritten with TypeScript types.
 */

import { ZigZag, Y_BASE, UV_BASE, DCT_SCALING_FACTORS } from './Constants';

export interface IQuantTables {
  YTable: number[];
  UVTable: number[];
  fdtblY: number[];
  fdtblUV: number[];
}

/**
 * Calculate the JPEG scaling factor for a given quality (1-100) using the
 * standard libjpeg formula.
 */
function scaleFactor(quality: number): number {
  const q = Math.min(100, Math.max(1, quality));
  return q < 50 ? Math.floor(5000 / q) : Math.floor(200 - q * 2);
}

/**
 * Build luminance & chrominance quantisation tables plus DCT scaling tables.
 */
export function buildQuantTables(quality = 50): IQuantTables {
  const sf = scaleFactor(quality);

  const YTable = new Array<number>(64);
  const UVTable = new Array<number>(64);
  const fdtblY = new Array<number>(64);
  const fdtblUV = new Array<number>(64);

  // --- Quant tables ---
  for (let i = 0; i < 64; i++) {
    let t = Math.floor((Y_BASE[i] * sf + 50) / 100);
    if (t < 1) t = 1;
    else if (t > 255) t = 255;
    YTable[ZigZag[i]] = t;
  }

  for (let i = 0; i < 64; i++) {
    let u = Math.floor((UV_BASE[i] * sf + 50) / 100);
    if (u < 1) u = 1;
    else if (u > 255) u = 255;
    UVTable[ZigZag[i]] = u;
  }

  // --- DCT scaling factors (AA & N. L. J. scaling factors) ---
  for (let k = 0; k < 64; k++) {
    const i = ZigZag[k];
    const j = i & 7;
    const k2 = i >> 3;

    fdtblY[k] = 1.0 / (YTable[i] * DCT_SCALING_FACTORS[j] * DCT_SCALING_FACTORS[k2] * 8.0);
    fdtblUV[k] = 1.0 / (UVTable[i] * DCT_SCALING_FACTORS[j] * DCT_SCALING_FACTORS[k2] * 8.0);
  }

  return { YTable, UVTable, fdtblY, fdtblUV };
}
