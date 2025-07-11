import { describe, it, expect, beforeEach } from 'vitest';
import { BitWriter } from './BitWriter';

describe('BitWriter', () => {
  let writer: BitWriter;

  beforeEach(() => {
    writer = new BitWriter();
  });

  it('writes bytes correctly', () => {
    writer.writeByte(0x12);
    writer.writeByte(0x34);

    const buffer = writer.getBuffer();
    expect(buffer).toEqual(new Uint8Array([0x12, 0x34]));
  });

  it('writes words correctly (big-endian)', () => {
    writer.writeWord(0x1234);

    const buffer = writer.getBuffer();
    expect(buffer).toEqual(new Uint8Array([0x12, 0x34]));
  });

  it('writes bits correctly', () => {
    // Write 3 bits: 101 (5 in decimal)
    writer.writeBits([5, 3]);

    const buffer = writer.getBuffer();
    // Should write 1 byte with the bits: 10100000 (0xA0)
    expect(buffer).toEqual(new Uint8Array([0xa0]));
  });

  it('handles bit overflow correctly', () => {
    // Write 8 bits to fill a byte
    writer.writeBits([0xff, 8]);
    // Write 4 more bits
    writer.writeBits([0x0a, 4]);

    const buffer = writer.getBuffer();
    // First byte: 11111111 (escaped), Second byte: 00000000 (escape), Third byte: 10100000
    expect(buffer).toEqual(new Uint8Array([0xff, 0x00, 0xa0]));
  });

  it('handles 0xFF escape sequences', () => {
    // Write a byte that would be 0xFF
    writer.writeBits([0xff, 8]);

    const buffer = writer.getBuffer();
    // Should escape 0xFF with an extra 0x00
    expect(buffer).toEqual(new Uint8Array([0xff, 0x00]));
  });

  it('resets correctly', () => {
    writer.writeByte(0x12);
    writer.reset();

    const buffer = writer.getBuffer();
    expect(buffer).toEqual(new Uint8Array([]));
    expect(writer.getLength()).toBe(0);
  });

  it('flushes remaining bits on getBuffer', () => {
    // Write 4 bits, leaving 4 bits in the buffer
    writer.writeBits([0x0a, 4]);

    const buffer = writer.getBuffer();
    // Should flush the remaining 4 bits as 10100000
    expect(buffer).toEqual(new Uint8Array([0xa0]));
  });
});
