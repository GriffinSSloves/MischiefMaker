/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import jp3gFork, { JpegImage } from '../jp3gFork/jp3gDecoder';
import { JPEGEncoder } from '../jp3gFork/jp3gEncoder';

export interface IJp3gForkParseResult {
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
  internalDecoder?: any; // Access to jp3g's internal decoder
}

export interface IJp3gForkEmbedResult {
  success: boolean;
  error?: string;
  modifiedJpeg?: Uint8Array;
  coefficientsModified?: number;
  blocks?: number;
}

/**
 * Client that uses our forked jp3g to access internal DCT decoding functions
 */
export class Jp3gForkClient {
  /**
   * Parse JPEG using our jp3g fork and try to access internal DCT data
   */
  async parseWithInternalAccess(imageBuffer: Uint8Array): Promise<IJp3gForkParseResult> {
    try {
      console.log('=== JP3G FORK CLIENT: Testing internal access ===');

      // Use our forked jp3g
      const jpegObject = jp3gFork(imageBuffer).toObject();
      console.log('Fork parsed JPEG successfully');
      console.log('Available properties:', Object.keys(jpegObject));

      // Access the internal decoder
      const internalDecoder = jpegObject._decoder;
      if (!internalDecoder) {
        throw new Error('No internal decoder available in fork');
      }

      console.log('Internal decoder available:', !!internalDecoder);
      console.log('Decoder properties:', Object.keys(internalDecoder));

      // Try to access the components with block data
      console.log('Components:', internalDecoder.components?.length || 0);

      if (internalDecoder.components && internalDecoder.components.length > 0) {
        const firstComponent = internalDecoder.components[0];
        console.log('First component properties:', Object.keys(firstComponent));

        // Check if we have access to the preserved DCT blocks (FORK MODIFICATION)
        if (firstComponent.dctBlocks) {
          console.log('✅ SUCCESS: Found preserved DCT blocks in fork!');
          console.log('DCT Blocks structure:', {
            rows: firstComponent.dctBlocks.length,
            cols: firstComponent.dctBlocks[0]?.length || 0,
            blockType: typeof firstComponent.dctBlocks[0]?.[0],
            blockLength: firstComponent.dctBlocks[0]?.[0]?.length || 0,
            blocksPerLine: firstComponent.blocksPerLine,
            blocksPerColumn: firstComponent.blocksPerColumn,
          });

          // Try to extract DCT coefficients from the preserved blocks
          const dctCoefficients = this.extractDCTFromPreservedBlocks(internalDecoder);

          return {
            success: true,
            jpegStructure: jpegObject,
            dctCoefficients,
            internalDecoder,
          };

          // Fallback: Check if we have access to the raw blocks (original method)
        } else if (firstComponent.blocks) {
          console.log('✅ SUCCESS: Found component blocks!');
          console.log('Blocks structure:', {
            rows: firstComponent.blocks.length,
            cols: firstComponent.blocks[0]?.length || 0,
            blockType: typeof firstComponent.blocks[0]?.[0],
            blockLength: firstComponent.blocks[0]?.[0]?.length || 0,
          });

          // Try to extract DCT coefficients from the blocks
          const dctCoefficients = this.extractDCTFromInternalBlocks(internalDecoder);

          return {
            success: true,
            jpegStructure: jpegObject,
            dctCoefficients,
            internalDecoder,
          };
        }
      }

      console.log('❌ No block data found in internal decoder');

      return {
        success: true,
        jpegStructure: jpegObject,
        internalDecoder,
      };
    } catch (error) {
      console.error('JP3G Fork parsing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown fork parsing error',
      };
    }
  }

  /**
   * Extract DCT coefficients from jp3g's preserved block structure (FORK MODIFICATION)
   */
  private extractDCTFromPreservedBlocks(decoder: any): any {
    console.log('Extracting DCT coefficients from preserved blocks...');

    const blocks: Array<{ dc: number; ac: number[] }> = [];

    // jp3g fork stores the preserved DCT blocks in dctBlocks
    if (!decoder.components || decoder.components.length === 0) {
      console.log('No components found');
      return { blocks, width: 0, height: 0, totalBlocks: 0 };
    }

    // For now, focus on the first component (usually luminance)
    const component = decoder.components[0];

    if (!component.dctBlocks) {
      console.log('No preserved dctBlocks found in component');
      return { blocks, width: 0, height: 0, totalBlocks: 0 };
    }

    console.log(`Processing ${component.dctBlocks.length} DCT block rows`);

    // Extract coefficients from each 8x8 block
    for (let blockRow = 0; blockRow < component.dctBlocks.length; blockRow++) {
      const blockRowData = component.dctBlocks[blockRow];

      for (let blockCol = 0; blockCol < blockRowData.length; blockCol++) {
        const block = blockRowData[blockCol];

        if (block && block.length === 64) {
          // This is an 8x8 DCT block with 64 coefficients
          const dc = block[0]; // DC coefficient
          const ac = Array.from(block.slice(1)) as number[]; // 63 AC coefficients

          blocks.push({ dc, ac });
        }
      }
    }

    console.log(`✅ Extracted ${blocks.length} DCT blocks from preserved data successfully!`);

    return {
      blocks,
      width: decoder.width || 0,
      height: decoder.height || 0,
      totalBlocks: blocks.length,
    };
  }

  /**
   * Extract DCT coefficients from jp3g's internal block structure
   */
  private extractDCTFromInternalBlocks(decoder: any): any {
    console.log('Extracting DCT coefficients from internal blocks...');

    const blocks: Array<{ dc: number; ac: number[] }> = [];

    // jp3g stores the image components with block data
    if (!decoder.components || decoder.components.length === 0) {
      console.log('No components found');
      return { blocks, width: 0, height: 0, totalBlocks: 0 };
    }

    // For now, focus on the first component (usually luminance)
    const component = decoder.components[0];

    if (!component.blocks) {
      console.log('No blocks found in component');
      return { blocks, width: 0, height: 0, totalBlocks: 0 };
    }

    console.log(`Processing ${component.blocks.length} block rows`);

    // Extract coefficients from each 8x8 block
    for (let blockRow = 0; blockRow < component.blocks.length; blockRow++) {
      const blockRowData = component.blocks[blockRow];

      for (let blockCol = 0; blockCol < blockRowData.length; blockCol++) {
        const block = blockRowData[blockCol];

        if (block && block.length === 64) {
          // This is an 8x8 DCT block with 64 coefficients
          const dc = block[0]; // DC coefficient
          const ac = Array.from(block.slice(1)) as number[]; // 63 AC coefficients

          blocks.push({ dc, ac });
        }
      }
    }

    console.log(`✅ Extracted ${blocks.length} DCT blocks successfully!`);

    return {
      blocks,
      width: decoder.width || 0,
      height: decoder.height || 0,
      totalBlocks: blocks.length,
    };
  }

  /**
   * Complete end-to-end steganography: embed message and re-encode JPEG
   */
  async embedMessageAndReencode(imageBuffer: Uint8Array, message: string, quality = 85): Promise<IJp3gForkEmbedResult> {
    try {
      console.log('=== END-TO-END STEGANOGRAPHY: EMBED & RE-ENCODE ===');

      // Step 1: Parse the original JPEG and extract DCT coefficients
      const parseResult = await this.parseWithInternalAccess(imageBuffer);

      if (!parseResult.success || !parseResult.internalDecoder) {
        return {
          success: false,
          error: parseResult.error || 'Failed to parse original JPEG',
        };
      }

      const decoder = parseResult.internalDecoder;
      console.log(`Original JPEG: ${decoder.width}x${decoder.height}, ${decoder.components.length} components`);

      // Step 2: Embed message in DCT coefficients
      const messageBytes = new TextEncoder().encode(message);
      let coefficientsModified = 0;
      let messageIndex = 0;
      let bitIndex = 0;

      // Process only the luminance component (Y) for simplicity
      const yComponent = decoder.components[0];
      if (!yComponent.dctBlocks) {
        return {
          success: false,
          error: 'No DCT blocks found in luminance component',
        };
      }

      console.log(`Embedding in ${yComponent.dctBlocks.length} × ${yComponent.dctBlocks[0].length} DCT blocks`);

      // Embed message bits in AC coefficients
      outerLoop: for (let blockRow = 0; blockRow < yComponent.dctBlocks.length; blockRow++) {
        for (let blockCol = 0; blockCol < yComponent.dctBlocks[blockRow].length; blockCol++) {
          const dctBlock = yComponent.dctBlocks[blockRow][blockCol];

          if (!dctBlock || dctBlock.length !== 64) continue;

          // Modify AC coefficients (skip DC at index 0)
          for (let coefIndex = 1; coefIndex < 64 && messageIndex < messageBytes.length; coefIndex++) {
            const coef = dctBlock[coefIndex];

            // Only modify non-zero coefficients with sufficient magnitude
            if (coef !== 0 && Math.abs(coef) >= 2) {
              // Extract bit from message
              const messageBit = (messageBytes[messageIndex] >> (7 - bitIndex)) & 1;

              // Modify LSB
              if (coef > 0) {
                dctBlock[coefIndex] = (coef & ~1) | messageBit;
              } else {
                dctBlock[coefIndex] = -((Math.abs(coef) & ~1) | messageBit);
              }

              coefficientsModified++;
              bitIndex++;

              if (bitIndex >= 8) {
                bitIndex = 0;
                messageIndex++;
                if (messageIndex >= messageBytes.length) {
                  break outerLoop;
                }
              }
            }
          }
        }
      }

      console.log(
        `✅ Embedded ${messageIndex} bytes (${messageIndex * 8} bits) in ${coefficientsModified} coefficients`
      );

      // Step 3: Re-encode the JPEG with modified coefficients
      const encoder = new (JPEGEncoder as any)(quality);

      // The `decoder` object contains all necessary metadata (quantization tables, comments)
      // and the modified DCT blocks. We pass it as both the data and metadata.
      console.log('Re-encoding JPEG with modified DCT coefficients...');
      const modifiedJpeg = encoder.encodeFromDCT(decoder, decoder, quality);

      console.log(`✅ Re-encoded JPEG: ${modifiedJpeg.length} bytes`);

      return {
        success: true,
        modifiedJpeg: new Uint8Array(modifiedJpeg),
        coefficientsModified,
        blocks: yComponent.dctBlocks.length * yComponent.dctBlocks[0].length,
      };
    } catch (error) {
      console.error('End-to-end steganography failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown embedding error',
      };
    }
  }

  /**
   * Extract embedded message from JPEG with steganography
   */
  async extractMessage(
    imageBuffer: Uint8Array,
    expectedMessageLength: number
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    bitsExtracted?: number;
    coefficientsRead?: number;
  }> {
    try {
      console.log('=== EXTRACTING MESSAGE FROM STEGANOGRAPHY ===');

      // Step 1: Parse the JPEG and extract DCT coefficients
      const parseResult = await this.parseWithInternalAccess(imageBuffer);

      if (!parseResult.success || !parseResult.internalDecoder) {
        return {
          success: false,
          error: parseResult.error || 'Failed to parse JPEG for extraction',
        };
      }

      const decoder = parseResult.internalDecoder;
      console.log(`Extracting from JPEG: ${decoder.width}x${decoder.height}, ${decoder.components.length} components`);

      // Step 2: Extract message bits from DCT coefficients
      const extractedBytes = new Uint8Array(expectedMessageLength);
      let coefficientsRead = 0;
      let messageIndex = 0;
      let bitIndex = 0;
      let currentByte = 0;

      // Process only the luminance component (Y) - same as embedding
      const yComponent = decoder.components[0];
      if (!yComponent.dctBlocks) {
        return {
          success: false,
          error: 'No DCT blocks found in luminance component',
        };
      }

      console.log(`Extracting from ${yComponent.dctBlocks.length} × ${yComponent.dctBlocks[0].length} DCT blocks`);

      // Extract message bits from AC coefficients in the same order as embedding
      outerLoop: for (let blockRow = 0; blockRow < yComponent.dctBlocks.length; blockRow++) {
        for (let blockCol = 0; blockCol < yComponent.dctBlocks[blockRow].length; blockCol++) {
          const dctBlock = yComponent.dctBlocks[blockRow][blockCol];

          if (!dctBlock || dctBlock.length !== 64) continue;

          // Extract from AC coefficients (skip DC at index 0) in same order as embedding
          for (let coefIndex = 1; coefIndex < 64 && messageIndex < expectedMessageLength; coefIndex++) {
            const coef = dctBlock[coefIndex];

            // Only read from non-zero coefficients with sufficient magnitude (same criteria as embedding)
            if (coef !== 0 && Math.abs(coef) >= 2) {
              // Extract LSB as message bit
              const messageBit = coef & 1;

              // Build the current byte
              currentByte |= messageBit << (7 - bitIndex);

              coefficientsRead++;
              bitIndex++;

              if (bitIndex >= 8) {
                // Completed a byte
                extractedBytes[messageIndex] = currentByte;
                messageIndex++;
                bitIndex = 0;
                currentByte = 0;

                if (messageIndex >= expectedMessageLength) {
                  break outerLoop;
                }
              }
            }
          }
        }
      }

      console.log(
        `✅ Extracted ${messageIndex} bytes (${messageIndex * 8} bits) from ${coefficientsRead} coefficients`
      );

      // Step 3: Convert bytes back to string
      const extractedMessage = new TextDecoder().decode(extractedBytes.slice(0, messageIndex));

      return {
        success: true,
        message: extractedMessage,
        bitsExtracted: messageIndex * 8,
        coefficientsRead,
      };
    } catch (error) {
      console.error('Message extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown extraction error',
      };
    }
  }

  /**
   * Complete round-trip test: embed message, re-encode, then extract message
   */
  async testRoundTripSteganography(
    imageBuffer: Uint8Array,
    message: string,
    quality = 85
  ): Promise<{
    success: boolean;
    error?: string;
    originalMessage?: string;
    extractedMessage?: string;
    messagesMatch?: boolean;
    modifiedJpeg?: Uint8Array;
    stats?: {
      originalSize: number;
      modifiedSize: number;
      coefficientsModified: number;
      coefficientsRead: number;
    };
  }> {
    try {
      console.log('=== ROUND-TRIP STEGANOGRAPHY TEST ===');
      console.log(`Testing with message: "${message}"`);

      // Step 1: Embed message and re-encode
      const embedResult = await this.embedMessageAndReencode(imageBuffer, message, quality);

      if (!embedResult.success || !embedResult.modifiedJpeg) {
        return {
          success: false,
          error: embedResult.error || 'Failed to embed message',
        };
      }

      console.log(`Embedding completed: ${embedResult.modifiedJpeg.length} bytes`);

      // Step 2: Extract message from the modified JPEG
      const extractResult = await this.extractMessage(embedResult.modifiedJpeg, message.length);

      if (!extractResult.success) {
        return {
          success: false,
          error: extractResult.error || 'Failed to extract message',
          modifiedJpeg: embedResult.modifiedJpeg,
        };
      }

      // Step 3: Compare messages
      const messagesMatch = extractResult.message === message;

      console.log(`Original message: "${message}"`);
      console.log(`Extracted message: "${extractResult.message}"`);
      console.log(`Messages match: ${messagesMatch ? '✅ YES' : '❌ NO'}`);

      return {
        success: true,
        originalMessage: message,
        extractedMessage: extractResult.message,
        messagesMatch,
        modifiedJpeg: embedResult.modifiedJpeg,
        stats: {
          originalSize: imageBuffer.length,
          modifiedSize: embedResult.modifiedJpeg.length,
          coefficientsModified: embedResult.coefficientsModified || 0,
          coefficientsRead: extractResult.coefficientsRead || 0,
        },
      };
    } catch (error) {
      console.error('Round-trip steganography test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown round-trip error',
      };
    }
  }

  /**
   * Complete end-to-end steganography: embed message and re-encode JPEG (LEGACY)
   */
  async embedMessageAndReencodeLegacy(
    imageBuffer: Uint8Array,
    message: string,
    quality = 85
  ): Promise<IJp3gForkEmbedResult> {
    try {
      console.log('=== END-TO-END STEGANOGRAPHY: EMBED & RE-ENCODE (LEGACY) ===');

      // Step 1: Parse the original JPEG and extract DCT coefficients
      const parseResult = await this.parseWithInternalAccess(imageBuffer);

      if (!parseResult.success || !parseResult.internalDecoder) {
        return {
          success: false,
          error: parseResult.error || 'Failed to parse original JPEG',
        };
      }

      const decoder = parseResult.internalDecoder;
      console.log(`Original JPEG: ${decoder.width}x${decoder.height}, ${decoder.components.length} components`);

      // Step 2: Embed message in DCT coefficients
      const messageBytes = new TextEncoder().encode(message);
      let coefficientsModified = 0;
      let messageIndex = 0;
      let bitIndex = 0;

      // Process only the luminance component (Y) for simplicity
      const yComponent = decoder.components[0];
      if (!yComponent.dctBlocks) {
        return {
          success: false,
          error: 'No DCT blocks found in luminance component',
        };
      }

      console.log(`Embedding in ${yComponent.dctBlocks.length} × ${yComponent.dctBlocks[0].length} DCT blocks`);

      // Embed message bits in AC coefficients
      outerLoop: for (let blockRow = 0; blockRow < yComponent.dctBlocks.length; blockRow++) {
        for (let blockCol = 0; blockCol < yComponent.dctBlocks[blockRow].length; blockCol++) {
          const dctBlock = yComponent.dctBlocks[blockRow][blockCol];

          if (!dctBlock || dctBlock.length !== 64) continue;

          // Modify AC coefficients (skip DC at index 0)
          for (let coefIndex = 1; coefIndex < 64 && messageIndex < messageBytes.length; coefIndex++) {
            const coef = dctBlock[coefIndex];

            // Only modify non-zero coefficients with sufficient magnitude
            if (coef !== 0 && Math.abs(coef) >= 2) {
              // Extract bit from message
              const messageBit = (messageBytes[messageIndex] >> (7 - bitIndex)) & 1;

              // Modify LSB
              if (coef > 0) {
                dctBlock[coefIndex] = (coef & ~1) | messageBit;
              } else {
                dctBlock[coefIndex] = -((Math.abs(coef) & ~1) | messageBit);
              }

              coefficientsModified++;
              bitIndex++;

              if (bitIndex >= 8) {
                bitIndex = 0;
                messageIndex++;
                if (messageIndex >= messageBytes.length) {
                  break outerLoop;
                }
              }
            }
          }
        }
      }

      console.log(
        `✅ Embedded ${messageIndex} bytes (${messageIndex * 8} bits) in ${coefficientsModified} coefficients`
      );

      // Step 3: Re-encode the JPEG with modified coefficients
      const encoder = new (JPEGEncoder as any)(quality);

      // Prepare DCT data for encoder
      const dctData = {
        width: decoder.width,
        height: decoder.height,
        components: decoder.components.map((comp: any) => ({
          dctBlocks: comp.dctBlocks,
          blocksPerLine: comp.blocksPerLine,
          blocksPerColumn: comp.blocksPerColumn,
        })),
      };

      // Prepare original metadata
      const originalMetadata = {
        comments: decoder.comments || [],
        exifBuffer: decoder.exifBuffer || null,
      };

      console.log('Re-encoding JPEG with modified DCT coefficients...');
      const modifiedJpeg = encoder.encodeFromDCT(dctData, originalMetadata, quality);

      console.log(`✅ Re-encoded JPEG: ${modifiedJpeg.length} bytes`);

      return {
        success: true,
        modifiedJpeg: new Uint8Array(modifiedJpeg),
        coefficientsModified,
        blocks: yComponent.dctBlocks.length * yComponent.dctBlocks[0].length,
      };
    } catch (error) {
      console.error('End-to-end steganography failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown embedding error',
      };
    }
  }

  /**
   * Debug: Inspect the internal structure of our jp3g fork
   */
  async debugInternalStructure(imageBuffer: Uint8Array): Promise<void> {
    try {
      console.log('=== JP3G FORK DEBUG: Internal Structure Analysis ===');

      // Create a new decoder directly
      const decoder = new (JpegImage as any)();
      decoder.opts = {
        colorTransform: undefined,
        useTArray: true,
        formatAsRGBA: false,
        tolerantDecoding: true,
        maxResolutionInMP: 100,
        maxMemoryUsageInMB: 512,
      };

      JpegImage.resetMaxMemoryUsage(512 * 1024 * 1024);

      console.log('Parsing with direct decoder access...');
      decoder.parse(imageBuffer);

      console.log('=== DECODER STRUCTURE ===');
      console.log('Width:', decoder.width);
      console.log('Height:', decoder.height);
      console.log('Components:', decoder.components?.length || 0);

      if (decoder.components) {
        decoder.components.forEach((comp: any, index: number) => {
          console.log(`\n--- Component ${index} ---`);
          console.log('Properties:', Object.keys(comp));
          console.log('Scale X:', comp.scaleX);
          console.log('Scale Y:', comp.scaleY);

          if (comp.lines) {
            console.log('Lines:', comp.lines.length);
            console.log('First line length:', comp.lines[0]?.length || 0);
          }
        });
      }

      // Check for any other internal properties
      console.log('\n=== ALL DECODER PROPERTIES ===');
      const allProps = Object.getOwnPropertyNames(decoder);
      allProps.forEach(prop => {
        const value = decoder[prop];
        console.log(`${prop}:`, typeof value, Array.isArray(value) ? `[${value.length}]` : '');
      });
    } catch (error) {
      console.error('Debug failed:', error);
    }
  }
}
