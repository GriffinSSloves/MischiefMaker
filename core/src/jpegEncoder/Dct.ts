/*
 * Dct – Forward DCT and quantization for JPEG encoding
 * Extracted from legacy jp3g encoder and rewritten with TypeScript types.
 */

import { ZigZag } from './Constants';

export interface IDctResult {
  coefficients: number[];
  zigzagOrder: number[];
}

/**
 * Perform forward DCT on 8x8 block and quantize with given table
 * @param data 64-element array representing 8x8 pixel block
 * @param fdtbl 64-element quantization table
 * @returns Quantized DCT coefficients in zig-zag order
 */
export function forwardDctQuantize(data: number[], fdtbl: number[]): number[] {
  const I8 = 8;
  const I64 = 64;
  let d0: number, d1: number, d2: number, d3: number, d4: number, d5: number, d6: number, d7: number;

  // Pass 1: process rows
  let dataOff = 0;
  for (let i = 0; i < I8; ++i) {
    d0 = data[dataOff];
    d1 = data[dataOff + 1];
    d2 = data[dataOff + 2];
    d3 = data[dataOff + 3];
    d4 = data[dataOff + 4];
    d5 = data[dataOff + 5];
    d6 = data[dataOff + 6];
    d7 = data[dataOff + 7];

    const tmp0 = d0 + d7;
    const tmp7 = d0 - d7;
    const tmp1 = d1 + d6;
    const tmp6 = d1 - d6;
    const tmp2 = d2 + d5;
    const tmp5 = d2 - d5;
    const tmp3 = d3 + d4;
    const tmp4 = d3 - d4;

    // Even part
    const tmp10 = tmp0 + tmp3; // phase 2
    const tmp13 = tmp0 - tmp3;
    const tmp11 = tmp1 + tmp2;
    const tmp12 = tmp1 - tmp2;

    data[dataOff] = tmp10 + tmp11; // phase 3
    data[dataOff + 4] = tmp10 - tmp11;

    const z1 = (tmp12 + tmp13) * 0.707106781; // c4
    data[dataOff + 2] = tmp13 + z1; // phase 5
    data[dataOff + 6] = tmp13 - z1;

    // Odd part
    const tmp10_odd = tmp4 + tmp5; // phase 2
    const tmp11_odd = tmp5 + tmp6;
    const tmp12_odd = tmp6 + tmp7;

    // The rotator is modified from fig 4-8 to avoid extra negations
    const z5 = (tmp10_odd - tmp12_odd) * 0.382683433; // c6
    const z2 = 0.5411961 * tmp10_odd + z5; // c2-c6
    const z4 = 1.306562965 * tmp12_odd + z5; // c2+c6
    const z3 = tmp11_odd * 0.707106781; // c4

    const z11 = tmp7 + z3; // phase 5
    const z13 = tmp7 - z3;

    data[dataOff + 5] = z13 + z2; // phase 6
    data[dataOff + 3] = z13 - z2;
    data[dataOff + 1] = z11 + z4;
    data[dataOff + 7] = z11 - z4;

    dataOff += 8; // advance pointer to next row
  }

  // Pass 2: process columns
  dataOff = 0;
  for (let i = 0; i < I8; ++i) {
    d0 = data[dataOff];
    d1 = data[dataOff + 8];
    d2 = data[dataOff + 16];
    d3 = data[dataOff + 24];
    d4 = data[dataOff + 32];
    d5 = data[dataOff + 40];
    d6 = data[dataOff + 48];
    d7 = data[dataOff + 56];

    const tmp0p2 = d0 + d7;
    const tmp7p2 = d0 - d7;
    const tmp1p2 = d1 + d6;
    const tmp6p2 = d1 - d6;
    const tmp2p2 = d2 + d5;
    const tmp5p2 = d2 - d5;
    const tmp3p2 = d3 + d4;
    const tmp4p2 = d3 - d4;

    // Even part
    const tmp10p2 = tmp0p2 + tmp3p2; // phase 2
    const tmp13p2 = tmp0p2 - tmp3p2;
    const tmp11p2 = tmp1p2 + tmp2p2;
    const tmp12p2 = tmp1p2 - tmp2p2;

    data[dataOff] = tmp10p2 + tmp11p2; // phase 3
    data[dataOff + 32] = tmp10p2 - tmp11p2;

    const z1p2 = (tmp12p2 + tmp13p2) * 0.707106781; // c4
    data[dataOff + 16] = tmp13p2 + z1p2; // phase 5
    data[dataOff + 48] = tmp13p2 - z1p2;

    // Odd part
    const tmp10p2_odd = tmp4p2 + tmp5p2; // phase 2
    const tmp11p2_odd = tmp5p2 + tmp6p2;
    const tmp12p2_odd = tmp6p2 + tmp7p2;

    // The rotator is modified from fig 4-8 to avoid extra negations
    const z5p2 = (tmp10p2_odd - tmp12p2_odd) * 0.382683433; // c6
    const z2p2 = 0.5411961 * tmp10p2_odd + z5p2; // c2-c6
    const z4p2 = 1.306562965 * tmp12p2_odd + z5p2; // c2+c6
    const z3p2 = tmp11p2_odd * 0.707106781; // c4

    const z11p2 = tmp7p2 + z3p2; // phase 5
    const z13p2 = tmp7p2 - z3p2;

    data[dataOff + 40] = z13p2 + z2p2; // phase 6
    data[dataOff + 24] = z13p2 - z2p2;
    data[dataOff + 8] = z11p2 + z4p2;
    data[dataOff + 56] = z11p2 - z4p2;

    dataOff++; // advance pointer to next column
  }

  // Quantize/descale the coefficients
  const outputfDCTQuant = new Array(64);
  for (let i = 0; i < I64; ++i) {
    // Apply the quantization and scaling factor & Round to nearest integer
    const fDCTQuant = data[i] * fdtbl[i];
    outputfDCTQuant[i] = fDCTQuant > 0.0 ? (fDCTQuant + 0.5) | 0 : (fDCTQuant - 0.5) | 0;
  }

  return outputfDCTQuant;
}

// Re-export ZigZag for backward compatibility
export { ZigZag };
