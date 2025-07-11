/* General-purpose math helpers for decoder */

/** Clamp a number to the 0–255 byte range. */
export const clampTo8bit = (value: number): number => (value < 0 ? 0 : value > 255 ? 255 : value);
