/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import jp3g from 'jp3g';

// JPEG zigzag scan order for 8x8 DCT blocks (for future use)
// const ZIGZAG_ORDER = [
//   0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28,
//   35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47,
//   55, 62, 63,
// ];

interface IHuffmanTable {
  codes: number[];
  values: number[];
  minCode: number[];
  maxCode: number[];
  valPtr: number[];
  tree?: any; // jp3g's pre-built tree structure for traversal-based decoding
  encodeMap?: Map<number, string>; // symbol -> bit string mapping for encoding
}

interface IDCTBlock {
  dc: number;
  ac: number[]; // 63 AC coefficients
}

interface IDCTCoefficients {
  blocks: IDCTBlock[];
  width: number;
  height: number;
  totalBlocks: number;
}

export interface IJp3gEnhancedParseResult {
  success: boolean;
  error?: string;
  jpegStructure?: any;
  dctCoefficients?: IDCTCoefficients;
  huffmanTables?: { [key: string]: IHuffmanTable };
  quantTables?: number[][];
}

export interface IJp3gEnhancedEmbedResult {
  success: boolean;
  error?: string;
  modifiedJpeg?: Uint8Array;
  coefficientsModified?: number;
  blocks?: number;
}

/**
 * Bit stream reader for decoding entropy-coded JPEG data
 */
class BitStreamReader {
  private data: Uint8Array;
  private byteIndex: number = 0;
  private bitIndex: number = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  /**
   * Read a single bit from the stream
   */
  readBit(): number | null {
    if (this.byteIndex >= this.data.length) {
      return null;
    }

    const byte = this.data[this.byteIndex];

    // Debug: Check for JPEG markers that might signal end of entropy data
    if (byte === 0xff && this.bitIndex === 0) {
      // Look ahead to see what kind of marker this is
      if (this.byteIndex + 1 < this.data.length) {
        const nextByte = this.data[this.byteIndex + 1];
        if (nextByte !== 0x00 && nextByte >= 0xd0 && nextByte <= 0xd7) {
          // Restart marker (RST0-RST7) - we should handle this
          console.log(
            `DEBUG: Encountered restart marker 0xFF${nextByte.toString(16).toUpperCase()} at byte ${this.byteIndex}`
          );
        } else if (nextByte !== 0x00) {
          // Other JPEG marker - signals end of entropy data
          console.log(
            `DEBUG: Encountered JPEG marker 0xFF${nextByte.toString(16).toUpperCase()} at byte ${this.byteIndex}, stopping decode`
          );
          return null;
        }
      }
    }

    const bit = (byte >> (7 - this.bitIndex)) & 1;

    this.bitIndex++;
    if (this.bitIndex >= 8) {
      this.bitIndex = 0;
      this.byteIndex++;

      // Handle byte stuffing (0xFF 0x00 sequences in JPEG)
      if (
        this.byteIndex < this.data.length - 1 &&
        this.data[this.byteIndex - 1] === 0xff &&
        this.data[this.byteIndex] === 0x00
      ) {
        this.byteIndex++; // Skip the stuffed 0x00 byte
      }
    }

    return bit;
  }

  /**
   * Read multiple bits as a number
   */
  readBits(count: number): number | null {
    if (count <= 0) return 0;

    let result = 0;
    for (let i = 0; i < count; i++) {
      const bit = this.readBit();
      if (bit === null) return null;
      result = (result << 1) | bit;
    }

    return result;
  }

  /**
   * Check if we're at the end of the stream
   */
  isAtEnd(): boolean {
    return this.byteIndex >= this.data.length;
  }
}

export class Jp3gEnhancedClient {
  // Temporary storage for extracted data during JPEG rebuilding
  private currentQuantTables?: number[][];
  private currentHuffmanTables?: { [key: string]: IHuffmanTable };
  private currentImageDimensions?: { width: number; height: number };

  /**
   * Parse JPEG and extract DCT coefficients using Huffman decoding
   */
  async parseWithDCTCoefficients(imageBuffer: Uint8Array): Promise<IJp3gEnhancedParseResult> {
    try {
      console.log('Parsing JPEG structure with jp3g...');
      const jpegStructure = await jp3g(imageBuffer).toObject();

      // Extract Huffman tables from DHT segments
      const huffmanTables = this.extractHuffmanTables(jpegStructure);
      console.log('Extracted Huffman tables:', Object.keys(huffmanTables));

      // Extract quantization tables from DQT segments
      const quantTables = this.extractQuantizationTables(jpegStructure);
      console.log('Extracted quantization tables:', quantTables.length);

      // Find SOS segment with DCT coefficient data
      const sosSegment = jpegStructure.find((segment: any) => segment.type === 'SOS');
      if (!sosSegment) {
        throw new Error('No SOS segment found in JPEG');
      }

      // Extract image dimensions from SOF segment
      const sofSegment = jpegStructure.find(
        (segment: any) =>
          segment.type === 'SOF' || segment.type === 'SOF0' || segment.type === 'SOF1' || segment.type === 'SOF2'
      ) as any;
      if (!sofSegment) {
        throw new Error('No SOF segment found in JPEG');
      }

      const width = sofSegment.width || sofSegment.samplesPerLine || 0;
      const height = sofSegment.height || sofSegment.scanLines || 0;
      console.log(`Image dimensions: ${width}x${height}`);

      // Decode DCT coefficients from SOS data
      const dctCoefficients = await this.decodeCoefficients(sosSegment, huffmanTables, quantTables, width, height);

      return {
        success: true,
        jpegStructure,
        dctCoefficients,
        huffmanTables,
        quantTables,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown parsing error',
      };
    }
  }

  /**
   * Extract Huffman tables from DHT segments
   */
  private extractHuffmanTables(jpegStructure: any[]): { [key: string]: IHuffmanTable } {
    const huffmanTables: { [key: string]: IHuffmanTable } = {};

    for (const segment of jpegStructure) {
      if (segment.type === 'DHT') {
        console.log('DHT segment found:', Object.keys(segment));

        if (segment.tables) {
          for (const table of segment.tables) {
            // jp3g uses 'cls' and 'id' instead of 'tableClass' and 'tableId'
            const tableClass = table.cls || 0;
            const tableId = table.id || 0;
            const key = `${tableClass}_${tableId}`;
            console.log(`Processing Huffman table: ${key}`, {
              tableClass,
              tableId,
              hasTree: !!table.tree,
              treeDepth: this.getTreeDepth(table.tree),
            });

            // Debug: Inspect jp3g tree structure in detail
            if (key === '0_0') {
              // Only inspect one table to avoid spam
              this.inspectHuffmanTree(table.tree, key, 4);
            }

            // jp3g provides pre-built tree structure instead of raw codes
            huffmanTables[key] = this.buildHuffmanTableFromTree(table);
          }
        }
      }
    }

    return huffmanTables;
  }

  /**
   * Get depth of jp3g tree structure for debugging
   */
  private getTreeDepth(tree: any): number {
    if (!tree || !Array.isArray(tree)) return 0;

    let maxDepth = 0;
    for (const node of tree) {
      if (Array.isArray(node)) {
        maxDepth = Math.max(maxDepth, 1 + this.getTreeDepth(node));
      }
    }

    return maxDepth;
  }

  /**
   * Deep inspection of jp3g Huffman tree structure
   */
  private inspectHuffmanTree(tree: any, tableName: string, maxDepth = 3): void {
    console.log(`\n🔍 DETAILED HUFFMAN TREE INSPECTION FOR ${tableName}:`);

    const inspectNode = (node: any, path: string, depth: number) => {
      if (depth > maxDepth) {
        console.log(`${path}: ... (truncated at depth ${maxDepth})`);
        return;
      }

      console.log(
        `${path}: ${typeof node} = ${Array.isArray(node) ? `[Array length ${node.length}]` : JSON.stringify(node)}`
      );

      if (Array.isArray(node)) {
        node.forEach((child, index) => {
          inspectNode(child, `${path}[${index}]`, depth + 1);
        });
      }
    };

    inspectNode(tree, 'root', 0);
  }

  /**
   * Build Huffman decoding table from jp3g tree structure
   */
  private buildHuffmanTableFromTree(dhtTable: any): IHuffmanTable {
    console.log('Building Huffman table from jp3g tree structure...');

    // jp3g provides a pre-built tree structure that we can use directly
    // Store the tree for traversal-based decoding
    const huffmanTable: IHuffmanTable = {
      codes: [],
      values: [],
      minCode: new Array(17).fill(0),
      maxCode: new Array(17).fill(-1),
      valPtr: new Array(17).fill(0),
      tree: dhtTable.tree, // Store jp3g's tree for traversal
      encodeMap: this.buildEncodeMapFromTree(dhtTable.tree), // Build encoding lookup
    };

    console.log('Huffman table built with tree structure and encoding map');
    return huffmanTable;
  }

  /**
   * Build Huffman decoding table from DHT segment data (legacy method)
   */
  private buildHuffmanTable(dhtTable: any): IHuffmanTable {
    const codes: number[] = [];
    const values: number[] = [];
    const minCode: number[] = new Array(17).fill(0);
    const maxCode: number[] = new Array(17).fill(-1);
    const valPtr: number[] = new Array(17).fill(0);

    // Build Huffman codes from the DHT table
    let code = 0;
    let valueIndex = 0;

    for (let codeLength = 1; codeLength <= 16; codeLength++) {
      const numCodes = dhtTable.codeLengths ? dhtTable.codeLengths[codeLength - 1] : 0;

      if (numCodes > 0) {
        minCode[codeLength] = code;
        valPtr[codeLength] = valueIndex;

        for (let i = 0; i < numCodes; i++) {
          codes.push(code);
          values.push(dhtTable.values[valueIndex]);
          code++;
          valueIndex++;
        }

        maxCode[codeLength] = code - 1;
      }

      code = code << 1;
    }

    return { codes, values, minCode, maxCode, valPtr };
  }

  /**
   * Extract quantization tables from DQT segments
   */
  private extractQuantizationTables(jpegStructure: any[]): number[][] {
    const quantTables: number[][] = [];

    for (const segment of jpegStructure) {
      if (segment.type === 'DQT') {
        console.log('DQT segment found:', Object.keys(segment));

        if (segment.tables) {
          for (const table of segment.tables) {
            // jp3g uses 'id' and 'data' object for quantization tables
            const tableId = table.id || 0;
            const dataObj = table.data || {};

            // Convert jp3g data object to array (keys 0-63)
            const values = [];
            for (let i = 0; i < 64; i++) {
              values[i] = dataObj[i.toString()] || 0;
            }

            console.log(`Processing quantization table ${tableId}`, {
              tableId,
              valuesLength: values.length,
              firstFewValues: values.slice(0, 8),
              precision: table.precision || 8,
            });
            quantTables[tableId] = values;
          }
        }
      }
    }

    return quantTables;
  }

  /**
   * Decode DCT coefficients from SOS segment using Huffman tables
   */
  private async decodeCoefficients(
    sosSegment: any,
    huffmanTables: { [key: string]: IHuffmanTable },
    quantTables: number[][],
    width: number,
    height: number
  ): Promise<IDCTCoefficients> {
    console.log(`Decoding coefficients for ${width}x${height} image...`);
    console.log(`SOS data size: ${sosSegment.data.length} bytes`);
    console.log(`Available Huffman tables: ${Object.keys(huffmanTables).join(', ')}`);

    // Calculate number of MCUs (Minimum Coded Units)
    const mcuWidth = Math.ceil(width / 8);
    const mcuHeight = Math.ceil(height / 8);
    const totalBlocks = mcuWidth * mcuHeight;

    console.log(`Total 8x8 blocks to decode: ${totalBlocks}`);

    // Create bit stream reader for entropy-coded data
    const bitStream = new BitStreamReader(sosSegment.data);
    const blocks: IDCTBlock[] = [];

    // Get Huffman tables for DC and AC coefficients
    const dcTable = huffmanTables['0_0'] || huffmanTables['1_0']; // Try luminance first
    const acTable = huffmanTables['0_1'] || huffmanTables['1_1']; // Try luminance first

    if (!dcTable || !acTable) {
      console.warn('Missing DC or AC Huffman tables, creating placeholder blocks');
      // Fallback to placeholder blocks
      for (let i = 0; i < Math.min(totalBlocks, 100); i++) {
        blocks.push({
          dc: 0,
          ac: new Array(63).fill(0),
        });
      }
    } else {
      console.log('Decoding DCT coefficients with Huffman tables...');

      let previousDC = 0; // DC coefficients are DPCM encoded

      try {
        for (let blockIndex = 0; blockIndex < totalBlocks; blockIndex++) {
          // Progress logging for large images
          if (blockIndex > 0 && blockIndex % 1000 === 0) {
            console.log(
              `Progress: decoded ${blockIndex}/${totalBlocks} blocks (${((blockIndex / totalBlocks) * 100).toFixed(1)}%)`
            );
          }

          const block = this.decodeDCTBlock(bitStream, dcTable, acTable, previousDC);
          if (block) {
            blocks.push(block);
            previousDC = block.dc; // Update DC prediction
          } else {
            // If we can't decode more blocks, stop
            console.log(`Stopped decoding at block ${blockIndex}/${totalBlocks} - likely reached end of valid data`);
            console.log(`Final progress: ${((blockIndex / totalBlocks) * 100).toFixed(2)}% of image decoded`);
            break;
          }

          // Safety limit to prevent runaway loops (much higher than before)
          if (blockIndex > 50000 && blocks.length < blockIndex * 0.5) {
            console.warn(`Decoding efficiency too low at block ${blockIndex}, stopping to prevent issues`);
            break;
          }
        }
      } catch (error) {
        console.log(`Decoded ${blocks.length} blocks before encountering: ${error}`);
      }
    }

    console.log(`Successfully decoded ${blocks.length} DCT blocks`);

    return {
      blocks,
      width,
      height,
      totalBlocks: blocks.length,
    };
  }

  /**
   * Decode a single 8x8 DCT block from the bit stream
   */
  private decodeDCTBlock(
    bitStream: BitStreamReader,
    dcTable: IHuffmanTable,
    acTable: IHuffmanTable,
    previousDC: number
  ): IDCTBlock | null {
    try {
      // Decode DC coefficient (DPCM encoded)
      const dcSymbol = this.decodeHuffmanSymbol(bitStream, dcTable);
      if (dcSymbol === null) return null;

      let dcValue = 0;
      if (dcSymbol > 0) {
        const dcBits = bitStream.readBits(dcSymbol);
        if (dcBits === null) return null;
        dcValue = this.extendSign(dcBits, dcSymbol);
      }

      const currentDC = previousDC + dcValue;

      // Decode AC coefficients
      const ac = new Array(63).fill(0);
      let coeffIndex = 0;

      while (coeffIndex < 63) {
        const acSymbol = this.decodeHuffmanSymbol(bitStream, acTable);
        if (acSymbol === null) break;

        if (acSymbol === 0x00) {
          // EOB (End of Block) - remaining coefficients are zero
          break;
        }

        if (acSymbol === 0xf0) {
          // ZRL (Zero Run Length) - skip 16 coefficients
          coeffIndex += 16;
          continue;
        }

        // Extract run length and size
        const runLength = (acSymbol >> 4) & 0x0f;
        const coeffSize = acSymbol & 0x0f;

        // Skip zeros
        coeffIndex += runLength;

        if (coeffIndex >= 63) break;

        // Read AC coefficient value
        if (coeffSize > 0) {
          const acBits = bitStream.readBits(coeffSize);
          if (acBits === null) break;

          const acValue = this.extendSign(acBits, coeffSize);
          ac[coeffIndex] = acValue;
        }

        coeffIndex++;
      }

      return {
        dc: currentDC,
        ac: ac,
      };
    } catch {
      return null;
    }
  }

  /**
   * Decode a single Huffman symbol from the bit stream using jp3g's tree traversal method
   */
  private decodeHuffmanSymbol(bitStream: BitStreamReader, huffmanTable: IHuffmanTable): number | null {
    if (!huffmanTable.tree) {
      return null;
    }

    let tree = huffmanTable.tree;
    let traversalDepth = 0;

    // Use jp3g's exact traversal method: tree[bit] with null checks
    while (true) {
      const bit = bitStream.readBit();
      if (bit === null) {
        // End of stream
        if (traversalDepth === 0) {
          console.log('DEBUG: Hit end-of-stream immediately in Huffman decoder');
        }
        return null;
      }

      // Safety check for excessive depth
      if (traversalDepth > 20) {
        console.log(`DEBUG: Huffman tree traversal exceeded max depth ${traversalDepth}`);
        return null;
      }

      // jp3g's method: tree[bit] - direct array access
      const node = tree[bit];

      if (typeof node === 'number') {
        // Leaf node - we found our symbol
        return node;
      }

      if (node == null || node === undefined) {
        // Invalid tree path - this is what jp3g throws on
        console.log(`DEBUG: Unexpected huffman code at depth ${traversalDepth}, bit=${bit}`);
        console.log(`DEBUG: Tree node was ${node}, tree length was ${Array.isArray(tree) ? tree.length : 'not array'}`);
        return null;
      }

      // Move to child node (jp3g's tree = node)
      tree = node;
      traversalDepth++;
    }
  }

  /**
   * Extend sign for signed coefficients
   */
  private extendSign(value: number, bits: number): number {
    const shift = 1 << (bits - 1);
    if (value < shift) {
      return value - (1 << bits) + 1;
    }
    return value;
  }

  /**
   * Build encoding map from Huffman tree for fast symbol-to-bitstring lookup
   */
  private buildEncodeMapFromTree(tree: any): Map<number, string> {
    const encodeMap = new Map<number, string>();

    if (!tree) return encodeMap;

    const traverse = (node: any, bitString: string) => {
      if (!Array.isArray(node)) {
        // Leaf node - store symbol and its bit string
        if (typeof node === 'number') {
          encodeMap.set(node, bitString);
        }
        return;
      }

      // Internal node - traverse children
      if (node[0] !== undefined) {
        traverse(node[0], bitString + '0');
      }
      if (node[1] !== undefined) {
        traverse(node[1], bitString + '1');
      }
    };

    traverse(tree, '');
    console.log(`Built encoding map with ${encodeMap.size} symbols`);
    return encodeMap;
  }

  /**
   * Encode a single DCT block back to Huffman symbols and bit stream
   */
  private encodeDCTBlock(
    block: IDCTBlock,
    dcTable: IHuffmanTable,
    acTable: IHuffmanTable,
    previousDC: number
  ): { bits: string; newDC: number } | null {
    try {
      let bitString = '';

      // Encode DC coefficient (DPCM)
      const dcDiff = block.dc - previousDC;
      const dcCategory = this.getCoefficientCategory(dcDiff);

      // Get DC symbol bit string
      const dcSymbolBits = dcTable.encodeMap?.get(dcCategory);
      if (!dcSymbolBits) {
        console.warn(`No encoding for DC category ${dcCategory}`);
        return null;
      }

      bitString += dcSymbolBits;

      // Add DC value bits if needed
      if (dcCategory > 0) {
        bitString += this.getValueBits(dcDiff, dcCategory);
      }

      // Encode AC coefficients
      let runLength = 0;
      for (let i = 0; i < 63; i++) {
        const acValue = block.ac[i];

        if (acValue === 0) {
          runLength++;
          continue;
        }

        // Handle zero run lengths > 15
        while (runLength >= 16) {
          // ZRL (Zero Run Length) symbol
          const zrlBits = acTable.encodeMap?.get(0xf0);
          if (!zrlBits) {
            console.warn('No encoding for ZRL symbol');
            return null;
          }
          bitString += zrlBits;
          runLength -= 16;
        }

        // Encode AC coefficient
        const acCategory = this.getCoefficientCategory(acValue);
        const acSymbol = (runLength << 4) | acCategory;

        const acSymbolBits = acTable.encodeMap?.get(acSymbol);
        if (!acSymbolBits) {
          console.warn(`No encoding for AC symbol ${acSymbol.toString(16)}`);
          return null;
        }

        bitString += acSymbolBits;
        bitString += this.getValueBits(acValue, acCategory);

        runLength = 0;
      }

      // Add EOB (End of Block) if there are remaining zeros
      if (runLength > 0) {
        const eobBits = acTable.encodeMap?.get(0x00);
        if (!eobBits) {
          console.warn('No encoding for EOB symbol');
          return null;
        }
        bitString += eobBits;
      }

      return { bits: bitString, newDC: block.dc };
    } catch (error) {
      console.warn('Error encoding DCT block:', error);
      return null;
    }
  }

  /**
   * Get coefficient category (number of bits needed to represent value)
   */
  private getCoefficientCategory(value: number): number {
    if (value === 0) return 0;

    const absValue = Math.abs(value);
    let category = 1;
    let threshold = 2;

    while (absValue >= threshold && category < 16) {
      category++;
      threshold <<= 1;
    }

    return category;
  }

  /**
   * Get value bits for coefficient encoding
   */
  private getValueBits(value: number, category: number): string {
    if (category === 0) return '';

    let bits = '';
    const absValue = Math.abs(value);

    // Convert to binary
    for (let i = category - 1; i >= 0; i--) {
      bits += (absValue >> i) & 1 ? '1' : '0';
    }

    // For negative values, invert bits
    if (value < 0) {
      bits = bits
        .split('')
        .map(bit => (bit === '0' ? '1' : '0'))
        .join('');
    }

    return bits;
  }

  /**
   * Convert bit string to byte array with JPEG byte stuffing
   */
  private bitsToBytes(bitString: string): Uint8Array {
    // Pad to byte boundary
    while (bitString.length % 8 !== 0) {
      bitString += '0';
    }

    const bytes: number[] = [];

    for (let i = 0; i < bitString.length; i += 8) {
      const byteStr = bitString.substr(i, 8);
      const byte = parseInt(byteStr, 2);

      bytes.push(byte);

      // Add byte stuffing for 0xFF
      if (byte === 0xff) {
        bytes.push(0x00);
      }
    }

    return new Uint8Array(bytes);
  }

  /**
   * Re-encode modified DCT coefficients back to entropy-coded format
   */
  private async reencodeCoefficients(
    modifiedCoefficients: IDCTCoefficients,
    huffmanTables: { [key: string]: IHuffmanTable }
  ): Promise<Uint8Array | null> {
    console.log(`Re-encoding ${modifiedCoefficients.blocks.length} modified DCT blocks...`);

    // Get Huffman tables for encoding
    const dcTable = huffmanTables['0_0'] || huffmanTables['1_0'];
    const acTable = huffmanTables['0_1'] || huffmanTables['1_1'];

    if (!dcTable?.encodeMap || !acTable?.encodeMap) {
      console.error('Missing encoding maps for Huffman tables');
      return null;
    }

    console.log(`DC encoding map size: ${dcTable.encodeMap.size}`);
    console.log(`AC encoding map size: ${acTable.encodeMap.size}`);

    let allBits = '';
    let previousDC = 0;

    // Encode all DCT blocks
    for (const block of modifiedCoefficients.blocks) {
      const encoded = this.encodeDCTBlock(block, dcTable, acTable, previousDC);
      if (!encoded) {
        console.warn('Failed to encode DCT block, stopping re-encoding');
        break;
      }

      allBits += encoded.bits;
      previousDC = encoded.newDC;
    }

    console.log(`Generated ${allBits.length} bits for re-encoded coefficients`);

    // Convert to bytes with JPEG byte stuffing
    const encodedBytes = this.bitsToBytes(allBits);
    console.log(`Re-encoded to ${encodedBytes.length} bytes`);

    return encodedBytes;
  }

  /**
   * Rebuild complete JPEG with modified SOS segment
   */
  private async rebuildJPEG(
    originalJpegStructure: any[],
    newSosData: Uint8Array,
    extractedQuantTables?: number[][],
    extractedHuffmanTables?: { [key: string]: IHuffmanTable },
    imageDimensions?: { width: number; height: number }
  ): Promise<Uint8Array | null> {
    console.log('Rebuilding complete JPEG with modified SOS segment...');

    // Store extracted data for use in serializers
    this.currentQuantTables = extractedQuantTables;
    this.currentHuffmanTables = extractedHuffmanTables;
    this.currentImageDimensions = imageDimensions;

    const jpegSegments: Uint8Array[] = [];

    for (const segment of originalJpegStructure) {
      if (segment.type === 'SOS') {
        console.log(`Replacing SOS segment: original ${segment.data.length} bytes → new ${newSosData.length} bytes`);

        // Build new SOS segment
        const sosHeader = this.buildSOSHeader(segment);
        jpegSegments.push(sosHeader);
        jpegSegments.push(newSosData);
      } else {
        // Keep original segment
        const segmentBytes = this.segmentToBytes(segment);
        if (segmentBytes) {
          jpegSegments.push(segmentBytes);
        }
      }
    }

    // Clear temporary data
    this.currentQuantTables = undefined;
    this.currentHuffmanTables = undefined;
    this.currentImageDimensions = undefined;

    // Combine all segments
    const totalLength = jpegSegments.reduce((sum, segment) => sum + segment.length, 0);
    const result = new Uint8Array(totalLength);

    let offset = 0;
    for (const segment of jpegSegments) {
      result.set(segment, offset);
      offset += segment.length;
    }

    console.log(`Rebuilt JPEG: ${result.length} bytes total`);
    return result;
  }

  /**
   * Build SOS header from segment information
   */
  private buildSOSHeader(_sosSegment: any): Uint8Array {
    // This is a simplified SOS header builder
    // In a full implementation, we'd need to properly reconstruct the header
    const header = [
      0xff,
      0xda, // SOS marker
      0x00,
      0x0c, // Length (12 bytes for typical SOS header)
      0x03, // Number of components
      0x01,
      0x00, // Component 1: Y, DC table 0, AC table 0
      0x02,
      0x11, // Component 2: Cb, DC table 1, AC table 1
      0x03,
      0x11, // Component 3: Cr, DC table 1, AC table 1
      0x00,
      0x3f,
      0x00, // Spectral selection and successive approximation
    ];

    return new Uint8Array(header);
  }

  /**
   * Convert JPEG segment to bytes - USE ORIGINAL DATA WHEN AVAILABLE
   */
  private segmentToBytes(segment: any): Uint8Array | null {
    try {
      // For SOI and EOI, create the standard markers
      if (segment.type === 'SOI') {
        return new Uint8Array([0xff, 0xd8]);
      }

      if (segment.type === 'EOI') {
        return new Uint8Array([0xff, 0xd9]);
      }

      // For ALL other segments, try to use original data first
      if (segment.originalData && segment.originalData instanceof Uint8Array) {
        console.log(`Using original data for ${segment.type}: ${segment.originalData.length} bytes`);
        return segment.originalData;
      }

      // If original data not available, try the data field with header reconstruction
      if (segment.data && segment.data instanceof Uint8Array) {
        console.log(`Reconstructing header for ${segment.type}: ${segment.data.length} bytes`);
        return this.reconstructSegmentWithHeader(segment);
      }

      // If no data at all, try to serialize from scratch (last resort)
      switch (segment.type) {
        case 'DQT':
          console.log(`Attempting to serialize DQT from scratch`);
          return this.serializeDQTFromExtractedData();

        case 'DHT':
          console.log(`Attempting to serialize DHT from scratch`);
          return this.serializeDHTFromExtractedData();

        case 'SOF':
          console.log(`Attempting to serialize SOF from scratch`);
          return this.serializeSOFFromImageDimensions();

        case 'DRI':
          console.log(`Creating minimal DRI segment`);
          return this.serializeDRISegment(segment);

        default:
          console.warn(`Unknown segment type ${segment.type} with no data, skipping`);
          return null;
      }
    } catch (error) {
      console.error(`Error serializing segment ${segment.type}:`, error);
      return null;
    }
  }

  /**
   * Reconstruct segment with proper JPEG header (marker + length + data)
   */
  private reconstructSegmentWithHeader(segment: any): Uint8Array {
    if (!segment.data || !(segment.data instanceof Uint8Array)) {
      return new Uint8Array();
    }

    // Common JPEG markers
    const markers: { [key: string]: number } = {
      APP0: 0xe0,
      APP1: 0xe1,
      APP2: 0xe2,
      APP14: 0xee,
      COM: 0xfe,
      DQT: 0xdb,
      DHT: 0xc4,
      SOF: 0xc0,
      DRI: 0xdd,
    };

    const marker = markers[segment.type] || 0xff;
    const dataLength = segment.data.length;
    const totalLength = dataLength + 2; // +2 for length field itself

    const result = new Uint8Array(dataLength + 4); // +4 for marker and length
    result[0] = 0xff;
    result[1] = marker;
    result[2] = (totalLength >> 8) & 0xff; // Length high byte
    result[3] = totalLength & 0xff; // Length low byte
    result.set(segment.data, 4);

    return result;
  }

  /**
   * Serialize DQT (Quantization Table) segment
   */
  private serializeDQTSegment(segment: any): Uint8Array {
    const data: number[] = [0xff, 0xdb]; // DQT marker
    const segmentData: number[] = [];

    if (segment.tables) {
      for (const table of segment.tables) {
        const precision = table.precision || 0;
        const tableId = table.tableId || 0;

        // Table header: precision (4 bits) + table ID (4 bits)
        segmentData.push((precision << 4) | tableId);

        // Table data (64 values)
        if (table.data) {
          const values = Object.values(table.data) as number[];
          segmentData.push(...values.slice(0, 64));
        } else if (table.quantizationTable) {
          segmentData.push(...table.quantizationTable.slice(0, 64));
        } else {
          // Fallback: standard JPEG luminance quantization table
          const defaultTable = [
            16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22,
            29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103,
            121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
          ];
          segmentData.push(...defaultTable);
        }
      }
    }

    // Add length (big-endian)
    const length = segmentData.length + 2;
    data.splice(2, 0, (length >> 8) & 0xff, length & 0xff);
    data.push(...segmentData);

    return new Uint8Array(data);
  }

  /**
   * Serialize DHT (Huffman Table) segment
   */
  private serializeDHTSegment(segment: any): Uint8Array {
    const data: number[] = [0xff, 0xc4]; // DHT marker
    const segmentData: number[] = [];

    if (segment.tables) {
      for (const table of segment.tables) {
        const tableClass = table.cls || table.tableClass || 0;
        const tableId = table.id || table.tableId || 0;

        // Table header: class (4 bits) + ID (4 bits)
        segmentData.push((tableClass << 4) | tableId);

        // Add code lengths (16 bytes) - extract from jp3g tree if needed
        let codeLengths = new Array(16).fill(0);
        if (table.codeLengths) {
          codeLengths = table.codeLengths.slice(0, 16);
        } else if (table.tree) {
          // Extract code lengths from jp3g tree structure
          codeLengths = this.extractCodeLengthsFromTree(table.tree);
        }
        segmentData.push(...codeLengths);

        // Add symbols
        let symbols: number[] = [];
        if (table.symbols) {
          symbols = table.symbols;
        } else if (table.values) {
          symbols = table.values;
        } else if (table.tree) {
          symbols = this.extractSymbolsFromTree(table.tree);
        }
        segmentData.push(...symbols);
      }
    }

    // Add length
    const length = segmentData.length + 2;
    data.splice(2, 0, (length >> 8) & 0xff, length & 0xff);
    data.push(...segmentData);

    return new Uint8Array(data);
  }

  /**
   * Extract code lengths from jp3g tree structure
   */
  private extractCodeLengthsFromTree(tree: any): number[] {
    const codeLengths = new Array(16).fill(0);
    const symbols: Array<{ symbol: number; depth: number }> = [];

    const traverse = (node: any, depth: number) => {
      if (!Array.isArray(node)) {
        // Leaf node
        if (typeof node === 'number') {
          symbols.push({ symbol: node, depth });
        }
        return;
      }

      // Internal node
      if (node[0] !== undefined) traverse(node[0], depth + 1);
      if (node[1] !== undefined) traverse(node[1], depth + 1);
    };

    traverse(tree, 0);

    // Count symbols at each depth
    for (const { depth } of symbols) {
      if (depth > 0 && depth <= 16) {
        codeLengths[depth - 1]++;
      }
    }

    return codeLengths;
  }

  /**
   * Extract symbols from jp3g tree structure
   */
  private extractSymbolsFromTree(tree: any): number[] {
    const symbols: Array<{ symbol: number; depth: number }> = [];

    const traverse = (node: any, depth: number) => {
      if (!Array.isArray(node)) {
        if (typeof node === 'number') {
          symbols.push({ symbol: node, depth });
        }
        return;
      }

      if (node[0] !== undefined) traverse(node[0], depth + 1);
      if (node[1] !== undefined) traverse(node[1], depth + 1);
    };

    traverse(tree, 0);

    // Sort by depth, then by symbol value (standard JPEG ordering)
    symbols.sort((a, b) => a.depth - b.depth || a.symbol - b.symbol);

    return symbols.map(s => s.symbol);
  }

  /**
   * Serialize SOF (Start of Frame) segment
   */
  private serializeSOFSegment(segment: any): Uint8Array {
    const data: number[] = [0xff, 0xc0]; // SOF0 marker (baseline DCT)
    const segmentData: number[] = [];

    // Frame header
    segmentData.push(8); // Sample precision (8 bits)

    // Image dimensions (big-endian)
    const height = segment.scanLines || segment.height || 0;
    const width = segment.samplesPerLine || segment.width || 0;
    segmentData.push((height >> 8) & 0xff, height & 0xff);
    segmentData.push((width >> 8) & 0xff, width & 0xff);

    // Number of components
    const numComponents = segment.components?.length || segment.numComponents || 3;
    segmentData.push(numComponents);

    // Component specifications
    if (segment.components) {
      for (const comp of segment.components) {
        segmentData.push(comp.componentId || comp.id || 1);
        segmentData.push(((comp.h || 1) << 4) | (comp.v || 1)); // Sampling factors
        segmentData.push(comp.quantizationTableId || comp.qId || 0);
      }
    } else {
      // Default component specifications for RGB
      const defaultComponents = [
        { id: 1, h: 2, v: 2, qId: 0 }, // Y
        { id: 2, h: 1, v: 1, qId: 1 }, // Cb
        { id: 3, h: 1, v: 1, qId: 1 }, // Cr
      ];
      for (const comp of defaultComponents.slice(0, numComponents)) {
        segmentData.push(comp.id);
        segmentData.push((comp.h << 4) | comp.v);
        segmentData.push(comp.qId);
      }
    }

    // Add length
    const length = segmentData.length + 2;
    data.splice(2, 0, (length >> 8) & 0xff, length & 0xff);
    data.push(...segmentData);

    return new Uint8Array(data);
  }

  /**
   * Serialize DRI (Define Restart Interval) segment
   */
  private serializeDRISegment(segment: any): Uint8Array {
    const data: number[] = [0xff, 0xdd]; // DRI marker
    data.push(0x00, 0x04); // Length (4 bytes)

    const interval = segment.restartInterval || 0;
    data.push((interval >> 8) & 0xff, interval & 0xff);

    return new Uint8Array(data);
  }

  /**
   * Serialize DQT using our extracted quantization table data
   */
  private serializeDQTFromExtractedData(): Uint8Array | null {
    if (!this.currentQuantTables || this.currentQuantTables.length === 0) {
      console.warn('No quantization tables available for DQT serialization');
      return null;
    }

    const data: number[] = [0xff, 0xdb]; // DQT marker
    const segmentData: number[] = [];

    // Serialize each quantization table
    for (let i = 0; i < this.currentQuantTables.length; i++) {
      const table = this.currentQuantTables[i];
      if (!table || table.length !== 64) continue;

      // Table header: precision (4 bits) + table ID (4 bits)
      // Assuming 8-bit precision (0) for standard JPEG
      segmentData.push((0 << 4) | i); // precision=0, tableId=i

      // Table data (64 quantization values in zigzag order)
      segmentData.push(...table);
    }

    if (segmentData.length === 0) {
      console.warn('No valid quantization tables to serialize');
      return null;
    }

    // Add length (big-endian)
    const length = segmentData.length + 2;
    data.push((length >> 8) & 0xff, length & 0xff);
    data.push(...segmentData);

    console.log(`Serialized DQT: ${data.length} bytes for ${this.currentQuantTables.length} tables`);
    return new Uint8Array(data);
  }

  /**
   * Serialize DHT using our extracted Huffman table data
   */
  private serializeDHTFromExtractedData(): Uint8Array | null {
    if (!this.currentHuffmanTables || Object.keys(this.currentHuffmanTables).length === 0) {
      console.warn('No Huffman tables available for DHT serialization');
      return null;
    }

    const data: number[] = [0xff, 0xc4]; // DHT marker
    const segmentData: number[] = [];

    // Serialize each Huffman table
    for (const [tableKey, huffmanTable] of Object.entries(this.currentHuffmanTables)) {
      const [tableClass, tableId] = tableKey.split('_').map(Number);

      if (!huffmanTable.tree) {
        console.warn(`No tree data for Huffman table ${tableKey}`);
        continue;
      }

      // Table header: table class (4 bits) + table ID (4 bits)
      segmentData.push((tableClass << 4) | tableId);

      // Extract code lengths from tree structure
      const codeLengths = this.extractCodeLengthsFromTree(huffmanTable.tree);

      // Code lengths for lengths 1-16 (16 bytes)
      segmentData.push(...codeLengths);

      // Extract symbols from tree structure
      const symbols = this.extractSymbolsFromTree(huffmanTable.tree);

      // Symbol values
      segmentData.push(...symbols);

      console.log(
        `Serialized Huffman table ${tableKey}: ${codeLengths.length} code lengths, ${symbols.length} symbols`
      );
    }

    if (segmentData.length === 0) {
      console.warn('No valid Huffman tables to serialize');
      return null;
    }

    // Add length (big-endian)
    const length = segmentData.length + 2;
    data.push((length >> 8) & 0xff, length & 0xff);
    data.push(...segmentData);

    console.log(`Serialized DHT: ${data.length} bytes for ${Object.keys(this.currentHuffmanTables).length} tables`);
    return new Uint8Array(data);
  }

  /**
   * Serialize SOF using image dimensions
   */
  private serializeSOFFromImageDimensions(): Uint8Array | null {
    if (!this.currentImageDimensions) {
      console.warn('No image dimensions available for SOF serialization');
      return null;
    }

    const data: number[] = [0xff, 0xc0]; // SOF0 marker (baseline DCT)
    const segmentData: number[] = [];

    // Frame header
    segmentData.push(8); // Sample precision (8 bits)

    // Image dimensions (big-endian)
    const { width, height } = this.currentImageDimensions;
    segmentData.push((height >> 8) & 0xff, height & 0xff);
    segmentData.push((width >> 8) & 0xff, width & 0xff);

    // Number of components (standard RGB = 3)
    const numComponents = 3;
    segmentData.push(numComponents);

    // Component specifications (standard YCbCr)
    const components = [
      { id: 1, h: 2, v: 2, qId: 0 }, // Y (luminance)
      { id: 2, h: 1, v: 1, qId: 1 }, // Cb (chrominance)
      { id: 3, h: 1, v: 1, qId: 1 }, // Cr (chrominance)
    ];

    for (const comp of components) {
      segmentData.push(comp.id);
      segmentData.push((comp.h << 4) | comp.v); // Sampling factors
      segmentData.push(comp.qId); // Quantization table ID
    }

    // Add length (big-endian)
    const length = segmentData.length + 2;
    data.push((length >> 8) & 0xff, length & 0xff);
    data.push(...segmentData);

    console.log(`Serialized SOF: ${data.length} bytes for ${width}x${height} image`);
    return new Uint8Array(data);
  }

  /**
   * Embed message in DCT coefficients (LSB modification)
   */
  async embedMessage(imageBuffer: Uint8Array, message: string): Promise<IJp3gEnhancedEmbedResult> {
    try {
      console.log(`Embedding message: "${message}"`);

      const parseResult = await this.parseWithDCTCoefficients(imageBuffer);
      if (!parseResult.success || !parseResult.dctCoefficients) {
        return {
          success: false,
          error: parseResult.error || 'Failed to parse DCT coefficients',
        };
      }

      const messageBytes = new TextEncoder().encode(message);
      console.log(`Message bytes: ${messageBytes.length}`);

      // Calculate available capacity (placeholder)
      const availableCoefficients = this.calculateAvailableCoefficients(parseResult.dctCoefficients);
      console.log(`Available coefficients for modification: ${availableCoefficients}`);

      if (messageBytes.length * 8 > availableCoefficients) {
        return {
          success: false,
          error: `Message too large: ${messageBytes.length * 8} bits needed, ${availableCoefficients} available`,
        };
      }

      // Modify coefficients
      const modifiedCoefficients = this.modifyCoefficientsWithMessage(parseResult.dctCoefficients, messageBytes);

      console.log(`Modified ${modifiedCoefficients} coefficients`);

      // Re-encode modified DCT coefficients back to entropy-coded format
      const newSosData = await this.reencodeCoefficients(parseResult.dctCoefficients, parseResult.huffmanTables!);
      if (!newSosData) {
        return {
          success: false,
          error: 'Failed to re-encode DCT coefficients',
        };
      }

      // Rebuild complete JPEG with modified SOS segment
      const modifiedJpeg = await this.rebuildJPEG(
        parseResult.jpegStructure!,
        newSosData,
        parseResult.quantTables,
        parseResult.huffmanTables,
        {
          width: parseResult.dctCoefficients.width,
          height: parseResult.dctCoefficients.height,
        }
      );
      if (!modifiedJpeg) {
        return {
          success: false,
          error: 'Failed to rebuild JPEG with modified coefficients',
        };
      }

      return {
        success: true,
        modifiedJpeg,
        coefficientsModified: modifiedCoefficients,
        blocks: parseResult.dctCoefficients.blocks.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Embedding failed',
      };
    }
  }

  /**
   * Calculate number of available coefficients for modification
   */
  private calculateAvailableCoefficients(dctCoefficients: IDCTCoefficients): number {
    let available = 0;

    for (const block of dctCoefficients.blocks) {
      // Count non-zero AC coefficients (they can be modified)
      for (const coeff of block.ac) {
        if (coeff !== 0 && Math.abs(coeff) >= 2) {
          available++;
        }
      }
    }

    return available;
  }

  /**
   * Modify DCT coefficients to embed message bits
   */
  private modifyCoefficientsWithMessage(dctCoefficients: IDCTCoefficients, messageBytes: Uint8Array): number {
    let modified = 0;
    let bitIndex = 0;
    const totalBits = messageBytes.length * 8;

    for (const block of dctCoefficients.blocks) {
      if (bitIndex >= totalBits) break;

      for (let i = 0; i < block.ac.length; i++) {
        if (bitIndex >= totalBits) break;

        const coeff = block.ac[i];
        if (coeff !== 0 && Math.abs(coeff) >= 2) {
          // Extract bit from message
          const byteIndex = Math.floor(bitIndex / 8);
          const bitPos = bitIndex % 8;
          const messageBit = (messageBytes[byteIndex] >> bitPos) & 1;

          // Modify LSB of coefficient
          const currentLSB = Math.abs(coeff) & 1;
          if (currentLSB !== messageBit) {
            if (coeff > 0) {
              block.ac[i] = messageBit === 1 ? coeff | 1 : coeff & ~1;
            } else {
              block.ac[i] = messageBit === 1 ? coeff | -1 : coeff & ~1;
            }
            modified++;
          }

          bitIndex++;
        }
      }
    }

    return modified;
  }

  /**
   * Extract message from DCT coefficients
   */
  async extractMessage(
    imageBuffer: Uint8Array,
    expectedLength: number
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const parseResult = await this.parseWithDCTCoefficients(imageBuffer);
      if (!parseResult.success || !parseResult.dctCoefficients) {
        return {
          success: false,
          error: parseResult.error || 'Failed to parse DCT coefficients',
        };
      }

      const messageBytes = new Uint8Array(expectedLength);
      let bitIndex = 0;
      const totalBits = expectedLength * 8;

      for (const block of parseResult.dctCoefficients.blocks) {
        if (bitIndex >= totalBits) break;

        for (let i = 0; i < block.ac.length; i++) {
          if (bitIndex >= totalBits) break;

          const coeff = block.ac[i];
          if (coeff !== 0 && Math.abs(coeff) >= 2) {
            // Extract LSB from coefficient
            const lsb = Math.abs(coeff) & 1;

            // Store bit in message
            const byteIndex = Math.floor(bitIndex / 8);
            const bitPos = bitIndex % 8;
            if (lsb) {
              messageBytes[byteIndex] |= 1 << bitPos;
            }

            bitIndex++;
          }
        }
      }

      const message = new TextDecoder().decode(messageBytes);
      return {
        success: true,
        message,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Extraction failed',
      };
    }
  }
}
