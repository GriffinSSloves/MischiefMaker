/**
 * JPEG marker parsing utilities for jp3g decoder.
 *
 * Extracted from the main decoder to improve maintainability and testability.
 * Handles parsing of various JPEG markers (APP0, APP1, DQT, DHT, SOF0, etc.).
 */

import { DCT_ZIG_ZAG as dctZigZag } from '../../constants/decoderConstants';
import { buildHuffmanTable } from './huffmanTable';
import { requestMemoryAllocation } from './memoryManager';

export interface JfifData {
  version: { major: number; minor: number };
  densityUnits: number;
  xDensity: number;
  yDensity: number;
  thumbWidth: number;
  thumbHeight: number;
  thumbData: Uint8Array;
}

export interface AdobeData {
  version: number;
  flags0: number;
  flags1: number;
  transformCode: number;
}

export interface FrameComponent {
  h: number;
  v: number;
  quantizationIdx: number;
  quantizationTable?: Int32Array;
  huffmanTableDC?: unknown;
  huffmanTableAC?: unknown;
  blocksPerLine?: number;
  blocksPerColumn?: number;
  blocks?: Int32Array[][];
  pred?: number;
}

export interface Frame {
  extended: boolean;
  progressive: boolean;
  precision: number;
  scanLines: number;
  samplesPerLine: number;
  components: Record<number, FrameComponent>;
  componentsOrder: number[];
  maxH?: number;
  maxV?: number;
  mcusPerLine?: number;
  mcusPerColumn?: number;
}

export interface MarkerParseContext {
  data: Uint8Array;
  offset: number;
  maxResolutionInPixels: number;
}

export interface MarkerParseResult<T = unknown> {
  data: T;
  newOffset: number;
}

/**
 * Read a 16-bit unsigned integer from the data stream
 */
export function readUint16(ctx: MarkerParseContext): number {
  const value = (ctx.data[ctx.offset] << 8) | ctx.data[ctx.offset + 1];
  ctx.offset += 2;
  return value;
}

/**
 * Read a data block with length prefix
 */
export function readDataBlock(ctx: MarkerParseContext): Uint8Array {
  const length = readUint16(ctx);
  const array = ctx.data.subarray(ctx.offset, ctx.offset + length - 2);
  ctx.offset += array.length;
  return array;
}

/**
 * Parse APP0 (JFIF) marker
 */
export function parseAPP0(appData: Uint8Array): JfifData | null {
  if (appData[0] === 0x4a && appData[1] === 0x46 && appData[2] === 0x49 && appData[3] === 0x46 && appData[4] === 0) {
    // 'JFIF\x00'
    return {
      version: { major: appData[5], minor: appData[6] },
      densityUnits: appData[7],
      xDensity: (appData[8] << 8) | appData[9],
      yDensity: (appData[10] << 8) | appData[11],
      thumbWidth: appData[12],
      thumbHeight: appData[13],
      thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13]),
    };
  }
  return null;
}

/**
 * Parse APP1 (EXIF) marker
 */
export function parseAPP1(appData: Uint8Array): Uint8Array | null {
  if (appData[0] === 0x45 && appData[1] === 0x78 && appData[2] === 0x69 && appData[3] === 0x66 && appData[4] === 0) {
    // 'EXIF\x00'
    return appData.subarray(5, appData.length);
  }
  return null;
}

/**
 * Parse APP14 (Adobe) marker
 */
export function parseAPP14(appData: Uint8Array): AdobeData | null {
  if (
    appData[0] === 0x41 &&
    appData[1] === 0x64 &&
    appData[2] === 0x6f &&
    appData[3] === 0x62 &&
    appData[4] === 0x65 &&
    appData[5] === 0
  ) {
    // 'Adobe\x00'
    return {
      version: appData[6],
      flags0: (appData[7] << 8) | appData[8],
      flags1: (appData[9] << 8) | appData[10],
      transformCode: appData[11],
    };
  }
  return null;
}

/**
 * Parse DQT (Define Quantization Tables) marker
 */
export function parseDQT(ctx: MarkerParseContext): MarkerParseResult<Int32Array[]> {
  const quantizationTables: Int32Array[] = [];
  const quantizationTablesLength = readUint16(ctx);
  const quantizationTablesEnd = quantizationTablesLength + ctx.offset - 2;

  while (ctx.offset < quantizationTablesEnd) {
    const quantizationTableSpec = ctx.data[ctx.offset++];
    requestMemoryAllocation(64 * 4);
    const tableData = new Int32Array(64);

    if (quantizationTableSpec >> 4 === 0) {
      // 8 bit values
      for (let j = 0; j < 64; j++) {
        const z = dctZigZag[j];
        tableData[z] = ctx.data[ctx.offset++];
      }
    } else if (quantizationTableSpec >> 4 === 1) {
      // 16 bit values
      for (let j = 0; j < 64; j++) {
        const z = dctZigZag[j];
        tableData[z] = readUint16(ctx);
      }
    } else {
      throw new Error('DQT: invalid table spec');
    }

    quantizationTables[quantizationTableSpec & 15] = tableData;
  }

  return {
    data: quantizationTables,
    newOffset: ctx.offset,
  };
}

/**
 * Parse DHT (Define Huffman Tables) marker
 */
export function parseDHT(ctx: MarkerParseContext): MarkerParseResult<{
  huffmanTablesAC: unknown[];
  huffmanTablesDC: unknown[];
}> {
  const huffmanTablesAC: unknown[] = [];
  const huffmanTablesDC: unknown[] = [];
  const huffmanLength = readUint16(ctx);

  for (let i = 2; i < huffmanLength; ) {
    const huffmanTableSpec = ctx.data[ctx.offset++];
    const codeLengths = new Uint8Array(16);
    let codeLengthSum = 0;

    for (let j = 0; j < 16; j++, ctx.offset++) {
      codeLengthSum += codeLengths[j] = ctx.data[ctx.offset];
    }

    requestMemoryAllocation(16 + codeLengthSum);
    const huffmanValues = new Uint8Array(codeLengthSum);

    for (let j = 0; j < codeLengthSum; j++, ctx.offset++) {
      huffmanValues[j] = ctx.data[ctx.offset];
    }

    i += 17 + codeLengthSum;

    const table = buildHuffmanTable(codeLengths, huffmanValues);
    if (huffmanTableSpec >> 4 === 0) {
      huffmanTablesDC[huffmanTableSpec & 15] = table;
    } else {
      huffmanTablesAC[huffmanTableSpec & 15] = table;
    }
  }

  return {
    data: { huffmanTablesAC, huffmanTablesDC },
    newOffset: ctx.offset,
  };
}

/**
 * Parse SOF0/SOF1/SOF2 (Start of Frame) marker
 */
export function parseSOF(ctx: MarkerParseContext, fileMarker: number): MarkerParseResult<Frame> {
  readUint16(ctx); // skip data length

  const frame: Frame = {
    extended: fileMarker === 0xffc1,
    progressive: fileMarker === 0xffc2,
    precision: ctx.data[ctx.offset++],
    scanLines: readUint16(ctx),
    samplesPerLine: readUint16(ctx),
    components: {},
    componentsOrder: [],
  };

  const pixelsInFrame = frame.scanLines * frame.samplesPerLine;
  if (pixelsInFrame > ctx.maxResolutionInPixels) {
    const exceededAmount = Math.ceil((pixelsInFrame - ctx.maxResolutionInPixels) / 1e6);
    throw new Error(`maxResolutionInMP limit exceeded by ${exceededAmount}MP`);
  }

  const componentsCount = ctx.data[ctx.offset++];

  for (let i = 0; i < componentsCount; i++) {
    const componentId = ctx.data[ctx.offset];
    const h = ctx.data[ctx.offset + 1] >> 4;
    const v = ctx.data[ctx.offset + 1] & 15;
    const qId = ctx.data[ctx.offset + 2];

    if (h <= 0 || v <= 0) {
      throw new Error('Invalid sampling factor, expected values above 0');
    }

    frame.componentsOrder.push(componentId);
    frame.components[componentId] = {
      h: h,
      v: v,
      quantizationIdx: qId,
    };
    ctx.offset += 3;
  }

  return {
    data: frame,
    newOffset: ctx.offset,
  };
}

/**
 * Parse DRI (Define Restart Interval) marker
 */
export function parseDRI(ctx: MarkerParseContext): MarkerParseResult<number> {
  readUint16(ctx); // skip data length
  const resetInterval = readUint16(ctx);

  return {
    data: resetInterval,
    newOffset: ctx.offset,
  };
}

/**
 * Parse DNL (Number of Lines) marker
 */
export function parseDNL(ctx: MarkerParseContext): MarkerParseResult<number> {
  readUint16(ctx); // skip data length
  const numberOfLines = readUint16(ctx); // Ignore this data since it represents the image height

  return {
    data: numberOfLines,
    newOffset: ctx.offset,
  };
}

/**
 * Parse SOS (Start of Scan) header
 */
export function parseSOSHeader(ctx: MarkerParseContext): MarkerParseResult<{
  selectorsCount: number;
  componentSelectors: number[];
  spectralStart: number;
  spectralEnd: number;
  successiveApproximation: number;
}> {
  readUint16(ctx); // skip scan length
  const selectorsCount = ctx.data[ctx.offset++];
  const componentSelectors: number[] = [];

  for (let i = 0; i < selectorsCount; i++) {
    const componentId = ctx.data[ctx.offset++];
    const tableSpec = ctx.data[ctx.offset++];
    componentSelectors.push(componentId, tableSpec);
  }

  const spectralStart = ctx.data[ctx.offset++];
  const spectralEnd = ctx.data[ctx.offset++];
  const successiveApproximation = ctx.data[ctx.offset++];

  return {
    data: {
      selectorsCount,
      componentSelectors,
      spectralStart,
      spectralEnd,
      successiveApproximation,
    },
    newOffset: ctx.offset,
  };
}

/**
 * Parse comment marker
 */
export function parseComment(appData: Uint8Array): string {
  return String.fromCharCode.apply(null, Array.from(appData));
}
