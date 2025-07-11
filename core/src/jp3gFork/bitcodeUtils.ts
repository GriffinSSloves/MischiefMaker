/*
 * Utility for building JPEG category and bitcode lookup tables.
 * These tables map a signed value in the range [-32767, 32767] to:
 *   1. its category (number of bits required to represent the absolute value)
 *   2. its bitcode representation `[code, length]` used by the encoder.
 *
 * The logic has been extracted from the legacy jp3g encoder so it can be reused
 * and unit-tested independently.
 */

export type BitcodeEntry = [number, number]; // [value, length]

export interface CategoryBitcodeTables {
  category: number[];
  bitcode: BitcodeEntry[];
}

const TABLE_SIZE = 65535; // Range mapping for values offset by +32767

/**
 * Build the `category` and `bitcode` lookup tables required by the JPEG encoder.
 *
 * Returns fresh arrays that callers can keep references to. The arrays are fully
 * populated for indices 0..65534 (mapping to input range [-32767, 32767]).
 */
export function buildCategoryAndBitcode(): CategoryBitcodeTables {
  const category = new Array<number>(TABLE_SIZE);
  const bitcode = new Array<BitcodeEntry>(TABLE_SIZE) as BitcodeEntry[];

  let nrlower = 1;
  let nrupper = 2;
  for (let cat = 1; cat <= 15; cat++) {
    // Positive numbers
    for (let nr = nrlower; nr < nrupper; nr++) {
      const index = 32767 + nr;
      category[index] = cat;
      bitcode[index] = [nr, cat];
    }
    // Negative numbers
    for (let nrneg = -(nrupper - 1); nrneg <= -nrlower; nrneg++) {
      const index = 32767 + nrneg;
      category[index] = cat;
      bitcode[index] = [nrupper - 1 + nrneg, cat];
    }
    nrlower <<= 1;
    nrupper <<= 1;
  }

  return { category, bitcode };
}
