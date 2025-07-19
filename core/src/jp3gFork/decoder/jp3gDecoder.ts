/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/*
   Copyright 2011 notmasteryet

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

// - The JPEG specification can be found in the ITU CCITT Recommendation T.81
//   (www.w3.org/Graphics/JPEG/itu-t81.pdf)
// - The JFIF specification can be found in the JPEG File Interchange Format
//   (www.w3.org/Graphics/JPEG/jfif3.pdf)
// - The Adobe Application-Specific JPEG markers in the Supporting the DCT Filters
//   in PostScript Level 2, Technical Note #5116
//   (partners.adobe.com/public/developer/en/ps/sdk/5116.DCT_Filter.pdf)

import { requestMemoryAllocation, resetMaxMemoryUsage, getBytesAllocated } from './utils/memoryManager';
import { buildComponentData as buildComponentDataUtil } from './utils/componentDataBuilder';
import { createHuffmanDecoders, type IScanComponent } from './utils/huffmanDecoders';
import { type HuffmanDecodeTree } from './utils/huffmanTable';
import {
  parseAPP0,
  parseAPP1,
  parseAPP14,
  parseDQT,
  parseDHT,
  parseSOF,
  parseDRI,
  parseDNL,
  parseSOSHeader,
  parseComment,
  readUint16,
  readDataBlock,
  type MarkerParseContext,
  type JfifData,
  type AdobeData,
  type Frame,
  type FrameComponent,
} from './utils/markerParsers';
import {
  convertColorSpace,
  type ConversionContext,
  type Component as ColorComponent,
} from './utils/colorSpaceConverter';
import { copyToImageData as copyToImageDataUtil } from './utils/imageDataBuilder';
import type { IBufferLike } from '../../interfaces/IBufferLike';

// Type definitions for JPEG decoder
interface DecoderOptions {
  colorTransform?: boolean | undefined;
  useTArray?: boolean;
  formatAsRGBA?: boolean;
  tolerantDecoding?: boolean;
  maxResolutionInMP?: number;
  maxMemoryUsageInMB?: number;
}

interface ExtendedScanComponent extends IScanComponent {
  h: number;
  v: number;
  blocks: Int32Array[][];
  blocksPerLine: number;
  blocksPerColumn: number;
}

interface ExtendedFrame extends Frame {
  mcusPerLine?: number;
  mcusPerColumn?: number;
  maxH?: number;
  maxV?: number;
}

type DecodeFunction = (component: ExtendedScanComponent, block: Int32Array) => void;

interface JpegImageConstructor {
  new (): JpegDecoder;
  resetMaxMemoryUsage: (limit: number) => void;
  getBytesAllocated: () => number;
  requestMemoryAllocation: (bytes: number) => void;
}

interface DecodedImage {
  width: number;
  height: number;
  exifBuffer?: Uint8Array;
  data: Uint8Array;
  comments?: string[];
}

interface DecoderComponent {
  lines: Uint8Array[];
  scaleX: number;
  scaleY: number;
  dctBlocks?: number[][][]; // Match client expectation
  blocks?: number[][][]; // Alternative blocks property for client
  blocksPerLine?: number;
  blocksPerColumn?: number;
  quantizationTable?: Int32Array;
}

interface JpegDecoder {
  width: number;
  height: number;
  jfif?: JfifData | null;
  adobe?: AdobeData | null;
  components: DecoderComponent[];
  comments: string[];
  exifBuffer?: Uint8Array;
  opts?: DecoderOptions;
  parse(data: Uint8Array): void;
  getData(width: number, height: number): Uint8Array;
  copyToImageData(imageData: { width: number; height: number; data: Uint8ClampedArray }, formatAsRGBA?: boolean): void;
}

const JpegImage = (function jpegImage() {
  'use strict';

  function constructor() {}

  function decodeScan(
    data: Uint8Array,
    offset: number,
    frame: ExtendedFrame,
    components: ExtendedScanComponent[],
    resetInterval: number,
    spectralStart: number,
    spectralEnd: number,
    successivePrev: number,
    successive: number,
    opts: DecoderOptions
  ): number {
    const mcusPerLine = frame.mcusPerLine;
    const progressive = frame.progressive;

    const startOffset = offset;
    let bitsData = 0,
      bitsCount = 0;
    function readBit(): number | null {
      if (bitsCount > 0) {
        bitsCount--;
        return (bitsData >> bitsCount) & 1;
      }
      bitsData = data[offset++];
      if (bitsData == 0xff) {
        const nextByte = data[offset++];
        if (nextByte) {
          throw new Error('unexpected marker: ' + ((bitsData << 8) | nextByte).toString(16));
        }
        // unstuff 0
      }
      bitsCount = 7;
      return bitsData >>> 7;
    }
    function decodeHuffman(tree: HuffmanDecodeTree): number {
      let node: number | HuffmanDecodeTree = tree;
      let bit: number | null;
      while ((bit = readBit()) !== null) {
        if (typeof node === 'number') {
          throw new Error('invalid huffman sequence - already at leaf node');
        }
        node = node[bit];
        if (typeof node === 'number') {
          return node;
        }
        if (typeof node !== 'object') {
          throw new Error('invalid huffman sequence');
        }
      }
      throw new Error('unexpected end of data during huffman decode');
    }
    function receive(length: number): number | undefined {
      let n = 0;
      while (length > 0) {
        const bit = readBit();
        if (bit === null) {
          return;
        }
        n = (n << 1) | bit;
        length--;
      }
      return n;
    }
    function receiveAndExtend(length: number): number {
      const n = receive(length);
      if (n === undefined) {
        return 0;
      }
      if (n >= 1 << (length - 1)) {
        return n;
      }
      return n + (-1 << length) + 1;
    }

    const { decodeBaseline, decodeDCFirst, decodeDCSuccessive, decodeACFirst, decodeACSuccessive } =
      createHuffmanDecoders({
        decodeHuffman,
        receive,
        receiveAndExtend,
        readBit,
        spectralStart,
        spectralEnd,
        successive,
      });

    function decodeMcu(
      component: ExtendedScanComponent,
      decode: DecodeFunction,
      mcu: number,
      row: number,
      col: number
    ): void {
      if (!mcusPerLine) {
        throw new Error('mcusPerLine not initialized');
      }
      const mcuRow = (mcu / mcusPerLine) | 0;
      const mcuCol = mcu % mcusPerLine;
      const blockRow = mcuRow * component.v + row;
      const blockCol = mcuCol * component.h + col;
      // If the block is missing and we're in tolerant mode, just skip it.
      if (component.blocks[blockRow] === undefined && opts.tolerantDecoding) {
        return;
      }
      decode(component, component.blocks[blockRow][blockCol]);
    }
    function decodeBlock(component: ExtendedScanComponent, decode: DecodeFunction, mcu: number): void {
      const blockRow = (mcu / component.blocksPerLine) | 0;
      const blockCol = mcu % component.blocksPerLine;
      // If the block is missing and we're in tolerant mode, just skip it.
      if (component.blocks[blockRow] === undefined && opts.tolerantDecoding) {
        return;
      }
      decode(component, component.blocks[blockRow][blockCol]);
    }

    const componentsLength = components.length;
    let component, i, j, k, n;
    let decodeFn;
    if (progressive) {
      if (spectralStart === 0) {
        decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
      } else {
        decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
      }
    } else {
      decodeFn = decodeBaseline;
    }

    let mcu = 0,
      marker;
    let mcuExpected;
    if (componentsLength == 1) {
      mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
    } else {
      if (!mcusPerLine || !frame.mcusPerColumn) {
        throw new Error('mcusPerLine or mcusPerColumn not initialized');
      }
      mcuExpected = mcusPerLine * frame.mcusPerColumn;
    }
    if (!resetInterval) {
      resetInterval = mcuExpected;
    }

    let h, v;
    while (mcu < mcuExpected) {
      // reset interval stuff
      for (i = 0; i < componentsLength; i++) {
        components[i].pred = 0;
      }

      if (componentsLength == 1) {
        component = components[0];
        for (n = 0; n < resetInterval; n++) {
          decodeBlock(component, decodeFn, mcu);
          mcu++;
        }
      } else {
        for (n = 0; n < resetInterval; n++) {
          for (i = 0; i < componentsLength; i++) {
            component = components[i];
            h = component.h;
            v = component.v;
            for (j = 0; j < v; j++) {
              for (k = 0; k < h; k++) {
                decodeMcu(component, decodeFn, mcu, j, k);
              }
            }
          }
          mcu++;

          // If we've reached our expected MCU's, stop decoding
          if (mcu === mcuExpected) {
            break;
          }
        }
      }

      if (mcu === mcuExpected) {
        // Skip trailing bytes at the end of the scan - until we reach the next marker
        do {
          if (data[offset] === 0xff) {
            if (data[offset + 1] !== 0x00) {
              break;
            }
          }
          offset += 1;
        } while (offset < data.length - 2);
      }

      // find marker
      bitsCount = 0;
      marker = (data[offset] << 8) | data[offset + 1];
      if (marker < 0xff00) {
        throw new Error('marker was not found');
      }

      if (marker >= 0xffd0 && marker <= 0xffd7) {
        // RSTx
        offset += 2;
      } else {
        break;
      }
    }

    return offset - startOffset;
  }

  function buildComponentData(component: FrameComponent): Uint8Array[] {
    // Delegate to extracted utility for maintainability
    // @ts-expect-error – internal component shape is compatible
    return buildComponentDataUtil(component);
  }

  constructor.prototype = {
    load: function load(path: string): void {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', path, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function (this: JpegDecoder) {
        // TODO catch parse error
        const data = new Uint8Array(
          xhr.response || (xhr as XMLHttpRequest & { mozResponseArrayBuffer?: ArrayBuffer }).mozResponseArrayBuffer
        );
        this.parse(data);
        const callback = (this as JpegDecoder & { onload?: () => void }).onload;
        if (callback) {
          callback();
        }
      }.bind(this);
      xhr.send(null);
    },
    parse: function parse(this: JpegDecoder, data: Uint8Array): void {
      const maxResolutionInPixels = this.opts!.maxResolutionInMP! * 1000 * 1000;
      let offset = 0;

      // Create context for marker parsing
      const ctx: MarkerParseContext = {
        data,
        offset,
        maxResolutionInPixels,
      };

      // Helper to update local offset from context
      const updateOffset = () => {
        offset = ctx.offset;
      };
      function prepareComponents(frame: ExtendedFrame): void {
        // According to the JPEG standard, the sampling factor must be between 1 and 4
        // See https://github.com/libjpeg-turbo/libjpeg-turbo/blob/9abeff46d87bd201a952e276f3e4339556a403a3/libjpeg.txt#L1138-L1146
        let maxH = 1,
          maxV = 1;
        let component, componentId;
        for (componentId in frame.components) {
          if (Object.prototype.hasOwnProperty.call(frame.components, componentId)) {
            component = frame.components[componentId];
            if (maxH < component.h) {
              maxH = component.h;
            }
            if (maxV < component.v) {
              maxV = component.v;
            }
          }
        }
        const mcusPerLine = Math.ceil(frame.samplesPerLine / 8 / maxH);
        const mcusPerColumn = Math.ceil(frame.scanLines / 8 / maxV);
        for (componentId in frame.components) {
          if (Object.prototype.hasOwnProperty.call(frame.components, componentId)) {
            component = frame.components[componentId];
            const blocksPerLine = Math.ceil((Math.ceil(frame.samplesPerLine / 8) * component.h) / maxH);
            const blocksPerColumn = Math.ceil((Math.ceil(frame.scanLines / 8) * component.v) / maxV);
            const blocksPerLineForMcu = mcusPerLine * component.h;
            const blocksPerColumnForMcu = mcusPerColumn * component.v;
            const blocksToAllocate = blocksPerColumnForMcu * blocksPerLineForMcu;
            const blocks = [];

            // Each block is a Int32Array of length 64 (4 x 64 = 256 bytes)
            requestMemoryAllocation(blocksToAllocate * 256);

            for (let i = 0; i < blocksPerColumnForMcu; i++) {
              const row = [];
              for (let j = 0; j < blocksPerLineForMcu; j++) {
                row.push(new Int32Array(64));
              }
              blocks.push(row);
            }
            component.blocksPerLine = blocksPerLine;
            component.blocksPerColumn = blocksPerColumn;
            component.blocks = blocks;
          }
        }
        frame.maxH = maxH;
        frame.maxV = maxV;
        frame.mcusPerLine = mcusPerLine;
        frame.mcusPerColumn = mcusPerColumn;
      }
      let jfif: JfifData | null = null;
      let adobe: AdobeData | null = null;
      let frame: ExtendedFrame | undefined = undefined;
      let resetInterval: number | undefined = undefined;
      const quantizationTables: (Int32Array | undefined)[] = [];
      const frames: ExtendedFrame[] = [];
      const huffmanTablesAC: (HuffmanDecodeTree | undefined)[] = [];
      const huffmanTablesDC: (HuffmanDecodeTree | undefined)[] = [];
      ctx.offset = offset;
      let fileMarker = readUint16(ctx);
      updateOffset();
      let malformedDataOffset = -1;
      this.comments = [];
      if (fileMarker != 0xffd8) {
        // SOI (Start of Image)
        throw new Error('SOI not found');
      }

      ctx.offset = offset;
      fileMarker = readUint16(ctx);
      updateOffset();
      while (fileMarker != 0xffd9) {
        // EOI (End of image)
        let i: number;
        switch (fileMarker) {
          case 0xff00:
            break;
          case 0xffe0: // APP0 (Application Specific)
          case 0xffe1: // APP1
          case 0xffe2: // APP2
          case 0xffe3: // APP3
          case 0xffe4: // APP4
          case 0xffe5: // APP5
          case 0xffe6: // APP6
          case 0xffe7: // APP7
          case 0xffe8: // APP8
          case 0xffe9: // APP9
          case 0xffea: // APP10
          case 0xffeb: // APP11
          case 0xffec: // APP12
          case 0xffed: // APP13
          case 0xffee: // APP14
          case 0xffef: // APP15
          case 0xfffe: {
            // COM (Comment)
            ctx.offset = offset;
            const appData = readDataBlock(ctx);
            updateOffset();

            if (fileMarker === 0xfffe) {
              const comment = parseComment(appData);
              this.comments.push(comment);
            }

            if (fileMarker === 0xffe0) {
              const jfifData = parseAPP0(appData);
              if (jfifData) {
                jfif = jfifData;
              }
            }

            if (fileMarker === 0xffe1) {
              const exifData = parseAPP1(appData);
              if (exifData) {
                this.exifBuffer = exifData;
              }
            }

            if (fileMarker === 0xffee) {
              const adobeData = parseAPP14(appData);
              if (adobeData) {
                adobe = adobeData;
              }
            }
            break;
          }

          case 0xffdb: {
            // DQT (Define Quantization Tables)
            ctx.offset = offset;
            const dqtResult = parseDQT(ctx);
            updateOffset();

            // Merge the parsed tables into our quantizationTables array
            for (let tableIndex = 0; tableIndex < dqtResult.data.length; tableIndex++) {
              if (dqtResult.data[tableIndex]) {
                quantizationTables[tableIndex] = dqtResult.data[tableIndex];
              }
            }
            break;
          }

          case 0xffc0: // SOF0 (Start of Frame, Baseline DCT)
          case 0xffc1: // SOF1 (Start of Frame, Extended DCT)
          case 0xffc2: {
            // SOF2 (Start of Frame, Progressive DCT)
            ctx.offset = offset;
            const sofResult = parseSOF(ctx, fileMarker);
            updateOffset();
            frame = sofResult.data as ExtendedFrame;
            prepareComponents(frame);
            frames.push(frame);
            break;
          }

          case 0xffc4: {
            // DHT (Define Huffman Tables)
            ctx.offset = offset;
            const dhtResult = parseDHT(ctx);
            updateOffset();

            // Merge the parsed tables into our huffman arrays
            for (let tableIndex = 0; tableIndex < dhtResult.data.huffmanTablesAC.length; tableIndex++) {
              if (dhtResult.data.huffmanTablesAC[tableIndex]) {
                huffmanTablesAC[tableIndex] = dhtResult.data.huffmanTablesAC[tableIndex] as HuffmanDecodeTree;
              }
            }
            for (let tableIndex = 0; tableIndex < dhtResult.data.huffmanTablesDC.length; tableIndex++) {
              if (dhtResult.data.huffmanTablesDC[tableIndex]) {
                huffmanTablesDC[tableIndex] = dhtResult.data.huffmanTablesDC[tableIndex] as HuffmanDecodeTree;
              }
            }
            break;
          }

          case 0xffdd: {
            // DRI (Define Restart Interval)
            ctx.offset = offset;
            const driResult = parseDRI(ctx);
            updateOffset();
            resetInterval = driResult.data;
            break;
          }

          case 0xffdc: {
            // Number of Lines marker
            ctx.offset = offset;
            parseDNL(ctx);
            updateOffset();
            // Ignore this data since it represents the image height
            break;
          }

          case 0xffda: {
            // SOS (Start of Scan)
            if (!frame) {
              throw new Error('frame not found before SOS marker');
            }

            ctx.offset = offset;
            const sosResult = parseSOSHeader(ctx);
            updateOffset();

            const components: ExtendedScanComponent[] = [];
            const { selectorsCount, componentSelectors, spectralStart, spectralEnd, successiveApproximation } =
              sosResult.data;

            for (i = 0; i < selectorsCount; i++) {
              const componentId = componentSelectors[i * 2];
              const tableSpec = componentSelectors[i * 2 + 1];
              const component = frame.components[componentId] as ExtendedScanComponent;
              const dcTable = huffmanTablesDC[tableSpec >> 4];
              const acTable = huffmanTablesAC[tableSpec & 15];
              if (!dcTable || !acTable) {
                throw new Error(`Missing huffman table: DC=${tableSpec >> 4}, AC=${tableSpec & 15}`);
              }
              component.huffmanTableDC = dcTable;
              component.huffmanTableAC = acTable;
              components.push(component);
            }
            const processed = decodeScan(
              data,
              offset,
              frame,
              components,
              resetInterval ?? 0,
              spectralStart,
              spectralEnd,
              successiveApproximation >> 4,
              successiveApproximation & 15,
              this.opts!
            );
            offset += processed;
            break;
          }

          case 0xffff: // Fill bytes
            if (data[offset] !== 0xff) {
              // Avoid skipping a valid marker.
              offset--;
            }
            break;
          default:
            if (data[offset - 3] == 0xff && data[offset - 2] >= 0xc0 && data[offset - 2] <= 0xfe) {
              // could be incorrect encoding -- last 0xFF byte of the previous
              // block was eaten by the encoder
              offset -= 3;
              break;
            } else if (fileMarker === 0xe0 || fileMarker === 0xe1) {
              // Recover from malformed APP1 markers popular in some phone models.
              // See https://github.com/eugeneware/jpeg-js/issues/82
              if (malformedDataOffset !== -1) {
                throw new Error(
                  `first unknown JPEG marker at offset ${malformedDataOffset.toString(16)}, second unknown JPEG marker ${fileMarker.toString(16)} at offset ${(offset - 1).toString(16)}`
                );
              }
              malformedDataOffset = offset - 1;
              ctx.offset = offset;
              const nextOffset = readUint16(ctx);
              updateOffset();
              if (data[offset + nextOffset - 2] === 0xff) {
                offset += nextOffset - 2;
                break;
              }
            }
            throw new Error('unknown JPEG marker ' + fileMarker.toString(16));
        }
        ctx.offset = offset;
        fileMarker = readUint16(ctx);
        updateOffset();
      }
      if (frames.length !== 1) {
        throw new Error('only single frame JPEGs supported');
      }

      frame = frames[0];

      // set each frame's components quantization table
      for (let i = 0; i < frames.length; i++) {
        const cp = frames[i].components;
        for (const j in cp) {
          if (Object.prototype.hasOwnProperty.call(cp, j)) {
            const quantIdx = cp[j].quantizationIdx;
            if (quantIdx !== undefined) {
              cp[j].quantizationTable = quantizationTables[quantIdx];
              // Remove the quantizationIdx property after copying to quantizationTable
              const tempComponent = cp[j] as unknown as Record<string, unknown>;
              tempComponent.quantizationIdx = undefined;
            }
          }
        }
      }

      this.width = frame.samplesPerLine;
      this.height = frame.scanLines;
      this.jfif = jfif;
      this.adobe = adobe;
      this.components = [];
      for (let i = 0; i < frame.componentsOrder.length; i++) {
        const component = frame.components[frame.componentsOrder[i]];

        // FORK MODIFICATION: Preserve DCT coefficients before they're converted to pixels
        let preservedBlocks: number[][][] | undefined = undefined;
        if (component.blocks) {
          // Deep copy the DCT coefficient blocks before buildComponentData processes them
          preservedBlocks = [];
          for (let blockRow = 0; blockRow < component.blocks.length; blockRow++) {
            const rowCopy: number[][] = [];
            for (let blockCol = 0; blockCol < component.blocks[blockRow].length; blockCol++) {
              const originalBlock = component.blocks[blockRow][blockCol];
              if (originalBlock && originalBlock.length === 64) {
                // Copy the 64 DCT coefficients as regular number array
                const blockCopy: number[] = [];
                for (let coefIndex = 0; coefIndex < 64; coefIndex++) {
                  blockCopy[coefIndex] = originalBlock[coefIndex];
                }
                rowCopy.push(blockCopy);
              } else {
                rowCopy.push(Array.from(originalBlock || []));
              }
            }
            preservedBlocks.push(rowCopy);
          }
        }

        this.components.push({
          lines: buildComponentData(component as FrameComponent),
          scaleX: component.h / frame.maxH!,
          scaleY: component.v / frame.maxV!,
          // FORK MODIFICATION: Expose the preserved DCT coefficients
          dctBlocks: preservedBlocks,
          blocksPerLine: component.blocksPerLine,
          blocksPerColumn: component.blocksPerColumn,
          // Expose original quantisation table for re-encoding
          quantizationTable: component.quantizationTable,
        });
      }
    },
    getData: function getData(this: JpegDecoder, width: number, height: number): Uint8Array {
      const scaleX = this.width / width;
      const scaleY = this.height / height;

      // Convert decoder components to ColorComponent format
      const components: ColorComponent[] = this.components.map(comp => ({
        lines: comp.lines as unknown as number[][],
        scaleX: comp.scaleX,
        scaleY: comp.scaleY,
      }));

      const ctx: ConversionContext = {
        width,
        height,
        scaleX,
        scaleY,
        components,
        options: {
          colorTransform: this.opts!.colorTransform,
          adobe: this.adobe,
        },
      };

      return convertColorSpace(ctx);
    },
    copyToImageData: function copyToImageData(
      this: JpegDecoder,
      imageData: { width: number; height: number; data: Uint8ClampedArray },
      formatAsRGBA?: boolean
    ): void {
      const data = this.getData(imageData.width, imageData.height);
      copyToImageDataUtil(imageData, data, this.components.length, formatAsRGBA ?? true);
    },
  };

  // Memory guard helpers are now provided by shared util.
  constructor.resetMaxMemoryUsage = resetMaxMemoryUsage;
  constructor.getBytesAllocated = getBytesAllocated;
  constructor.requestMemoryAllocation = requestMemoryAllocation;

  return constructor;
})();

function decode(jpegData: ArrayLike<number> | ArrayBuffer, userOpts: Partial<DecoderOptions> = {}): DecodedImage {
  const defaultOpts = {
    // "undefined" means "Choose whether to transform colors based on the image's color model."
    colorTransform: undefined,
    useTArray: false,
    formatAsRGBA: true,
    tolerantDecoding: true,
    maxResolutionInMP: 100, // Don't decode more than 100 megapixels
    maxMemoryUsageInMB: 512, // Don't decode if memory footprint is more than 512MB
  };

  const opts = { ...defaultOpts, ...userOpts };
  const arr = new Uint8Array(jpegData);
  const decoder = new (JpegImage as unknown as JpegImageConstructor)();
  decoder.opts = opts;
  // If this constructor ever supports async decoding this will need to be done differently.
  // Until then, treating as singleton limit is fine.
  JpegImage.resetMaxMemoryUsage(opts.maxMemoryUsageInMB * 1024 * 1024);
  decoder.parse(arr);

  const channels = opts.formatAsRGBA ? 4 : 3;
  const bytesNeeded = decoder.width * decoder.height * channels;
  let image: DecodedImage;

  try {
    JpegImage.requestMemoryAllocation(bytesNeeded);
    image = {
      width: decoder.width,
      height: decoder.height,
      exifBuffer: decoder.exifBuffer,
      data: new Uint8Array(bytesNeeded),
    };
    if (decoder.comments.length > 0) {
      image.comments = decoder.comments;
    }
  } catch (err) {
    if (err instanceof RangeError) {
      throw new Error('Could not allocate enough memory for the image. ' + 'Required: ' + bytesNeeded);
    }

    if (err instanceof ReferenceError) {
      // No longer check for Buffer since we use platform-agnostic adapters
    }
    throw err;
  }

  decoder.copyToImageData(
    image as unknown as { width: number; height: number; data: Uint8ClampedArray },
    opts.formatAsRGBA
  );

  return image;
}

// Export the main functions and classes for our fork
export { JpegImage, decode };

// Export types for client use
export type { JpegDecoder, DecoderComponent, DecoderOptions, DecodedImage };

// Create a default export that matches jp3g's API
export default function jp3gFork(
  data: Uint8Array,
  _bufferAdapter: IBufferLike
): {
  toObject(): {
    width: number;
    height: number;
    components: DecoderComponent[];
    jfif?: JfifData | null;
    adobe?: AdobeData | null;
    comments: string[];
    _decoder: JpegDecoder;
  };
} {
  return {
    toObject: function () {
      // Parse the JPEG and return structured data like jp3g does
      const decoder = new (JpegImage as unknown as JpegImageConstructor)();
      decoder.opts = {
        colorTransform: undefined,
        useTArray: true,
        formatAsRGBA: false,
        tolerantDecoding: true,
        maxResolutionInMP: 100,
        maxMemoryUsageInMB: 512,
      };
      JpegImage.resetMaxMemoryUsage(512 * 1024 * 1024);

      // We need to modify the parse method to expose internal data
      // For now, let's just parse and return what we can access
      decoder.parse(data);

      return {
        width: decoder.width,
        height: decoder.height,
        components: decoder.components,
        jfif: decoder.jfif,
        adobe: decoder.adobe,
        comments: decoder.comments || [],
        // Add access to the internal decoder for DCT coefficients
        _decoder: decoder,
      };
    },
  };
}
