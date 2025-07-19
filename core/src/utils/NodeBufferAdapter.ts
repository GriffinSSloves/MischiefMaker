import type { IBufferLike } from '../interfaces/IBufferLike';
import { Buffer } from 'buffer';

/**
 * Node.js-compatible Buffer adapter that implements IBufferLike using Node.js Buffer
 *
 * This adapter provides Buffer functionality using Node.js Buffer for test environments
 * and server-side applications.
 */
export class NodeBufferAdapter implements IBufferLike {
  /**
   * Allocate a new buffer of the specified size filled with zeros
   */
  alloc(size: number): Uint8Array {
    return Buffer.alloc(size);
  }

  /**
   * Create a buffer from various input types
   */
  from(data: ArrayLike<number> | ArrayBufferLike | string | Uint8Array): Uint8Array {
    if (typeof data === 'string') {
      return Buffer.from(data);
    }
    if (data instanceof Uint8Array) {
      return Buffer.from(data);
    }
    if (data instanceof ArrayBuffer) {
      return Buffer.from(data);
    }
    // Handle SharedArrayBuffer
    if (typeof SharedArrayBuffer !== 'undefined' && data instanceof SharedArrayBuffer) {
      return Buffer.from(data);
    }
    // Handle other TypedArray views
    if (ArrayBuffer.isView(data)) {
      return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    }
    // For ArrayLike<number> (arrays, etc.) - check if it has length property
    if ('length' in data && typeof data.length === 'number') {
      return Buffer.from(Array.from(data as ArrayLike<number>));
    }
    // Fallback: try to create buffer directly
    throw new Error('Unsupported data type for buffer creation');
  }

  /**
   * Check if two buffers are equal
   */
  equals(a: Uint8Array, b: Uint8Array): boolean {
    if (Buffer.isBuffer(a) && Buffer.isBuffer(b)) {
      return a.equals(b);
    }

    // Fallback to manual comparison for Uint8Arrays
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
    return Buffer.concat(buffers);
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
    if (Buffer.isBuffer(source)) {
      return source.copy(target as Buffer, targetStart, sourceStart, sourceEnd);
    }

    // Fallback for Uint8Arrays
    const actualSourceEnd = sourceEnd ?? source.length;
    const lengthToCopy = Math.min(actualSourceEnd - sourceStart, target.length - targetStart);

    if (lengthToCopy <= 0) {
      return 0;
    }

    for (let i = 0; i < lengthToCopy; i++) {
      target[targetStart + i] = source[sourceStart + i];
    }

    return lengthToCopy;
  }
}

/**
 * Singleton instance for convenient usage throughout Node.js applications
 */
export const nodeBufferAdapter = new NodeBufferAdapter();
