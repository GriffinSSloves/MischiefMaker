import { BitWriter } from './BitWriter';
import { generateHuffmanNrcodesValues, HuffmanTable } from './huffmanUtils';
import {
  STD_DC_LUMINANCE_NRCODES,
  STD_DC_LUMINANCE_VALUES,
  STD_AC_LUMINANCE_NRCODES,
  STD_AC_LUMINANCE_VALUES,
  STD_DC_CHROMINANCE_NRCODES,
  STD_DC_CHROMINANCE_VALUES,
  STD_AC_CHROMINANCE_NRCODES,
  STD_AC_CHROMINANCE_VALUES,
} from './huffmanConstants';

export function writeAPP0(writer: BitWriter): void {
  writer.writeWord(0xffe0); // APP0 marker
  writer.writeWord(16); // segment length
  writer.writeByte(0x4a); // "JFIF\0"
  writer.writeByte(0x46);
  writer.writeByte(0x49);
  writer.writeByte(0x46);
  writer.writeByte(0);
  writer.writeByte(1); // version hi
  writer.writeByte(1); // version lo
  writer.writeByte(0); // xy units
  writer.writeWord(1); // x density
  writer.writeWord(1); // y density
  writer.writeByte(0); // thumb width
  writer.writeByte(0); // thumb height
}

export function writeAPP1(writer: BitWriter, exifBuffer?: Uint8Array): void {
  if (!exifBuffer) {
    return;
  }

  writer.writeWord(0xffe1); // APP1 marker

  if (exifBuffer[0] === 0x45 && exifBuffer[1] === 0x78 && exifBuffer[2] === 0x69 && exifBuffer[3] === 0x66) {
    writer.writeWord(exifBuffer.length + 2);
  } else {
    writer.writeWord(exifBuffer.length + 7); // EXIF\0 + length field
    writer.writeByte(0x45);
    writer.writeByte(0x78);
    writer.writeByte(0x69);
    writer.writeByte(0x66);
    writer.writeByte(0);
  }
  for (let i = 0; i < exifBuffer.length; i++) {
    writer.writeByte(exifBuffer[i]);
  }
}

export function writeCOM(writer: BitWriter, comments?: string[]): void {
  if (!comments || comments.length === 0) {
    return;
  }
  for (const c of comments) {
    if (typeof c !== 'string') {
      continue;
    }

    writer.writeWord(0xfffe);
    writer.writeWord(c.length + 2);
    for (let i = 0; i < c.length; i++) {
      writer.writeByte(c.charCodeAt(i));
    }
  }
}

export function writeSOF0(writer: BitWriter, width: number, height: number): void {
  writer.writeWord(0xffc0);
  writer.writeWord(17);
  writer.writeByte(8); // precision
  writer.writeWord(height);
  writer.writeWord(width);
  writer.writeByte(3); // components
  writer.writeByte(1); // IdY
  writer.writeByte(0x11);
  writer.writeByte(0); // QT for Y
  writer.writeByte(2); // IdU
  writer.writeByte(0x11);
  writer.writeByte(1); // QT for U
  writer.writeByte(3); // IdV
  writer.writeByte(0x11);
  writer.writeByte(1); // QT for V
}

export function writeSOS(writer: BitWriter): void {
  writer.writeWord(0xffda);
  writer.writeWord(12);
  writer.writeByte(3);
  writer.writeByte(1);
  writer.writeByte(0);
  writer.writeByte(2);
  writer.writeByte(0x11);
  writer.writeByte(3);
  writer.writeByte(0x11);
  writer.writeByte(0);
  writer.writeByte(0x3f);
  writer.writeByte(0);
}

/**
 * Write Define Quantisation Table (DQT) segment for two 8×8 tables: luminance
 * (id 0) and chrominance (id 1). Both tables must contain exactly 64 entries.
 */
export function writeDQT(writer: BitWriter, YTable: number[], UVTable: number[]): void {
  if (YTable.length !== 64 || UVTable.length !== 64) {
    throw new Error('writeDQT: quant tables must have length 64');
  }

  writer.writeWord(0xffdb); // DQT marker
  writer.writeWord(132); // segment length: 2×(1 + 64) = 130 + 2 length bytes

  writer.writeByte(0); // Pq=0 (8-bit), Tq=0 (luminance)
  for (let i = 0; i < 64; i++) {
    writer.writeByte(YTable[i]);
  }

  writer.writeByte(1); // Pq=0, Tq=1 (chrominance)
  for (let i = 0; i < 64; i++) {
    writer.writeByte(UVTable[i]);
  }
}

/**
 * Write Define Huffman Table (DHT) segment for the four baseline tables that
 * were optimised per-image. Takes the actual Huffman tables (symbol→[code,len])
 * so we can derive `nrcodes`/`values` on the fly.
 */
export function writeDHT(
  writer: BitWriter,
  YDC_HT: HuffmanTable,
  YAC_HT: HuffmanTable,
  UVDC_HT: HuffmanTable,
  UVAC_HT: HuffmanTable
): void {
  writer.writeWord(0xffc4); // DHT marker

  const YDC = generateHuffmanNrcodesValues(YDC_HT);
  const YAC = generateHuffmanNrcodesValues(YAC_HT);
  const UVDC = generateHuffmanNrcodesValues(UVDC_HT);
  const UVAC = generateHuffmanNrcodesValues(UVAC_HT);

  let length = 2; // the length field itself will follow
  length += 1 + 16 + YDC.values.length;
  length += 1 + 16 + YAC.values.length;
  length += 1 + 16 + UVDC.values.length;
  length += 1 + 16 + UVAC.values.length;

  writer.writeWord(length);

  // Helper to emit a single (nrcodes/values) table
  const emitTable = (nrcodes: number[], values: number[], tableClass: number, tableId: number) => {
    writer.writeByte((tableClass << 4) | tableId);
    for (let i = 0; i < 16; i++) {
      writer.writeByte(nrcodes[i]);
    }
    for (const v of values) {
      writer.writeByte(v);
    }
  };

  emitTable(YDC.nrcodes, YDC.values, 0, 0); // Y DC
  emitTable(YAC.nrcodes, YAC.values, 1, 0); // Y AC
  emitTable(UVDC.nrcodes, UVDC.values, 0, 1); // UV DC
  emitTable(UVAC.nrcodes, UVAC.values, 1, 1); // UV AC
}

/**
 * Write the *standard* (non-optimised) Huffman tables defined in Annex K.3 of
 * the JPEG spec. Most baseline encoders emit these verbatim.
 */
export function writeStandardDHT(writer: BitWriter): void {
  writer.writeWord(0xffc4);
  writer.writeWord(0x01a2); // hard-coded total length for four tables

  const writeTable = (nrcodes: readonly number[], values: readonly number[], tableClass: number, tableId: number) => {
    writer.writeByte((tableClass << 4) | tableId);
    for (let i = 1; i <= 16; i++) {
      writer.writeByte(nrcodes[i] as number);
    }
    for (const v of values) {
      writer.writeByte(v as number);
    }
  };

  // Luminance DC (class 0, id 0)
  writeTable(STD_DC_LUMINANCE_NRCODES, STD_DC_LUMINANCE_VALUES, 0, 0);
  // Luminance AC (class 1, id 0)
  writeTable(STD_AC_LUMINANCE_NRCODES, STD_AC_LUMINANCE_VALUES, 1, 0);
  // Chrominance DC (class 0, id 1)
  writeTable(STD_DC_CHROMINANCE_NRCODES, STD_DC_CHROMINANCE_VALUES, 0, 1);
  // Chrominance AC (class 1, id 1)
  writeTable(STD_AC_CHROMINANCE_NRCODES, STD_AC_CHROMINANCE_VALUES, 1, 1);
}
