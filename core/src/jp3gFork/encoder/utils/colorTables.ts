/*
 * RGB→YUV lookup table builder extracted from the legacy jp3g encoder.
 *
 * The original encoder populated a 2048-element table where indices are:
 *   0-255   : 19595 * i (R to Y contribution)
 *   256-511 : 38470 * i (G to Y contribution)
 *   512-767 :  7471 * i + 0x8000 (B to Y contribution + rounding)
 *   768-1023: -11059 * i (R to U contribution)
 *   1024-1279:-21709 * i (G to U contribution)
 *   1280-1535: 32768 * i + 0x807FFF (B to U contribution + offset)
 *   1536-1791:-27439 * i (R to V contribution)
 *   1792-2047: -5329 * i (G to V contribution)
 *
 * These constants come from the standard JPEG colorspace conversion matrix.
 */

export const RGB_YUV_TABLE_LENGTH = 2048 as const;

/**
 * Build the RGB→YUV lookup table used by the JPEG encoder.
 */
export function buildRgbYuvLookupTable(): number[] {
  const table = new Array<number>(RGB_YUV_TABLE_LENGTH);
  for (let i = 0; i < 256; i++) {
    table[i] = 19595 * i;
    table[i + 256] = 38470 * i;
    table[i + 512] = 7471 * i + 0x8000;
    table[i + 768] = -11059 * i;
    table[i + 1024] = -21709 * i;
    table[i + 1280] = 32768 * i + 0x807fff;
    table[i + 1536] = -27439 * i;
    table[i + 1792] = -5329 * i;
  }
  return table;
}
