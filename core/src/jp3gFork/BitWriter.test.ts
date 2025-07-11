import { describe, it, expect } from 'vitest';
import { BitWriter } from './BitWriter';

describe('BitWriter', () => {
  it('should write bytes and words correctly', () => {
    const bw = new BitWriter();
    bw.writeByte(0x12);
    bw.writeWord(0x3456);
    expect(Array.from(bw.getData())).toEqual([0x12, 0x34, 0x56]);
  });

  it('should write bits with stuffing', () => {
    const bw = new BitWriter();
    // Write 8 ones (value 0xFF, length 8) triggers stuffing automatically
    bw.writeBits([0xff, 8]);
    const data = Array.from(bw.getData());
    // Should contain 0xFF 0x00 after stuffing
    expect(data.slice(0, 2)).toEqual([0xff, 0x00]);
  });
});
