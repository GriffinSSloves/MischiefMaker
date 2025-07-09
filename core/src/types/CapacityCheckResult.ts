import type { CapacityInfo } from './CapacityInfo';

/**
 * Capacity check result
 */
export interface CapacityCheckResult {
  /** Whether message fits in image */
  canFit: boolean;

  /** Capacity information */
  capacity: CapacityInfo;
}
