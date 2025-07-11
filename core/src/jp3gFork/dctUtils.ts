/* eslint-disable prefer-const */
/*
 * Forward Discrete Cosine Transform followed by quantisation.
 * Extracted from the legacy jp3g encoder and rewritten as a pure function.
 *
 * Inputs:
 *   data  – length-64 array of spatial domain samples (numbers)
 *   fdtbl – length-64 array of pre-computed divisors (see quantUtils)
 * Returns:
 *   Int16-like array (length 64) of quantised DCT coefficients.
 */

export function fDCTQuant(data: number[], fdtbl: number[]): number[] {
  if (data.length !== 64 || fdtbl.length !== 64) {
    throw new Error('fDCTQuant expects 64-element arrays');
  }

  // Clone to avoid mutating caller input
  data = data.slice();
  const output: number[] = new Array(64);

  let d0, d1, d2, d3, d4, d5, d6, d7;
  /* Pass 1: process rows. */
  let dataOff = 0;
  const I8 = 8;
  const I64 = 64;
  for (let i = 0; i < I8; ++i) {
    d0 = data[dataOff];
    d1 = data[dataOff + 1];
    d2 = data[dataOff + 2];
    d3 = data[dataOff + 3];
    d4 = data[dataOff + 4];
    d5 = data[dataOff + 5];
    d6 = data[dataOff + 6];
    d7 = data[dataOff + 7];

    let tmp0 = d0 + d7;
    let tmp7 = d0 - d7;
    let tmp1 = d1 + d6;
    let tmp6 = d1 - d6;
    let tmp2 = d2 + d5;
    let tmp5 = d2 - d5;
    let tmp3 = d3 + d4;
    let tmp4 = d3 - d4;

    /* Even part */
    let tmp10 = tmp0 + tmp3; /* phase 2 */
    let tmp13 = tmp0 - tmp3;
    let tmp11 = tmp1 + tmp2;
    let tmp12 = tmp1 - tmp2;

    data[dataOff] = tmp10 + tmp11; /* phase 3 */
    data[dataOff + 4] = tmp10 - tmp11;

    let z1 = (tmp12 + tmp13) * 0.707106781; /* c4 */
    data[dataOff + 2] = tmp13 + z1; /* phase 5 */
    data[dataOff + 6] = tmp13 - z1;

    /* Odd part */
    tmp10 = tmp4 + tmp5; /* phase 2 */
    tmp11 = tmp5 + tmp6;
    tmp12 = tmp6 + tmp7;

    /* The rotator is modified from fig 4-8 to avoid extra negations. */
    let z5 = (tmp10 - tmp12) * 0.382683433; /* c6 */
    let z2 = 0.5411961 * tmp10 + z5; /* c2-c6 */
    let z4 = 1.306562965 * tmp12 + z5; /* c2+c6 */
    let z3 = tmp11 * 0.707106781; /* c4 */

    let z11 = tmp7 + z3; /* phase 5 */
    let z13 = tmp7 - z3;

    data[dataOff + 5] = z13 + z2; /* phase 6 */
    data[dataOff + 3] = z13 - z2;
    data[dataOff + 1] = z11 + z4;
    data[dataOff + 7] = z11 - z4;

    dataOff += 8; /* advance pointer to next row */
  }

  /* Pass 2: process columns. */
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

    let tmp0p2 = d0 + d7;
    let tmp7p2 = d0 - d7;
    let tmp1p2 = d1 + d6;
    let tmp6p2 = d1 - d6;
    let tmp2p2 = d2 + d5;
    let tmp5p2 = d2 - d5;
    let tmp3p2 = d3 + d4;
    let tmp4p2 = d3 - d4;

    /* Even part */
    let tmp10p2 = tmp0p2 + tmp3p2; /* phase 2 */
    let tmp13p2 = tmp0p2 - tmp3p2;
    let tmp11p2 = tmp1p2 + tmp2p2;
    let tmp12p2 = tmp1p2 - tmp2p2;

    data[dataOff] = tmp10p2 + tmp11p2; /* phase 3 */
    data[dataOff + 32] = tmp10p2 - tmp11p2;

    let z1p2 = (tmp12p2 + tmp13p2) * 0.707106781; /* c4 */
    data[dataOff + 16] = tmp13p2 + z1p2; /* phase 5 */
    data[dataOff + 48] = tmp13p2 - z1p2;

    /* Odd part */
    tmp10p2 = tmp4p2 + tmp5p2; /* phase 2 */
    tmp11p2 = tmp5p2 + tmp6p2;
    tmp12p2 = tmp6p2 + tmp7p2;

    /* The rotator is modified from fig 4-8 to avoid extra negations. */
    let z5p2 = (tmp10p2 - tmp12p2) * 0.382683433; /* c6 */
    let z2p2 = 0.5411961 * tmp10p2 + z5p2; /* c2-c6 */
    let z4p2 = 1.306562965 * tmp12p2 + z5p2; /* c2+c6 */
    let z3p2 = tmp11p2 * 0.707106781; /* c4 */

    let z11p2 = tmp7p2 + z3p2; /* phase 5 */
    let z13p2 = tmp7p2 - z3p2;

    data[dataOff + 40] = z13p2 + z2p2; /* phase 6 */
    data[dataOff + 24] = z13p2 - z2p2;
    data[dataOff + 8] = z11p2 + z4p2;
    data[dataOff + 56] = z11p2 - z4p2;

    dataOff++; /* advance pointer to next column */
  }

  /* Quantise / descale coefficients */
  for (let i = 0; i < I64; ++i) {
    const fDCTQuant = data[i] * fdtbl[i];
    output[i] = fDCTQuant > 0 ? (fDCTQuant + 0.5) | 0 : (fDCTQuant - 0.5) | 0;
  }

  return output;
}
