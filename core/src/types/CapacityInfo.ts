/**
 * Message capacity information for an image
 */
export interface CapacityInfo {
  /** Total available pixels */
  totalPixels: number;

  /** Total available bits for encoding */
  availableBits: number;

  /** Maximum message capacity in bytes for the specified redundancy factor */
  capacity: number;

  /** Header overhead in bytes */
  headerSize: number;
}
