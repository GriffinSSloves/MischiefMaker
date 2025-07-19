/**
 * Platform-agnostic buffer interface for cross-platform compatibility
 *
 * This interface abstracts buffer operations to allow the core library
 * to work across Node.js, browser, and React Native environments without
 * direct dependencies on platform-specific Buffer implementations.
 */
export interface IBufferLike {
  /**
   * Allocate a new buffer of the specified size filled with zeros
   * @param size - The size of the buffer to allocate
   * @returns A new buffer-like object of the specified size
   */
  alloc(size: number): Uint8Array;

  /**
   * Create a buffer from various input types
   * @param data - The data to create a buffer from
   * @returns A new buffer-like object containing the data
   */
  from(data: ArrayLike<number> | ArrayBufferLike | string | Uint8Array): Uint8Array;

  /**
   * Check if two buffers are equal
   * @param a - First buffer to compare
   * @param b - Second buffer to compare
   * @returns True if buffers have identical content
   */
  equals(a: Uint8Array, b: Uint8Array): boolean;

  /**
   * Concatenate multiple buffers into one
   * @param buffers - Array of buffers to concatenate
   * @returns A new buffer containing all input buffers concatenated
   */
  concat(buffers: Uint8Array[]): Uint8Array;

  /**
   * Copy data from one buffer to another
   * @param source - Source buffer to copy from
   * @param target - Target buffer to copy to
   * @param targetStart - Starting position in target buffer
   * @param sourceStart - Starting position in source buffer
   * @param sourceEnd - Ending position in source buffer
   * @returns Number of bytes copied
   */
  copy(source: Uint8Array, target: Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
}
