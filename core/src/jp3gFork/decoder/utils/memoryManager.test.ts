import { describe, it, expect } from 'vitest';
import { requestMemoryAllocation, resetMaxMemoryUsage, getBytesAllocated } from './memoryManager';

describe('decoder/utils/memoryManager', () => {
  it('should allow allocations within the limit', () => {
    resetMaxMemoryUsage(1024); // 1KB
    expect(() => requestMemoryAllocation(512)).not.toThrow();
    expect(getBytesAllocated()).toBe(512);
  });

  it('should throw when exceeding the limit', () => {
    resetMaxMemoryUsage(1000); // 1000 bytes
    requestMemoryAllocation(900);
    expect(() => requestMemoryAllocation(200)).toThrow();
  });

  it('should reset counters when limit is reset', () => {
    resetMaxMemoryUsage(2000);
    expect(getBytesAllocated()).toBe(0);
    requestMemoryAllocation(1000);
    expect(getBytesAllocated()).toBe(1000);
  });
});
