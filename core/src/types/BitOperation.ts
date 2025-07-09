/**
 * Record of a single bit operation during encoding/decoding
 * Used for debugging and validation
 */
export interface BitOperation {
  pixelIndex: number;
  channel: 'red' | 'green' | 'blue';
  originalValue: number;
  newValue: number;
  extractedBit: number;
}
