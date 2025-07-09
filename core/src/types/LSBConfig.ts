/**
 * LSB encoding configuration
 */
export interface LSBConfig {
  /** Number of LSBs to use per channel (1-3) */
  bitsPerChannel: number;

  /** Channels to use for encoding */
  channels: ('red' | 'green' | 'blue')[];

  /** Whether to randomize bit positions */
  randomizeBits: boolean;

  /** Seed for randomization (if enabled) */
  randomSeed?: number;

  /** Starting pixel offset for encoding */
  startOffset: number;
}
