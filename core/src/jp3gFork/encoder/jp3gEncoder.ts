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

import type { IBufferLike } from '../../interfaces/IBufferLike';
import { buildCategoryAndBitcode } from './utils/bitcodeUtils';
import { BitWriter, BitSpec } from './utils/BitWriter';
import { buildRgbYuvLookupTable } from './utils/colorTables';
import { ZIG_ZAG } from '../constants/constants';
import {
  STD_DC_LUMINANCE_NRCODES,
  STD_DC_LUMINANCE_VALUES,
  STD_AC_LUMINANCE_NRCODES,
  STD_AC_LUMINANCE_VALUES,
  STD_DC_CHROMINANCE_NRCODES,
  STD_DC_CHROMINANCE_VALUES,
  STD_AC_CHROMINANCE_NRCODES,
  STD_AC_CHROMINANCE_VALUES,
} from '../constants/huffmanConstants';
import { fDCTQuant } from './utils/dctUtils';
import { ComponentBlocks, QuantizedComponents } from './utils/huffmanFrequency';
import { HuffmanTable, computeHuffmanTable } from './utils/huffmanUtils';
import {
  writeAPP0,
  writeAPP1,
  writeSOF0,
  writeCOM,
  writeSOS,
  writeDHT,
  writeDQT,
  writeStandardDHT,
} from './utils/jpegHeaderWriters';
import { buildQuantTables } from './utils/quantUtils';
import { IRgbaImage, IEncodeMetadata, IJpegEncoder } from '../types/types';

// Helper interface describing a decoder component shape we care about
interface IDecoderComponent {
  dctBlocks: ComponentBlocks;
  quantizationTable?: number[];
  scaleX?: number;
  scaleY?: number;
}

function LegacyJPEGEncoder(this: Record<string, unknown>, quality: number = 50, bufferAdapter?: IBufferLike) {
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

  function writeWord(value: number): void {
    bitWriter.writeWord(value);
  }

  // Local header writer wrappers now delegate to shared utilities.
  const writeAPP0Wrapper = () => writeAPP0(bitWriter);
  const writeAPP1Wrapper = (buf?: Uint8Array | null) => {
    if (buf) {
      writeAPP1(bitWriter, buf);
    }
  };
  const writeSOF0Wrapper = (w: number, h: number) => writeSOF0(bitWriter, w, h);
  const writeCOMWrapper = (c?: string[]) => writeCOM(bitWriter, c);
  const writeSOSWrapper = () => writeSOS(bitWriter);

  const writeDQTWrapper = () => writeDQT(bitWriter, YTable, UVTable);
  const writeDHTWrapper = () => writeDHT(bitWriter, YDC_HT, YAC_HT, UVDC_HT, UVAC_HT);
  const writeStandardDHTWrapper = () => writeStandardDHT(bitWriter);

  function processDUFromCoefficients(
    dctCoefficients: number[],
    DC: number,
    HTDC: HuffmanTable,
    HTAC: HuffmanTable
  ): number {
    const EOB = HTAC[0x00];
    const M16zeroes = HTAC[0xf0];
    let pos;
    const I16 = 16;
    const I63 = 63;

    // The coefficients are already quantized, so we just need to reorder them
    for (let j = 0; j < 64; ++j) {
      DU[ZigZag[j]] = dctCoefficients[j];
    }

    // Calculate DC difference
    const DC_val = DU[0] - DC;
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
    let end0pos = 63;
    while (end0pos > 0 && DU[end0pos] === 0) {
      end0pos--;
    }

    if (end0pos == 0) {
      writeBits(EOB);
      return DC;
    }

    let i = 1;
    let lng;
    while (i <= end0pos) {
      const startpos = i;
      while (DU[i] === 0 && i <= end0pos) {
        i++;
      }
      let nrzeroes = i - startpos;
      if (nrzeroes >= I16) {
        lng = nrzeroes >> 4;
        for (let nrmarker = 1; nrmarker <= lng; ++nrmarker) {
          writeBits(M16zeroes);
        }
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
    let pos;
    const I16 = 16;
    const I63 = 63;
    const I64 = 64;
    const DU_DCT = fDCTQuant(CDU, fdtbl);
    //ZigZag reorder
    for (let j = 0; j < I64; ++j) {
      DU[ZigZag[j]] = DU_DCT[j];
    }
    const Diff = DU[0] - DC;
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
    let end0pos = 63;
    while (end0pos > 0 && DU[end0pos] === 0) {
      end0pos--;
    }
    //end0pos = first element in reverse order !=0
    if (end0pos == 0) {
      writeBits(EOB);
      return DC;
    }
    let i = 1;
    let lng;
    while (i <= end0pos) {
      const startpos = i;
      while (DU[i] === 0 && i <= end0pos) {
        i++;
      }
      let nrzeroes = i - startpos;
      if (nrzeroes >= I16) {
        lng = nrzeroes >> 4;
        for (let nrmarker = 1; nrmarker <= lng; ++nrmarker) {
          writeBits(M16zeroes);
        }
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
    const sfcc = String.fromCharCode;
    for (let i = 0; i < 256; i++) {
      ///// ACHTUNG // 255
      clt[i] = sfcc(i);
    }
  }

  this.encode = (image: IRgbaImage, quality?: number) => {
    // image data object (timestamp removed – previously unused)

    if (quality) {
      setQuality(quality);
    }

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
    let DCY = 0;
    let DCU = 0;
    let DCV = 0;

    const imageData = image.data;
    const width = image.width;
    const height = image.height;

    const quadWidth = width * 4;

    let x,
      y = 0;
    let r, g, b;
    let start, p, col, row, pos;
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

    if (bufferAdapter) {
      return bufferAdapter.from(bitWriter.getData());
    }
    if (typeof module === 'undefined') {
      return new Uint8Array(bitWriter.getData());
    }
    return new Uint8Array(bitWriter.getData());
  };

  // FORK MODIFICATION: Encode from DCT coefficients for steganography
  this.encodeFromDCT = (
    blocks: QuantizedComponents | { components: unknown[] },
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
    let metadata: Partial<IEncodeMetadata & { components?: IDecoderComponent[] }> = metadataInput || {};

    // If the first argument looks like a decoder (has .components) rather than
    // an array, convert it into the structure the legacy code expects.
    if (!Array.isArray(blocks) && isDecoderLike(blocks)) {
      const decoderObj = blocks;

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
          decoderObj.components[0].quantizationTable as number[],
          (decoderObj.components[1]?.quantizationTable || decoderObj.components[0].quantizationTable) as number[],
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
      coefficientArrays = blocks as QuantizedComponents;
      metadata = { ...metadataInput };
    }

    // --- Fallback: derive quant tables from metadataInput components if still missing ---
    if (
      (!metadata.quantizationTables || !metadata.quantizationTables[0]) &&
      metadata.components &&
      Array.isArray(metadata.components)
    ) {
      const comps = metadata.components as IDecoderComponent[];
      if (comps.length > 0 && comps[0]?.quantizationTable) {
        metadata.quantizationTables = [
          comps[0].quantizationTable as number[],
          (comps[1]?.quantizationTable || comps[0].quantizationTable) as number[],
        ];
      }
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

    if (!metadata.hSampRatio) {
      metadata.hSampRatio = 2;
    }
    if (!metadata.vSampRatio) {
      metadata.vSampRatio = 2;
    }

    // Ensure we always have three component arrays to avoid crashes in
    // downstream frequency analysis (fallback to luminance blocks if missing).
    if (!coefficientArrays[1]) {
      coefficientArrays[1] = coefficientArrays[0];
    }
    if (!coefficientArrays[2]) {
      coefficientArrays[2] = coefficientArrays[0];
    }

    // If chroma components use 4:2:0 subsampling (i.e., half width/height in
    // blocks), duplicate each block to create a simple 4:4:4 representation so
    // that our non-interleaved encoding loop still produces the expected
    // number of MCUs for the declared sampling factors (1×1 per component).
    function upsampleComponent(comp: ComponentBlocks): ComponentBlocks {
      const yBlocks = coefficientArrays[0].length;
      const xBlocks = coefficientArrays[0][0].length;
      const cy = comp.length;
      const cx = comp[0].length;
      if (cy === yBlocks && cx === xBlocks) {
        return comp; // already same size
      }

      const factorY = Math.round(yBlocks / cy);
      const factorX = Math.round(xBlocks / cx);
      if (factorY < 1 || factorX < 1) {
        return comp; // unexpected, skip
      }

      const up: ComponentBlocks = Array.from({ length: yBlocks }, () => new Array(xBlocks) as ComponentBlocks[number]);
      for (let y = 0; y < yBlocks; y++) {
        for (let x = 0; x < xBlocks; x++) {
          const srcRow = Math.floor(y / factorY);
          const srcCol = Math.floor(x / factorX);
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

      const [qtY, qtC] = metadata.quantizationTables as [number[], number[]];
      for (let i = 0; i < 64; i++) {
        YTable[i] = qtY[i];
        UVTable[i] = qtC[i];
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
    let YDC = 0;
    let CbDC = 0;
    let CrDC = 0;

    const Yheight = coefficientArrays[0].length;
    const Ywidth = coefficientArrays[0][0].length;

    for (let y = 0; y < Yheight; y++) {
      for (let x = 0; x < Ywidth; x++) {
        // Luminance block
        const ydu = coefficientArrays[0][y][x];
        YDC = processDUFromCoefficients(ydu, YDC, YDC_HT, YAC_HT);

        // Corresponding chroma blocks (thanks to upsampling they are same indices)
        const cbdu = coefficientArrays[1][y][x];
        CbDC = processDUFromCoefficients(cbdu, CbDC, UVDC_HT, UVAC_HT);

        const crdu = coefficientArrays[2][y][x];
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

    const jpegData = bitWriter.getData();
    bitWriter.reset();

    return jpegData;
  };

  function setQuality(quality: number): void {
    if (quality <= 0) {
      quality = 1;
    }
    if (quality > 100) {
      quality = 100;
    }

    if (currentQuality == quality) {
      return; // don't recalc if unchanged
    }

    let sf = 0;
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
    if (!quality) {
      quality = 50;
    }
    // Create tables
    initCharLookupTable();
    initHuffmanTbl();
    initCategoryNumber();
    initRGBYUVTable();

    setQuality(quality);
  }

  init();
}

// ---------------------------------------------------------------------------
// Modern wrapper class with proper TypeScript surface
// ---------------------------------------------------------------------------

type LegacyImpl = {
  encode: (image: IRgbaImage, quality?: number) => Uint8Array;
  encodeFromDCT: (
    blocks: QuantizedComponents | { components: unknown[] },
    metadataInput?: Partial<IEncodeMetadata>,
    quality?: number
  ) => Uint8Array;
};

export class JPEGEncoder implements IJpegEncoder {
  private readonly impl: LegacyImpl;

  constructor(quality: number = 50, bufferAdapter?: IBufferLike) {
    // Cast constructor to satisfy TS without using `any`
    const LegacyCtor = LegacyJPEGEncoder as unknown as new (quality: number, bufferAdapter?: IBufferLike) => LegacyImpl;
    this.impl = new LegacyCtor(quality, bufferAdapter);
  }

  encode(image: IRgbaImage, quality?: number): Uint8Array {
    return this.impl.encode(image, quality);
  }

  encodeFromDCT(
    blocks: QuantizedComponents | { components: unknown[] },
    metadataInput?: Partial<IEncodeMetadata>,
    quality?: number
  ): Uint8Array {
    return this.impl.encodeFromDCT(blocks, metadataInput, quality);
  }
}

// Internal helper type for a jp3g decoder-like object we might receive.
interface IDecoderLike {
  components: IDecoderComponent[];
  width: number;
  height: number;
  comments?: string[];
  exifBuffer?: Uint8Array | null;
}

function isDecoderLike(obj: unknown): obj is IDecoderLike {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  const dec = obj as Partial<IDecoderLike>;
  return Array.isArray(dec.components) && typeof dec.width === 'number' && typeof dec.height === 'number';
}

// ---------------------------------------------------------------------------
// Back-compat helper: simple one-shot encoder mirroring original jpeg-js API
// ---------------------------------------------------------------------------

export function encode(imgData: IRgbaImage, qu: number = 50) {
  const encoder = new JPEGEncoder(qu);
  const data = encoder.encode(imgData, qu);
  return {
    data,
    width: imgData.width,
    height: imgData.height,
  } as const;
}
