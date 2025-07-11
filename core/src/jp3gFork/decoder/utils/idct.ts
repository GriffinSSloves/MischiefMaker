import {
  DCT_COS1 as dctCos1,
  DCT_SIN1 as dctSin1,
  DCT_COS3 as dctCos3,
  DCT_SIN3 as dctSin3,
  DCT_COS6 as dctCos6,
  DCT_SIN6 as dctSin6,
  DCT_SQRT2 as dctSqrt2,
  DCT_SQRT1D2 as dctSqrt1d2,
} from '../../constants/decoderConstants';

/**
 * Perform de-quantisation and inverse DCT on one 8×8 block.
 *
 * @param zz   Int32Array(64) of quantised coefficients in natural (zig-zag) order
 * @param qt   Quantisation table Int32Array(64) for this component
 * @param out  Destination Uint8Array(64) – receives 8-bit pixel values
 */
export function idctBlock(zz: Int32Array, qt: Int32Array, out: Uint8Array): void {
  // Internal working buffer
  const p = new Int32Array(64);

  // De-quantise
  for (let i = 0; i < 64; i++) {
    p[i] = zz[i] * qt[i];
  }

  // ---- inverse DCT on rows ----
  for (let i = 0; i < 8; ++i) {
    const row = 8 * i;
    // Shortcut: if all AC components are zero the IDCT is trivial
    if (
      p[1 + row] === 0 &&
      p[2 + row] === 0 &&
      p[3 + row] === 0 &&
      p[4 + row] === 0 &&
      p[5 + row] === 0 &&
      p[6 + row] === 0 &&
      p[7 + row] === 0
    ) {
      const t = (dctSqrt2 * p[0 + row] + 512) >> 10;
      p[0 + row] = t;
      p[1 + row] = t;
      p[2 + row] = t;
      p[3 + row] = t;
      p[4 + row] = t;
      p[5 + row] = t;
      p[6 + row] = t;
      p[7 + row] = t;
      continue;
    }

    let v0 = (dctSqrt2 * p[0 + row] + 128) >> 8;
    let v1 = (dctSqrt2 * p[4 + row] + 128) >> 8;
    let v2 = p[2 + row];
    let v3 = p[6 + row];
    let v4 = (dctSqrt1d2 * (p[1 + row] - p[7 + row]) + 128) >> 8;
    let v7 = (dctSqrt1d2 * (p[1 + row] + p[7 + row]) + 128) >> 8;
    let v5 = p[3 + row] << 4;
    let v6 = p[5 + row] << 4;

    let t = (v0 - v1 + 1) >> 1;
    v0 = (v0 + v1 + 1) >> 1;
    v1 = t;
    t = (v2 * dctSin6 + v3 * dctCos6 + 128) >> 8;
    v2 = (v2 * dctCos6 - v3 * dctSin6 + 128) >> 8;
    v3 = t;
    t = (v4 - v6 + 1) >> 1;
    v4 = (v4 + v6 + 1) >> 1;
    v6 = t;
    t = (v7 + v5 + 1) >> 1;
    v5 = (v7 - v5 + 1) >> 1;
    v7 = t;

    t = (v0 - v3 + 1) >> 1;
    v0 = (v0 + v3 + 1) >> 1;
    v3 = t;
    t = (v1 - v2 + 1) >> 1;
    v1 = (v1 + v2 + 1) >> 1;
    v2 = t;
    t = (v4 * dctSin3 + v7 * dctCos3 + 2048) >> 12;
    v4 = (v4 * dctCos3 - v7 * dctSin3 + 2048) >> 12;
    v7 = t;
    t = (v5 * dctSin1 + v6 * dctCos1 + 2048) >> 12;
    v5 = (v5 * dctCos1 - v6 * dctSin1 + 2048) >> 12;
    v6 = t;

    p[0 + row] = v0 + v7;
    p[7 + row] = v0 - v7;
    p[1 + row] = v1 + v6;
    p[6 + row] = v1 - v6;
    p[2 + row] = v2 + v5;
    p[5 + row] = v2 - v5;
    p[3 + row] = v3 + v4;
    p[4 + row] = v3 - v4;
  }

  // ---- inverse DCT on columns ----
  for (let i = 0; i < 8; ++i) {
    const col = i;
    if (
      p[1 * 8 + col] === 0 &&
      p[2 * 8 + col] === 0 &&
      p[3 * 8 + col] === 0 &&
      p[4 * 8 + col] === 0 &&
      p[5 * 8 + col] === 0 &&
      p[6 * 8 + col] === 0 &&
      p[7 * 8 + col] === 0
    ) {
      const t = (dctSqrt2 * p[0 * 8 + col] + 8192) >> 14;
      p[0 * 8 + col] = t;
      p[1 * 8 + col] = t;
      p[2 * 8 + col] = t;
      p[3 * 8 + col] = t;
      p[4 * 8 + col] = t;
      p[5 * 8 + col] = t;
      p[6 * 8 + col] = t;
      p[7 * 8 + col] = t;
      continue;
    }

    let v0 = (dctSqrt2 * p[0 * 8 + col] + 2048) >> 12;
    let v1 = (dctSqrt2 * p[4 * 8 + col] + 2048) >> 12;
    let v2 = p[2 * 8 + col];
    let v3 = p[6 * 8 + col];
    let v4 = (dctSqrt1d2 * (p[1 * 8 + col] - p[7 * 8 + col]) + 2048) >> 12;
    let v7 = (dctSqrt1d2 * (p[1 * 8 + col] + p[7 * 8 + col]) + 2048) >> 12;
    let v5 = p[3 * 8 + col];
    let v6 = p[5 * 8 + col];

    let t = (v0 - v1 + 1) >> 1;
    v0 = (v0 + v1 + 1) >> 1;
    v1 = t;
    t = (v2 * dctSin6 + v3 * dctCos6 + 2048) >> 12;
    v2 = (v2 * dctCos6 - v3 * dctSin6 + 2048) >> 12;
    v3 = t;
    t = (v4 - v6 + 1) >> 1;
    v4 = (v4 + v6 + 1) >> 1;
    v6 = t;
    t = (v7 + v5 + 1) >> 1;
    v5 = (v7 - v5 + 1) >> 1;
    v7 = t;

    t = (v0 - v3 + 1) >> 1;
    v0 = (v0 + v3 + 1) >> 1;
    v3 = t;
    t = (v1 - v2 + 1) >> 1;
    v1 = (v1 + v2 + 1) >> 1;
    v2 = t;
    t = (v4 * dctSin3 + v7 * dctCos3 + 2048) >> 12;
    v4 = (v4 * dctCos3 - v7 * dctSin3 + 2048) >> 12;
    v7 = t;
    t = (v5 * dctSin1 + v6 * dctCos1 + 2048) >> 12;
    v5 = (v5 * dctCos1 - v6 * dctSin1 + 2048) >> 12;
    v6 = t;

    p[0 * 8 + col] = v0 + v7;
    p[7 * 8 + col] = v0 - v7;
    p[1 * 8 + col] = v1 + v6;
    p[6 * 8 + col] = v1 - v6;
    p[2 * 8 + col] = v2 + v5;
    p[5 * 8 + col] = v2 - v5;
    p[3 * 8 + col] = v3 + v4;
    p[4 * 8 + col] = v3 - v4;
  }

  // ---- convert to 8-bit ----
  for (let i = 0; i < 64; ++i) {
    const sample = 128 + ((p[i] + 8) >> 4);
    out[i] = sample < 0 ? 0 : sample > 0xff ? 0xff : sample;
  }
}
