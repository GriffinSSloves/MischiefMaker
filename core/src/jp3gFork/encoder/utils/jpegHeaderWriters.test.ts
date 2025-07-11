import { describe, it, expect } from 'vitest';
import { BitWriter } from './BitWriter';
import { writeAPP0, writeDQT, writeStandardDHT } from './jpegHeaderWriters';

describe('jpegHeaderWriters', () => {
  it('writeAPP0 writes 16-byte segment', () => {
    const bw = new BitWriter();
    writeAPP0(bw);
    const data = bw.getData();
    // Marker (2) + length (2) + 14 bytes payload = 18 bytes total
    expect(data.length).toBe(18);
    // Verify marker and length bytes
    expect(data[0]).toBe(0xff);
    expect(data[1]).toBe(0xe0);
    expect(data[2]).toBe(0); // length hi
    expect(data[3]).toBe(16); // length lo
  });

  it('writeDQT writes correct 132-byte payload', () => {
    const bw = new BitWriter();
    const qtY = new Array(64).fill(16); // dummy but valid tables
    const qtUV = new Array(64).fill(17);
    writeDQT(bw, qtY, qtUV);

    const data = bw.getData();
    // Marker(2)+Length(2)+130 payload => 134 total bytes
    expect(data.length).toBe(134);
    expect(data[0]).toBe(0xff);
    expect(data[1]).toBe(0xdb);
    // Length should be 0x00 0x84 (132)
    expect(data[2]).toBe(0x00);
    expect(data[3]).toBe(0x84);
  });

  it('writeStandardDHT writes expected length 0x01A2', () => {
    const bw = new BitWriter();
    writeStandardDHT(bw);
    const data = bw.getData();
    // Marker 0xFFC4
    expect(data[0]).toBe(0xff);
    expect(data[1]).toBe(0xc4);
    // length bytes 0x01 0xA2 -> 418 decimal
    expect(data[2]).toBe(0x01);
    expect(data[3]).toBe(0xa2);
    // Total bytes should equal length (418) + marker (2)
    const declaredLength = (data[2] << 8) | data[3];
    expect(data.length).toBe(declaredLength + 2);
  });
});
