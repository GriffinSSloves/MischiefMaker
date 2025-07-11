import { buildCategoryAndBitcode } from './bitcodeUtils';

export interface IFrequencyTables {
  Y_DC_freq: number[];
  Y_AC_freq: number[];
  UV_DC_freq: number[];
  UV_AC_freq: number[];
}

/**
 * Calculate symbol frequencies for each of the four baseline JPEG Huffman
 * tables (Y DC, Y AC, UV DC, UV AC) given the quantised coefficient blocks of
 * an image.  The input must be an array `[Y, Cb, Cr]`, where each component is
 * a 2-D array of 8×8 blocks already quantised.
 */
export function getHuffmanFrequencies(quantizedComponents: any[][][]): IFrequencyTables {
  const { category } = buildCategoryAndBitcode();

  const Y_DC_freq = new Array(256).fill(0);
  const Y_AC_freq = new Array(256).fill(0);
  const UV_DC_freq = new Array(256).fill(0);
  const UV_AC_freq = new Array(256).fill(0);

  let lastDCY = 0,
    lastDCU = 0,
    lastDCV = 0;

  const component0 = quantizedComponents[0];
  const component1 = quantizedComponents[1];
  const component2 = quantizedComponents[2];

  for (let blockRow = 0; blockRow < component0.length; blockRow++) {
    for (let blockCol = 0; blockCol < component0[0].length; blockCol++) {
      // ---------- Y component ----------
      const yBlock = component0[blockRow][blockCol];
      const dcDiffY = yBlock[0] - lastDCY;
      lastDCY = yBlock[0];
      Y_DC_freq[category[32767 + dcDiffY]]++;

      let zeroRun = 0;
      for (let i = 1; i < 64; i++) {
        if (yBlock[i] === 0) {
          zeroRun++;
        } else {
          while (zeroRun >= 16) {
            Y_AC_freq[0xf0]++;
            zeroRun -= 16;
          }
          Y_AC_freq[(zeroRun << 4) | category[32767 + yBlock[i]]]++;
          zeroRun = 0;
        }
      }
      if (zeroRun > 0) Y_AC_freq[0x00]++;

      // ---------- Cb / Cr (4:2:0 sampling assumption) ----------
      if (blockRow % 2 === 0 && blockCol % 2 === 0) {
        const cbRow = Math.floor(blockRow / 2);
        const cbCol = Math.floor(blockCol / 2);

        // Cb
        const cbBlock = component1[cbRow][cbCol];
        const dcDiffU = cbBlock[0] - lastDCU;
        lastDCU = cbBlock[0];
        UV_DC_freq[category[32767 + dcDiffU]]++;
        zeroRun = 0;
        for (let i = 1; i < 64; i++) {
          if (cbBlock[i] === 0) zeroRun++;
          else {
            while (zeroRun >= 16) {
              UV_AC_freq[0xf0]++;
              zeroRun -= 16;
            }
            UV_AC_freq[(zeroRun << 4) | category[32767 + cbBlock[i]]]++;
            zeroRun = 0;
          }
        }
        if (zeroRun > 0) UV_AC_freq[0x00]++;

        // Cr
        const crBlock = component2[cbRow][cbCol];
        const dcDiffV = crBlock[0] - lastDCV;
        lastDCV = crBlock[0];
        UV_DC_freq[category[32767 + dcDiffV]]++;
        zeroRun = 0;
        for (let i = 1; i < 64; i++) {
          if (crBlock[i] === 0) zeroRun++;
          else {
            while (zeroRun >= 16) {
              UV_AC_freq[0xf0]++;
              zeroRun -= 16;
            }
            UV_AC_freq[(zeroRun << 4) | category[32767 + crBlock[i]]]++;
            zeroRun = 0;
          }
        }
        if (zeroRun > 0) UV_AC_freq[0x00]++;
      }
    }
  }

  return { Y_DC_freq, Y_AC_freq, UV_DC_freq, UV_AC_freq };
}
