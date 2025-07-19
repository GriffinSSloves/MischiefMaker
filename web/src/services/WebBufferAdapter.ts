import type { IBufferLike } from '@mischiefmaker/core/src/interfaces/IBufferLike';

/**
 * Web-compatible Buffer adapter that implements IBufferLike using browser APIs
 *
 * This adapter provides Buffer-like functionality using standard web APIs
 * (Uint8Array, TextEncoder, etc.) to ensure compatibility across all browsers
 * without requiring Node.js polyfills.
 */
export class WebBufferAdapter implements IBufferLike {
  private textEncoder = new TextEncoder();

  /**
   * Allocate a new buffer of the specified size filled with zeros
   */
  alloc(size: number): Uint8Array {
    return new Uint8Array(size); // Automatically zero-filled
  }

  /**
   * Create a buffer from various input types
   */
  from(data: ArrayLike<number> | ArrayBufferLike | string | Uint8Array): Uint8Array {
    if (typeof data === 'string') {
      // Convert string to UTF-8 bytes
      return this.textEncoder.encode(data);
    }

    if (data instanceof Uint8Array) {
      // Return a copy to avoid mutations
      return new Uint8Array(data);
    }

    if (data instanceof ArrayBuffer) {
      return new Uint8Array(data);
    }

    if (Array.isArray(data) || 'length' in data) {
      // Handle array-like objects
      return new Uint8Array(data as ArrayLike<number>);
    }

    throw new Error('Unsupported data type for buffer creation');
  }

  /**
   * Check if two buffers are equal
   */
  equals(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Concatenate multiple buffers into one
   */
  concat(buffers: Uint8Array[]): Uint8Array {
    // Calculate total length
    const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);

    // Create result buffer
    const result = new Uint8Array(totalLength);

    // Copy each buffer into result
    let offset = 0;
    for (const buffer of buffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }

    return result;
  }

  /**
   * Copy data from one buffer to another
   */
  copy(
    source: Uint8Array,
    target: Uint8Array,
    targetStart: number = 0,
    sourceStart: number = 0,
    sourceEnd?: number
  ): number {
    // Determine actual source end
    const actualSourceEnd = sourceEnd ?? source.length;

    // Calculate length to copy
    const lengthToCopy = Math.min(actualSourceEnd - sourceStart, target.length - targetStart);

    if (lengthToCopy <= 0) {
      return 0;
    }

    // Create a view of the source data to copy
    const sourceSlice = source.subarray(sourceStart, sourceStart + lengthToCopy);

    // Copy into target
    target.set(sourceSlice, targetStart);

    return lengthToCopy;
  }
}

/**
 * Singleton instance for convenient usage throughout the web application
 */
export const webBufferAdapter = new WebBufferAdapter();
