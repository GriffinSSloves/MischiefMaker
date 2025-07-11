/*
 * Simple singleton memory guard used by the jp3g decoder to prevent excessive
 * allocations when decoding untrusted input. Extracted for reuse and testing.
 */

let totalBytesAllocated = 0;
let maxMemoryUsageBytes = 0;

/**
 * Request an allocation of `increaseAmount` additional bytes. Throws if the
 * resulting total would exceed the previously set `maxMemoryUsageBytes`.
 */
export function requestMemoryAllocation(increaseAmount = 0): void {
  const totalMemoryImpactBytes = totalBytesAllocated + increaseAmount;
  if (totalMemoryImpactBytes > maxMemoryUsageBytes) {
    const exceededAmount = Math.ceil((totalMemoryImpactBytes - maxMemoryUsageBytes) / 1024 / 1024);
    throw new Error(`maxMemoryUsageInMB limit exceeded by at least ${exceededAmount}MB`);
  }

  totalBytesAllocated = totalMemoryImpactBytes;
}

/**
 * Reset the maximum number of bytes that may be allocated before an error is
 * thrown. Also clears the current accounting information.
 */
export function resetMaxMemoryUsage(maxBytes: number): void {
  totalBytesAllocated = 0;
  maxMemoryUsageBytes = maxBytes;
}

/** Get the number of bytes currently accounted for. */
export function getBytesAllocated(): number {
  return totalBytesAllocated;
}
