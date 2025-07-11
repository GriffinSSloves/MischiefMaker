/*
 * BitWriter – Encapsulates JPEG bit/byte output with proper buffering
 * Extracted from legacy jp3g encoder and rewritten with TypeScript types.
 */

export interface IBitWriter {
  writeByte(value: number): void;
  writeWord(value: number): void;
  writeBits(bs: [number, number]): void; // [value, length]
  getBuffer(): Uint8Array;
  reset(): void;
}

export class BitWriter implements IBitWriter {
  private byteout: number[] = [];
  private bytenew = 0;
  private bytepos = 7;

  /**
   * Write a single byte to the output buffer
   */
  writeByte(value: number): void {
    this.byteout.push(value & 0xff);
  }

  /**
   * Write a 16-bit word (big-endian) to the output buffer
   */
  writeWord(value: number): void {
    this.writeByte((value >> 8) & 0xff);
    this.writeByte(value & 0xff);
  }

  /**
   * Write variable-length bit sequence
   * @param bs [value, length] - value to write and number of bits
   */
  writeBits(bs: [number, number]): void {
    const value = bs[0];
    let posval = bs[1] - 1;

    while (posval >= 0) {
      if (value & (1 << posval)) {
        this.bytenew |= 1 << this.bytepos;
      }
      posval--;
      this.bytepos--;

      if (this.bytepos < 0) {
        if (this.bytenew === 0xff) {
          this.writeByte(0xff);
          this.writeByte(0);
        } else {
          this.writeByte(this.bytenew);
        }
        this.bytepos = 7;
        this.bytenew = 0;
      }
    }
  }

  /**
   * Get the complete output buffer as Uint8Array
   */
  getBuffer(): Uint8Array {
    // Flush any remaining bits
    if (this.bytepos !== 7) {
      if (this.bytenew === 0xff) {
        this.writeByte(0xff);
        this.writeByte(0);
      } else {
        this.writeByte(this.bytenew);
      }
    }

    return new Uint8Array(this.byteout);
  }

  /**
   * Reset the writer for reuse
   */
  reset(): void {
    this.byteout = [];
    this.bytenew = 0;
    this.bytepos = 7;
  }

  /**
   * Get current buffer length (for debugging)
   */
  getLength(): number {
    return this.byteout.length;
  }

  /**
   * Get current bit position within the current byte (0-7)
   */
  getBitPosition(): number {
    return this.bytepos;
  }
}
