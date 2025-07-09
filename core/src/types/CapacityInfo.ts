/**
 * Message capacity information for an image
 */
export interface CapacityInfo {
  /** Total available pixels */
  totalPixels: number;

  /** Total available bits for encoding */
  availableBits: number;

  /** Effective bits after redundancy/overhead */
  effectiveBits: number;

  /** Maximum message capacity in bytes (simple LSB) */
  simpleCapacity: number;

  /** Maximum message capacity in bytes (triple redundancy) */
  tripleCapacity: number;

  /** Header overhead in bytes */
  headerSize: number;
}
