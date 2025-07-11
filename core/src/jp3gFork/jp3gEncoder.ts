/* eslint-disable */
// @ts-nocheck
/*
  Copyright (c) 2008, Adobe Systems Incorporated
  All rights reserved.

  Redistribution and use in source and binary forms, with or without 
  modification, are permitted provided that the following conditions are
  met:

  * Redistributions of source code must retain the above copyright notice, 
    this list of conditions and the following disclaimer.
  
  * Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in the 
    documentation and/or other materials provided with the distribution.
  
  * Neither the name of Adobe Systems Incorporated nor the names of its 
    contributors may be used to endorse or promote products derived from 
    this software without specific prior written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
  IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR 
  CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
/*
JPEG encoder ported to JavaScript and optimized by Andreas Ritter, www.bytestrom.eu, 11/2009

Basic GUI blocking jpeg encoder
*/

// ---------------------------------------------------------------------------
// Fork modifications © 2025 MischiefMaker contributors
// – Steganography extensions, TypeScript migration scaffolding and API tweaks
// ---------------------------------------------------------------------------

import { ZIG_ZAG } from './constants';
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
import { Y_LUMA_QT_BASE, UV_CHROMA_QT_BASE, AA_SF } from './quantTables';
import { computeHuffmanTable, HuffmanTable } from './huffmanUtils';
import { buildCategoryAndBitcode } from './bitcodeUtils';
import { getHuffmanFrequencies } from './huffmanFrequency';
import { buildRgbYuvLookupTable } from './colorTables';
import { buildQuantTables } from './quantUtils';
import { fDCTQuant as dctQuant } from './dctUtils';
import { BitWriter, BitSpec } from './BitWriter';
import {
  writeAPP0,
  writeAPP1,
  writeSOF0,
  writeCOM,
  writeSOS,
  writeDQT as writeDQTHeader,
  writeDHT as writeDHTHeader,
  writeStandardDHT as writeStandardDHTHeader,
} from './jpegHeaderWriters';

// Polyfill for `btoa` to support Node environments – typed for TS strict mode
const btoaFn: (buf: Uint8Array | number[]) => string =
  (typeof globalThis !== 'undefined' && (globalThis as any).btoa) ||
  ((buf: Uint8Array | number[]) => Buffer.from(buf).toString('base64'));

function JPEGEncoder(this: any, quality: number = 50) {
  // -------------------------------------------------------------------------
  // Internal state (typed)
  // -------------------------------------------------------------------------
  let YTable: number[] = new Array(64);
  let UVTable: number[] = new Array(64);
  let fdtbl_Y: number[] = new Array(64);
  let fdtbl_UV: number[] = new Array(64);

  // Huffman tables: index = symbol, value = [code, length]
  let YDC_HT!: HuffmanTable;
  let UVDC_HT!: HuffmanTable;
  let YAC_HT!: HuffmanTable;
  let UVAC_HT!: HuffmanTable;

  // Category / bitcode lookup (index = 32767 + signed value)
  let category: number[] = new Array(65535);
  let bitcode: Array<[number, number]> = new Array(65535) as Array<[number, number]>;

  // Working buffers
  const bitWriter = new BitWriter();
  const DU: number[] = new Array(64);
  const YDU: number[] = new Array(64);
  const UDU: number[] = new Array(64);
  const VDU: number[] = new Array(64);
  const clt: string[] = new Array(256);
  let RGB_YUV_TABLE: number[] = new Array(2048);

  let currentQuality: number;

  const ZigZag = ZIG_ZAG;

  // Local copies of the spec tables (so we can mutate them safely)
  const std_dc_luminance_nrcodes = Array.from(STD_DC_LUMINANCE_NRCODES);
  const std_dc_luminance_values = Array.from(STD_DC_LUMINANCE_VALUES);
  const std_ac_luminance_nrcodes = Array.from(STD_AC_LUMINANCE_NRCODES);
  const std_ac_luminance_values = Array.from(STD_AC_LUMINANCE_VALUES);

  const std_dc_chrominance_nrcodes = Array.from(STD_DC_CHROMINANCE_NRCODES);
  const std_dc_chrominance_values = Array.from(STD_DC_CHROMINANCE_VALUES);
  const std_ac_chrominance_nrcodes = Array.from(STD_AC_CHROMINANCE_NRCODES);
  const std_ac_chrominance_values = Array.from(STD_AC_CHROMINANCE_VALUES);

  function initQuantTables(sf: number) {
    const { YTable: yT, UVTable: uvT, fdtbl_Y: fdY, fdtbl_UV: fdUV } = buildQuantTables(sf);
    YTable = yT;
    UVTable = uvT;
    fdtbl_Y = fdY;
    fdtbl_UV = fdUV;
  }

  const computeHuffmanTbl = computeHuffmanTable;

  function initHuffmanTbl() {
    YDC_HT = computeHuffmanTbl(std_dc_luminance_nrcodes, std_dc_luminance_values);
    UVDC_HT = computeHuffmanTbl(std_dc_chrominance_nrcodes, std_dc_chrominance_values);
    YAC_HT = computeHuffmanTbl(std_ac_luminance_nrcodes, std_ac_luminance_values);
    UVAC_HT = computeHuffmanTbl(std_ac_chrominance_nrcodes, std_ac_chrominance_values);
  }

  function initCategoryNumber() {
    const { category: catTbl, bitcode: bcTbl } = buildCategoryAndBitcode();
    category = catTbl;
    bitcode = bcTbl;
  }

  function initRGBYUVTable() {
    RGB_YUV_TABLE = buildRgbYuvLookupTable();
  }

  // IO functions
  function writeBits(bs: BitSpec): void {
    bitWriter.writeBits(bs);
  }

  function writeByte(value: number): void {
    bitWriter.writeByte(value);
  }

  function writeWord(value: number): void {
    bitWriter.writeWord(value);
  }

  // DCT & quantization core – delegate to shared util
  const fDCTQuant = dctQuant;

  // Local header writer wrappers now delegate to shared utilities.
  const writeAPP0Wrapper = () => writeAPP0(bitWriter);
  const writeAPP1Wrapper = (buf?: Uint8Array | null) => {
    if (buf) writeAPP1(bitWriter, buf);
  };
  const writeSOF0Wrapper = (w: number, h: number) => writeSOF0(bitWriter, w, h);
  const writeCOMWrapper = (c?: string[]) => writeCOM(bitWriter, c);
  const writeSOSWrapper = () => writeSOS(bitWriter);

  const writeDQTWrapper = () => writeDQTHeader(bitWriter, YTable, UVTable);
  const writeDHTWrapper = () => writeDHTHeader(bitWriter, YDC_HT, YAC_HT, UVDC_HT, UVAC_HT);
  const writeStandardDHTWrapper = () => writeStandardDHTHeader(bitWriter);

  function processDUFromCoefficients(
    dctCoefficients: number[],
    DC: number,
    HTDC: HuffmanTable,
    HTAC: HuffmanTable
  ): number {
    const EOB = HTAC[0x00];
    const M16zeroes = HTAC[0xf0];
    var pos;
    var I16 = 16;
    var I63 = 63;

    // The coefficients are already quantized, so we just need to reorder them
    for (var j = 0; j < 64; ++j) {
      DU[ZigZag[j]] = dctCoefficients[j];
    }

    // Calculate DC difference
    var DC_val = DU[0] - DC;
    DC = DU[0];

    // Encode DC
    if (DC_val == 0) {
      writeBits(HTDC[0]);
    } else {
      pos = 32767 + DC_val;
      writeBits(HTDC[category[pos]]);
      writeBits(bitcode[pos]);
    }

    // Encode ACs
    var end0pos = 63;
    for (; end0pos > 0 && DU[end0pos] == 0; end0pos--) {}

    if (end0pos == 0) {
      writeBits(EOB);
      return DC;
    }

    var i = 1;
    var lng;
    while (i <= end0pos) {
      var startpos = i;
      for (; DU[i] == 0 && i <= end0pos; ++i) {}
      var nrzeroes = i - startpos;
      if (nrzeroes >= I16) {
        lng = nrzeroes >> 4;
        for (let nrmarker = 1; nrmarker <= lng; ++nrmarker) writeBits(M16zeroes);
        nrzeroes = nrzeroes & 0xf;
      }
      pos = 32767 + DU[i];
      writeBits(HTAC[(nrzeroes << 4) + category[pos]]);
      writeBits(bitcode[pos]);
      i++;
    }

    if (end0pos != I63) {
      writeBits(EOB);
    }
    return DC;
  }

  function processDU(CDU: number[], fdtbl: number[], DC: number, HTDC: HuffmanTable, HTAC: HuffmanTable): number {
    const EOB = HTAC[0x00];
    const M16zeroes = HTAC[0xf0];
    var pos;
    var I16 = 16;
    var I63 = 63;
    var I64 = 64;
    var DU_DCT = fDCTQuant(CDU, fdtbl);
    //ZigZag reorder
    for (var j = 0; j < I64; ++j) {
      DU[ZigZag[j]] = DU_DCT[j];
    }
    var Diff = DU[0] - DC;
    DC = DU[0];
    //Encode DC
    if (Diff == 0) {
      writeBits(HTDC[0]); // Diff might be 0
    } else {
      pos = 32767 + Diff;
      writeBits(HTDC[category[pos]]);
      writeBits(bitcode[pos]);
    }
    //Encode ACs
    var end0pos = 63; // was const... which is crazy
    for (; end0pos > 0 && DU[end0pos] == 0; end0pos--) {}
    //end0pos = first element in reverse order !=0
    if (end0pos == 0) {
      writeBits(EOB);
      return DC;
    }
    var i = 1;
    var lng;
    while (i <= end0pos) {
      var startpos = i;
      for (; DU[i] == 0 && i <= end0pos; ++i) {}
      var nrzeroes = i - startpos;
      if (nrzeroes >= I16) {
        lng = nrzeroes >> 4;
        for (let nrmarker = 1; nrmarker <= lng; ++nrmarker) writeBits(M16zeroes);
        nrzeroes = nrzeroes & 0xf;
      }
      pos = 32767 + DU[i];
      writeBits(HTAC[(nrzeroes << 4) + category[pos]]);
      writeBits(bitcode[pos]);
      i++;
    }
    if (end0pos != I63) {
      writeBits(EOB);
    }
    return DC;
  }

  function initCharLookupTable() {
    var sfcc = String.fromCharCode;
    for (var i = 0; i < 256; i++) {
      ///// ACHTUNG // 255
      clt[i] = sfcc(i);
    }
  }

  this.encode = (image: IRgbaImage, quality?: number) => {
    // image data object
    var time_start = new Date().getTime();

    if (quality) setQuality(quality);

    // Initialize bit writer
    bitWriter.reset();

    // Add JPEG headers
    writeWord(0xffd8); // SOI
    writeAPP0Wrapper();
    writeCOMWrapper(image.comments);
    writeAPP1Wrapper(image.exifBuffer);
    writeDQTWrapper();
    writeSOF0Wrapper(image.width, image.height);
    writeDHTWrapper();
    writeSOSWrapper();

    // Encode 8x8 macroblocks
    var DCY = 0;
    var DCU = 0;
    var DCV = 0;

    var imageData = image.data;
    var width = image.width;
    var height = image.height;

    var quadWidth = width * 4;
    var tripleWidth = width * 3;

    var x,
      y = 0;
    var r, g, b;
    var start, p, col, row, pos;
    while (y < height) {
      x = 0;
      while (x < quadWidth) {
        start = quadWidth * y + x;
        p = start;
        col = -1;
        row = 0;

        for (pos = 0; pos < 64; pos++) {
          row = pos >> 3; // /8
          col = (pos & 7) * 4; // %8
          p = start + row * quadWidth + col;

          if (y + row >= height) {
            // padding bottom
            p -= quadWidth * (y + 1 + row - height);
          }

          if (x + col >= quadWidth) {
            // padding right
            p -= x + col - quadWidth + 4;
          }

          r = imageData[p++];
          g = imageData[p++];
          b = imageData[p++];

          // use lookup table (slightly faster)
          YDU[pos] = ((RGB_YUV_TABLE[r] + RGB_YUV_TABLE[(g + 256) >> 0] + RGB_YUV_TABLE[(b + 512) >> 0]) >> 16) - 128;
          UDU[pos] =
            ((RGB_YUV_TABLE[(r + 768) >> 0] + RGB_YUV_TABLE[(g + 1024) >> 0] + RGB_YUV_TABLE[(b + 1280) >> 0]) >> 16) -
            128;
          VDU[pos] =
            ((RGB_YUV_TABLE[(r + 1280) >> 0] + RGB_YUV_TABLE[(g + 1536) >> 0] + RGB_YUV_TABLE[(b + 1792) >> 0]) >> 16) -
            128;
        }

        DCY = processDU(YDU, fdtbl_Y, DCY, YDC_HT, YAC_HT);
        DCU = processDU(UDU, fdtbl_UV, DCU, UVDC_HT, UVAC_HT);
        DCV = processDU(VDU, fdtbl_UV, DCV, UVDC_HT, UVAC_HT);
        x += 32;
      }
      y += 8;
    }

    ////////////////////////////////////////////////////////////////

    // Do the bit alignment of the EOI marker
    const pendingBits = bitWriter.getPendingBitCount();
    if (pendingBits >= 0) {
      const fillbits: BitSpec = [(1 << (pendingBits + 1)) - 1, pendingBits + 1];
      writeBits(fillbits);
    }

    writeWord(0xffd9); //EOI

    if (typeof module === 'undefined') return new Uint8Array(bitWriter.getData());
    return Buffer.from(bitWriter.getData());

    var jpegDataUri = 'data:image/jpeg;base64,' + btoaFn(bitWriter.getData());

    bitWriter.reset();

    return jpegDataUri;
  };

  // FORK MODIFICATION: Encode from DCT coefficients for steganography
  this.encodeFromDCT = (
    dctInput: QuantizedComponents | { components: any[] },
    metadataInput?: Partial<IEncodeMetadata>,
    quality?: number
  ): Uint8Array => {
    // Normalize parameters so that the encoder works whether we receive raw
    // coefficient arrays or a full decoder-like object.
    // ------------------------------------------------------------------
    // 1. Detect "decoder style" input (object with .components) and, if
    // provided, extract the 3-dimensional coefficient arrays expected by the
    // original jp3g encoder implementation. Also derive any metadata fields
    // that are required (quantisation tables, sampling ratios, width/height)
    // but were not explicitly supplied by the caller.
    // ------------------------------------------------------------------

    // Helper we will populate below – will become the final arrays we feed
    // into the legacy encoder (shape: [component][blockRow][blockCol][64]).
    let coefficientArrays: QuantizedComponents;

    // The metadata object we ultimately use (may be the caller-supplied one or
    // a derived fallback).
    let metadata: Partial<IEncodeMetadata & { components?: any[] }> = metadataInput || {};

    // If the first argument looks like a decoder (has .components) rather than
    // an array, convert it into the structure the legacy code expects.
    if (!Array.isArray(dctInput) && isDecoderLike(dctInput)) {
      const decoderObj = dctInput;

      // --- Derive coefficient arrays ------------------------------------------------
      if (!decoderObj.components[0]?.dctBlocks) {
        throw new Error('encodeFromDCT: supplied decoder object is missing dctBlocks');
      }

      // Build a simple [Y, Cb, Cr] array of 2-D block arrays expected by the
      // original algorithm.
      coefficientArrays = [
        decoderObj.components[0].dctBlocks,
        decoderObj.components[1]?.dctBlocks || decoderObj.components[0].dctBlocks,
        decoderObj.components[2]?.dctBlocks || decoderObj.components[0].dctBlocks,
      ];

      // --- Derive metadata -----------------------------------------------------------
      metadata = {
        width: decoderObj.width,
        height: decoderObj.height,
        // Quant tables – fall back to the tables found on each component.
        quantizationTables: [
          decoderObj.components[0]?.quantizationTable,
          decoderObj.components[1]?.quantizationTable || decoderObj.components[0]?.quantizationTable,
        ],
        // Sampling ratios – infer from chroma component scales (assume 4:2:0 if undefined).
        hSampRatio: decoderObj.components[1] ? Math.round(1 / (decoderObj.components[1].scaleX || 1)) : 1,
        vSampRatio: decoderObj.components[1] ? Math.round(1 / (decoderObj.components[1].scaleY || 1)) : 1,
        comments: decoderObj.comments || [],
        exif: decoderObj.exifBuffer || null,
        ...metadataInput, // allow explicit overrides from caller
      };
    } else {
      // Caller passed raw coefficient arrays (assumed already validated)
      coefficientArrays = dctInput as QuantizedComponents;
      metadata = { ...metadataInput };
    }

    // --- Fallback: derive quant tables from metadataInput components if still missing ---
    if (
      (!metadata.quantizationTables || metadata.quantizationTables.length === 0 || !metadata.quantizationTables[0]) &&
      (metadata as any).components
    ) {
      const comps = (metadata as any).components as any[];
      metadata.quantizationTables = [
        comps[0]?.quantizationTable,
        comps[1]?.quantizationTable || comps[0]?.quantizationTable,
      ];
    }

    // ------------------------------------------------------------------
    // Guard-clauses for critical metadata pieces so that we fail loudly
    // with a helpful message instead of cryptic "undefined[0]" errors.
    // ------------------------------------------------------------------
    if (!metadata || typeof metadata.width !== 'number' || typeof metadata.height !== 'number') {
      throw new Error('encodeFromDCT: metadata.width/height are required');
    }
    // NOTE: Quantisation tables are OPTIONAL. If the caller does not supply
    // them we will simply keep using the default tables that were already
    // initialised by setQuality(). This mirrors the behaviour of the original
    // jp3g encoder and prevents unnecessary hard-failures during basic
    // round-trip tests.

    if (!metadata.hSampRatio) metadata.hSampRatio = 2;
    if (!metadata.vSampRatio) metadata.vSampRatio = 2;

    // Ensure we always have three component arrays to avoid crashes in
    // downstream frequency analysis (fallback to luminance blocks if missing).
    if (!coefficientArrays[1]) coefficientArrays[1] = coefficientArrays[0];
    if (!coefficientArrays[2]) coefficientArrays[2] = coefficientArrays[0];

    // If chroma components use 4:2:0 subsampling (i.e., half width/height in
    // blocks), duplicate each block to create a simple 4:4:4 representation so
    // that our non-interleaved encoding loop still produces the expected
    // number of MCUs for the declared sampling factors (1×1 per component).
    function upsampleComponent(comp) {
      var yBlocks = coefficientArrays[0].length;
      var xBlocks = coefficientArrays[0][0].length;
      var cy = comp.length;
      var cx = comp[0].length;
      if (cy === yBlocks && cx === xBlocks) return comp; // already same size

      var factorY = Math.round(yBlocks / cy);
      var factorX = Math.round(xBlocks / cx);
      if (factorY < 1 || factorX < 1) return comp; // unexpected, skip

      var up = new Array(yBlocks);
      for (var y = 0; y < yBlocks; y++) {
        up[y] = new Array(xBlocks);
        var srcRow = Math.floor(y / factorY);
        for (var x = 0; x < xBlocks; x++) {
          var srcCol = Math.floor(x / factorX);
          up[y][x] = comp[srcRow][srcCol];
        }
      }
      return up;
    }

    coefficientArrays[1] = upsampleComponent(coefficientArrays[1]);
    coefficientArrays[2] = upsampleComponent(coefficientArrays[2]);

    //-------------------------------------------------------------------
    // The rest of the original function remains unchanged except that
    // we now reference `coefficientArrays` instead of the old name.
    //-------------------------------------------------------------------
    var time_start = new Date().getTime();

    const qu = quality || 50;
    setQuality(qu);

    // We need to re-initialize headers and tables based on the original image's metadata
    bitWriter.reset();

    // Header
    writeWord(0xffd8); // SOI
    writeAPP0Wrapper();
    if (metadata.exif) {
      writeAPP1Wrapper(metadata.exif);
    }
    if (metadata.comments && metadata.comments.length > 0) {
      writeCOMWrapper(metadata.comments);
    }

    // -- Quantisation tables -----------------------------------------------------
    // If the caller provided custom quant tables, copy them into the encoder so
    // they are written out in the DQT marker. Otherwise we stick with the
    // defaults that were populated by setQuality() earlier.
    if (metadata.quantizationTables && metadata.quantizationTables[0]) {
      // Ensure chroma table exists – fall back to luminance when missing.
      if (!metadata.quantizationTables[1]) {
        metadata.quantizationTables[1] = metadata.quantizationTables[0];
      }
      for (let i = 0; i < 64; i++) {
        YTable[i] = metadata.quantizationTables[0][i];
        UVTable[i] = metadata.quantizationTables[1][i];
      }
    }
    // Always write a DQT marker (either caller-supplied or default tables).
    writeDQTWrapper();
    // --

    writeSOF0Wrapper(metadata.width!, metadata.height!);

    // Write baseline standard Huffman tables (Annex K.3)
    writeStandardDHTWrapper();

    writeSOSWrapper();

    // ---------------------------------------------------------------------------
    // Encode the provided (already-quantised) DCT coefficient blocks directly.
    // ---------------------------------------------------------------------------
    var YDC = 0;
    var CbDC = 0;
    var CrDC = 0;

    var Yheight = coefficientArrays[0].length;
    var Ywidth = coefficientArrays[0][0].length;

    for (var y = 0; y < Yheight; y++) {
      for (var x = 0; x < Ywidth; x++) {
        // Luminance block
        var ydu = coefficientArrays[0][y][x];
        YDC = processDUFromCoefficients(ydu, YDC, YDC_HT, YAC_HT);

        // Corresponding chroma blocks (thanks to upsampling they are same indices)
        var cbdu = coefficientArrays[1][y][x];
        CbDC = processDUFromCoefficients(cbdu, CbDC, UVDC_HT, UVAC_HT);

        var crdu = coefficientArrays[2][y][x];
        CrDC = processDUFromCoefficients(crdu, CrDC, UVDC_HT, UVAC_HT);
      }
    }

    // ----- Bit alignment before EOI -----
    const pendingBits2 = bitWriter.getPendingBitCount();
    if (pendingBits2 >= 0) {
      const fillbits: BitSpec = [(1 << (pendingBits2 + 1)) - 1, pendingBits2 + 1];
      writeBits(fillbits);
    }

    writeWord(0xffd9); // EOI

    var jpegData = bitWriter.getData();
    bitWriter.reset();

    return jpegData;
  };

  function setQuality(quality) {
    if (quality <= 0) {
      quality = 1;
    }
    if (quality > 100) {
      quality = 100;
    }

    if (currentQuality == quality) return; // don't recalc if unchanged

    var sf = 0;
    if (quality < 50) {
      sf = Math.floor(5000 / quality);
    } else {
      sf = Math.floor(200 - quality * 2);
    }

    initQuantTables(sf);
    currentQuality = quality;
    //console.log('Quality set to: '+quality +'%');
  }

  function init() {
    var time_start = new Date().getTime();
    if (!quality) quality = 50;
    // Create tables
    initCharLookupTable();
    initHuffmanTbl();
    initCategoryNumber();
    initRGBYUVTable();

    setQuality(quality);
  }

  init();
}

if (typeof module !== 'undefined') {
  module.exports = encode;
} else if (typeof window !== 'undefined') {
  window['jpeg-js'] = window['jpeg-js'] || {};
  window['jpeg-js'].encode = encode;
}

// FORK MODIFICATION: Export the encoder for use in our steganography client
export { JPEGEncoder };

// ---------------------------------------------------------------------------
// Public TypeScript interfaces (initial scaffold – will be refined gradually)
// ---------------------------------------------------------------------------

/** Raw RGBA image buffer expected by `encode()`. */
export interface IRgbaImage {
  width: number;
  height: number;
  /** Flat RGBA byte array – length === width * height * 4. */
  data: Uint8Array;
  /** Optional JPEG comment strings to embed (one COM segment per entry). */
  comments?: string[];
  /** Optional EXIF payload (already includes the "Exif\0" leader if present). */
  exifBuffer?: Uint8Array | null;
}

/** Optional metadata object accepted by `encodeFromDCT()`. */
export interface IEncodeMetadata {
  width: number;
  height: number;
  /** Luma and (optionally) Chroma quant tables, 64 entries each. */
  quantizationTables?: [number[] /* Y */, number[] /* Cb/Cr */?];
  /** Horizontal sampling factor for Cb/Cr relative to Y (e.g. 2 for 4:2:0). */
  hSampRatio?: number;
  /** Vertical sampling factor for Cb/Cr relative to Y. */
  vSampRatio?: number;
  comments?: string[];
  exif?: Uint8Array | null;
}

/** A single 8×8 quantised DCT block (length-64 array). */
export type QuantBlock = number[] & { length: 64 };
/** 2-D matrix of blocks for one component (rows × columns). */
export type ComponentBlocks = QuantBlock[][];
/** Tuple in Y, Cb, Cr order used by encodeFromDCT(). */
export type QuantizedComponents = [ComponentBlocks, ComponentBlocks, ComponentBlocks];

/** Minimal public API contract for our (legacy) encoder constructor. */
export interface IJpegEncoder {
  encode(image: IRgbaImage, quality?: number): Uint8Array | Buffer;
  encodeFromDCT(
    blocks: QuantizedComponents | { components: unknown[] },
    metadata?: Partial<IEncodeMetadata>,
    quality?: number
  ): Uint8Array | Buffer;
}

// Internal helper type for a jp3g decoder-like object we might receive.
interface IDecoderLike {
  components: any[];
  width: number;
  height: number;
  comments?: string[];
  exifBuffer?: Uint8Array | null;
}

function isDecoderLike(obj: unknown): obj is IDecoderLike {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'components' in obj &&
    Array.isArray((obj as any).components) &&
    typeof (obj as any).width === 'number' &&
    typeof (obj as any).height === 'number'
  );
}

// ---------------------------------------------------------------------------
// Back-compat helper: simple one-shot encoder mirroring original jpeg-js API
// ---------------------------------------------------------------------------

function encode(imgData: IRgbaImage, qu: number = 50) {
  const encoder = new JPEGEncoder(qu);
  const data = encoder.encode(imgData, qu);
  return {
    data,
    width: imgData.width,
    height: imgData.height,
  } as const;
}
