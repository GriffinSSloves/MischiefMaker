/*
 * BitWriter encapsulates JPEG bitstream writing logic, including 0xFF byte
 * stuffing as required by the standard.
 */

export type BitSpec = [number, number]; // [value, length]

export class BitWriter {
  private byteout: number[] = [];
  private bytenew = 0;
  private bytepos = 7;

  /** Write an 8-bit value directly */
  writeByte(value: number): void {
    this.byteout.push(value & 0xff);
  }

  /** Write a 16-bit big-endian word */
  writeWord(value: number): void {
    this.writeByte((value >> 8) & 0xff);
    this.writeByte(value & 0xff);
  }

  /**
   * Write bits according to JPEG spec.
   * `bs` is [value, length] where `length` ≤ 16.
   */
  writeBits(bs: BitSpec): void {
    const value = bs[0];
    let posval = bs[1] - 1;
    while (posval >= 0) {
      if (value & (1 << posval)) {
        this.bytenew |= 1 << this.bytepos;
      }
      posval--;
      this.bytepos--;
      if (this.bytepos < 0) {
        // Stuff 0x00 after 0xFF per Annex B.1.1
        if (this.bytenew === 0xff) {
          this.writeByte(0xff);
          this.writeByte(0x00);
        } else {
          this.writeByte(this.bytenew);
        }
        this.bytepos = 7;
        this.bytenew = 0;
      }
    }
  }

  /** Retrieve Uint8Array of all bytes written so far */
  getData(): Uint8Array {
    return new Uint8Array(this.byteout);
  }

  /** Reset internal buffers (useful for reuse in tests) */
  reset(): void {
    this.byteout.length = 0;
    this.bytenew = 0;
    this.bytepos = 7;
  }
}
