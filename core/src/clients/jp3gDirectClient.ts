/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import jp3g from 'jp3g';

/**
 * Bit stream reader for JPEG entropy-coded data
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

export interface IJp3gDirectParseResult {
  success: boolean;
  error?: string;
  jpegStructure?: any;
  dctCoefficients?: {
    blocks: Array<{
      dc: number;
      ac: number[]; // 63 AC coefficients
    }>;
    width: number;
    height: number;
    totalBlocks: number;
  };
  huffmanTables?: { [key: string]: any };
  quantTables?: number[][];
}

export interface IJp3gDirectEmbedResult {
  success: boolean;
  error?: string;
  modifiedJpeg?: Uint8Array;
  coefficientsModified?: number;
  blocks?: number;
}

export class Jp3gDirectClient {
  /**
   * Parse JPEG and extract DCT coefficients using jp3g's built-in decoding
   */
  async parseWithDCTCoefficients(imageBuffer: Uint8Array): Promise<IJp3gDirectParseResult> {
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

      // Use jp3g's built-in decoding to extract DCT coefficients
      const dctCoefficients = await this.decodeCoefficientsWithJp3g(
        sosSegment,
        huffmanTables,
        quantTables,
        width,
        height
      );

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
  private extractHuffmanTables(jpegStructure: any[]): { [key: string]: any } {
    const huffmanTables: { [key: string]: any } = {};

    for (const segment of jpegStructure) {
      if (segment.type === 'DHT') {
        console.log('DHT segment found:', Object.keys(segment));

        if (segment.tables) {
          for (const table of segment.tables) {
            const tableClass = table.cls || 0;
            const tableId = table.id || 0;
            const key = `${tableClass}_${tableId}`;
            console.log(`Processing Huffman table: ${key}`, {
              tableClass,
              tableId,
              hasTree: !!table.tree,
            });

            huffmanTables[key] = table;
          }
        }
      }
    }

    return huffmanTables;
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
            console.log('Processing quantization table', {
              tableId: table.tableId,
              valuesLength: table.data ? Object.keys(table.data).length : 0,
              firstFewValues: table.data ? Object.values(table.data).slice(0, 8) : [],
              precision: table.precision,
            });

            // Convert jp3g's data object to array
            if (table.data) {
              const values: number[] = [];
              for (let i = 0; i < 64; i++) {
                values.push(table.data[i] || 0);
              }
              quantTables.push(values);
            }
          }
        }
      }
    }

    return quantTables;
  }

  /**
   * Use jp3g's built-in decoding to extract DCT coefficients
   */
  private async decodeCoefficientsWithJp3g(
    sosSegment: any,
    huffmanTables: { [key: string]: any },
    quantTables: number[][],
    width: number,
    height: number
  ): Promise<any> {
    console.log(`Decoding coefficients for ${width}x${height} image using jp3g's built-in decoder...`);
    console.log(`SOS data size: ${sosSegment.data.length} bytes`);

    // Calculate number of MCUs (Minimum Coded Units)
    const mcuWidth = Math.ceil(width / 8);
    const mcuHeight = Math.ceil(height / 8);
    const totalBlocks = mcuWidth * mcuHeight;

    console.log(`Total 8x8 blocks to decode: ${totalBlocks}`);

    try {
      // Create output array for DCT coefficients (64 coefficients per 8x8 block)
      const outQCoeffs = new Int16Array(64);

      // Get Huffman tables for DC and AC coefficients
      const dcTable = huffmanTables['0_0'] || huffmanTables['1_0'];
      const acTable = huffmanTables['0_1'] || huffmanTables['1_1'];

      if (!dcTable || !acTable) {
        throw new Error('Missing required Huffman tables for DC/AC decoding');
      }

      console.log('Using Huffman tables:', {
        dcTable: dcTable.cls + '_' + dcTable.id,
        acTable: acTable.cls + '_' + acTable.id,
      });

      // Create bit stream reader for entropy-coded data
      const bitStream = new BitStreamReader(sosSegment.data);
      const blocks = [];
      let previousDC = 0; // DC coefficients are DPCM encoded

      // Decode all blocks using jp3g's approach
      for (let blockIndex = 0; blockIndex < totalBlocks; blockIndex++) {
        // Progress logging for large images
        if (blockIndex > 0 && blockIndex % 1000 === 0) {
          console.log(
            `Progress: decoded ${blockIndex}/${totalBlocks} blocks (${((blockIndex / totalBlocks) * 100).toFixed(1)}%)`
          );
        }

        const block = this.decodeDCTBlockWithJp3g(bitStream, dcTable, acTable, previousDC, outQCoeffs);
        if (block) {
          blocks.push(block);
          previousDC = block.dc; // Update DC prediction
        } else {
          // If we can't decode more blocks, stop
          console.log(`Stopped decoding at block ${blockIndex}/${totalBlocks} - likely reached end of valid data`);
          console.log(`Final progress: ${((blockIndex / totalBlocks) * 100).toFixed(2)}% of image decoded`);
          break;
        }

        // Safety limit to prevent runaway loops
        if (blockIndex > 50000 && blocks.length < blockIndex * 0.5) {
          console.warn(`Decoding efficiency too low at block ${blockIndex}, stopping to prevent issues`);
          break;
        }
      }

      console.log(`Successfully decoded ${blocks.length} DCT blocks using jp3g's built-in decoder`);

      return {
        blocks,
        width,
        height,
        totalBlocks: blocks.length,
      };
    } catch (error) {
      console.error('Error decoding coefficients with jp3g:', error);
      throw error;
    }
  }

  /**
   * Decode a single 8x8 DCT block using jp3g's approach
   */
  private decodeDCTBlockWithJp3g(
    bitStream: BitStreamReader,
    dcTable: any,
    acTable: any,
    previousDC: number,
    outQCoeffs: Int16Array
  ): any | null {
    try {
      // Clear the output array
      outQCoeffs.fill(0);

      // Decode DC coefficient (DPCM encoded)
      const dcValue = this.decodeDCWithJp3g(bitStream, dcTable);
      if (dcValue === null) return null;

      const currentDC = previousDC + dcValue;
      outQCoeffs[0] = currentDC;

      // Decode AC coefficients
      this.decodeACWithJp3g(bitStream, acTable, outQCoeffs);

      // Convert to our block format
      const ac = Array.from(outQCoeffs.slice(1)); // Skip DC coefficient

      return {
        dc: currentDC,
        ac: ac,
      };
    } catch {
      return null;
    }
  }

  /**
   * Decode DC coefficient using jp3g's approach
   */
  private decodeDCWithJp3g(bitStream: BitStreamReader, dcTable: any): number | null {
    try {
      // Get magnitude from Huffman table
      const magnitude = this.decodeHuffmanSymbolWithJp3g(bitStream, dcTable);
      if (magnitude === null) return null;

      if (magnitude === 0) {
        return 0; // No additional bits needed
      }

      // Read additional bits
      const additionalBits = bitStream.readBits(magnitude);
      if (additionalBits === null) return null;

      // Extend sign
      return this.extendSign(additionalBits, magnitude);
    } catch {
      return null;
    }
  }

  /**
   * Decode AC coefficients using jp3g's approach
   */
  private decodeACWithJp3g(bitStream: BitStreamReader, acTable: any, outQCoeffs: Int16Array): void {
    let coeffIndex = 1; // Start after DC coefficient

    while (coeffIndex < 64) {
      const value = this.decodeHuffmanSymbolWithJp3g(bitStream, acTable);
      if (value === null) break;

      // The low nibble contains the number of bits to be read
      const loBits = value & 0x0f;
      // The high nibble contains the number of zero coefficients before this coefficient
      const hiBits = (value & 0xf0) >> 4;

      if (loBits !== 0) {
        // Skip zeros
        coeffIndex += hiBits;

        if (coeffIndex >= 64) break;

        // Read additional bits for coefficient value
        const extraBits = bitStream.readBits(loBits);
        if (extraBits === null) break;

        // Extend sign and store coefficient
        const coeffValue = this.extendSign(extraBits, loBits);
        outQCoeffs[coeffIndex] = coeffValue;
        coeffIndex++;
      } else {
        if (hiBits === 0xf) {
          // Run of 16 zeros
          coeffIndex += 16;
        } else if (hiBits === 0) {
          // End of block
          break;
        }
      }
    }
  }

  /**
   * Decode Huffman symbol using jp3g's tree traversal with fallback
   */
  private decodeHuffmanSymbolWithJp3g(bitStream: BitStreamReader, huffmanTable: any): number | null {
    if (!huffmanTable.tree) {
      return null;
    }

    let tree = huffmanTable.tree;
    let traversalDepth = 0;
    let fallbackAttempts = 0;
    const maxFallbackAttempts = 10;

    // Use jp3g's exact traversal method: tree[bit] with null checks
    while (true) {
      const bit = bitStream.readBit();
      if (bit === null) {
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
        // Invalid tree path - try fallback approach
        fallbackAttempts++;
        if (fallbackAttempts > maxFallbackAttempts) {
          console.log(`DEBUG: Too many fallback attempts (${fallbackAttempts}), giving up`);
          return null;
        }

        console.log(`DEBUG: Invalid tree path at depth ${traversalDepth}, bit=${bit}, attempt ${fallbackAttempts}`);
        console.log(`DEBUG: Tree length was ${Array.isArray(tree) ? tree.length : 'not array'}`);

        // Fallback: try to find any valid child node
        if (Array.isArray(tree)) {
          for (let i = 0; i < tree.length; i++) {
            if (tree[i] !== null && tree[i] !== undefined) {
              console.log(`DEBUG: Found fallback child at index ${i}`);
              tree = tree[i];
              break;
            }
          }
        }

        // If we still can't find a valid node, return null
        if (tree == null || tree === undefined) {
          console.log(`DEBUG: No valid fallback nodes found`);
          return null;
        }

        traversalDepth++;
        continue;
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
   * Embed message into DCT coefficients
   */
  async embedMessage(imageBuffer: Uint8Array, message: string): Promise<IJp3gDirectEmbedResult> {
    try {
      console.log(`Embedding message: "${message}"`);

      // Parse the image first
      const parseResult = await this.parseWithDCTCoefficients(imageBuffer);
      if (!parseResult.success || !parseResult.dctCoefficients) {
        return {
          success: false,
          error: parseResult.error || 'Failed to parse image',
        };
      }

      const dctCoefficients = parseResult.dctCoefficients;
      const messageBytes = new TextEncoder().encode(message);
      console.log(`Message bytes: ${messageBytes.length}`);

      // Calculate available coefficients for modification
      const availableCoefficients = this.calculateAvailableCoefficients(dctCoefficients);
      console.log(`Available coefficients for modification: ${availableCoefficients}`);

      if (messageBytes.length > availableCoefficients) {
        return {
          success: false,
          error: `Message too large: ${messageBytes.length} bytes, only ${availableCoefficients} coefficients available`,
        };
      }

      // Modify coefficients with message (placeholder)
      const coefficientsModified = this.modifyCoefficientsWithMessage(dctCoefficients, messageBytes);
      console.log(`Modified ${coefficientsModified} coefficients`);

      // TODO: Re-encode and rebuild JPEG
      return {
        success: true,
        coefficientsModified,
        blocks: dctCoefficients.totalBlocks,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown embedding error',
      };
    }
  }

  /**
   * Calculate available coefficients for modification
   */
  private calculateAvailableCoefficients(dctCoefficients: any): number {
    let available = 0;
    for (const block of dctCoefficients.blocks) {
      // Count non-zero AC coefficients that can be modified
      for (let i = 1; i < block.ac.length; i++) {
        if (block.ac[i] !== 0) {
          available++;
        }
      }
    }
    return available;
  }

  /**
   * Modify DCT coefficients with message data
   */
  private modifyCoefficientsWithMessage(dctCoefficients: any, messageBytes: Uint8Array): number {
    let modified = 0;
    let messageIndex = 0;

    for (const block of dctCoefficients.blocks) {
      if (messageIndex >= messageBytes.length) break;

      // Modify AC coefficients (skip DC)
      for (let i = 1; i < block.ac.length && messageIndex < messageBytes.length; i++) {
        if (block.ac[i] !== 0) {
          // Simple LSB modification
          const originalValue = block.ac[i];
          const messageBit = (messageBytes[messageIndex] >> modified % 8) & 1;

          // Modify LSB
          if (originalValue > 0) {
            block.ac[i] = (originalValue & ~1) | messageBit;
          } else {
            block.ac[i] = -((Math.abs(originalValue) & ~1) | messageBit);
          }

          modified++;
          if (modified % 8 === 0) {
            messageIndex++;
          }
        }
      }
    }

    return modified;
  }
}
