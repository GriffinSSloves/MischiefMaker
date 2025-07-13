/* eslint-disable no-console */
import jp3gFork, { JpegImage, type JpegDecoder, type DecoderComponent } from '../decoder/jp3gDecoder';
import { IJpegInternalDecoder } from '../types/IJpegDecoder';
import { JPEGEncoder } from '../encoder/jp3gEncoder';
import type { JfifData, AdobeData } from '../decoder/utils/markerParsers';
import { extractDCTFromPreservedBlocks, extractDCTFromInternalBlocks } from './utils/DCTExtractor';
import { embedMessageInDctBlocks } from './utils/MessageEmbedder';
import { extractMessageFromDctBlocks } from './utils/MessageExtractor';
import {
  ISteganographyClient,
  SteganographyOptions,
  EmbedResult,
  ExtractResult,
  RoundTripTestResult,
  ImageBuffer,
} from '../interfaces/ISteganographyClient';

export interface IJp3gForkParseResult {
  success: boolean;
  error?: string;
  jpegStructure?: {
    width: number;
    height: number;
    components: DecoderComponent[];
    jfif?: JfifData | null;
    adobe?: AdobeData | null;
    comments: string[];
    _decoder: JpegDecoder;
  };
  dctCoefficients?: {
    blocks: Array<{
      dc: number;
      ac: number[]; // 63 AC coefficients
    }>;
    width: number;
    height: number;
    totalBlocks: number;
  };
  internalDecoder?: JpegDecoder;
}

export interface IJp3gForkClientLegacy {
  parseWithInternalAccess(imageBuffer: Uint8Array): Promise<IJp3gForkParseResult>;
  debugInternalStructure(imageBuffer: Uint8Array): Promise<void>;
}

/**
 * JPEG Steganography Client using jp3g fork
 *
 * Implements the clean ISteganographyClient interface while providing
 * internal debugging capabilities for development.
 */
export class Jp3gForkClient implements ISteganographyClient, IJp3gForkClientLegacy {
  private debugMode: boolean = false;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
  }

  // ============================================================================
  // PUBLIC INTERFACE METHODS (ISteganographyClient)
  // ============================================================================

  /**
   * Hide a text message inside a JPEG image
   */
  async embedMessage(image: Uint8Array, message: string, options: SteganographyOptions = {}): Promise<EmbedResult> {
    try {
      if (this.debugMode) {
        console.log('=== STEGANOGRAPHY EMBEDDING ===');
        console.log(`Message: "${message}" (${message.length} chars)`);
        console.log('Options:', options);
      }

      // Parse the original JPEG
      const jpegObject = jp3gFork(image).toObject();
      const decoder = jpegObject._decoder as IJpegInternalDecoder;

      if (!decoder) {
        return { success: false, error: 'Failed to access internal decoder' };
      }

      if (this.debugMode) {
        console.log(`JPEG: ${decoder.width}x${decoder.height}, ${decoder.components.length} components`);
        console.log(`File size: ${image.length} bytes`);
      }

      // Embed message
      const messageBytes = new TextEncoder().encode(message);
      const embedStats = embedMessageInDctBlocks(decoder, messageBytes);

      if (embedStats.bytesEmbedded < messageBytes.length) {
        return {
          success: false,
          error: `Insufficient capacity: embedded ${embedStats.bytesEmbedded}/${messageBytes.length} bytes`,
        };
      }

      // Determine quality
      const quality = options.quality || this.estimateOriginalQuality(decoder);

      if (this.debugMode) {
        console.log(`Using quality: ${quality}`);
        console.log(`Embedded ${embedStats.bytesEmbedded} bytes in ${embedStats.coefficientsModified} coefficients`);
      }

      // Re-encode with fixed subsampling bug
      const encoder = new JPEGEncoder(quality);
      const metadata = this.createEncoderMetadata(decoder, options);
      const modifiedJpeg = encoder.encodeFromDCT(decoder, metadata, quality);

      const imageBuffer: ImageBuffer = {
        data: new Uint8Array(modifiedJpeg),
        size: modifiedJpeg.length,
      };

      return {
        success: true,
        imageWithMessage: imageBuffer,
        stats: {
          messageLength: message.length,
          coefficientsUsed: embedStats.coefficientsModified,
          originalFileSize: image.length,
          finalFileSize: modifiedJpeg.length,
          qualityUsed: quality,
        },
      };
    } catch (error) {
      console.error('Embedding failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown embedding error',
      };
    }
  }

  /**
   * Extract a hidden message from a JPEG image
   */
  async extractMessage(image: Uint8Array, expectedLength?: number): Promise<ExtractResult> {
    try {
      if (this.debugMode) {
        console.log('=== STEGANOGRAPHY EXTRACTION ===');
        console.log(`Expected length: ${expectedLength || 'auto-detect'} chars`);
      }

      // Parse the JPEG
      const jpegObject = jp3gFork(image).toObject();
      const decoder = jpegObject._decoder as IJpegInternalDecoder;

      if (!decoder) {
        return { success: false, error: 'Failed to access internal decoder' };
      }

      if (this.debugMode) {
        console.log(`JPEG: ${decoder.width}x${decoder.height}, ${decoder.components.length} components`);
        console.log(`File size: ${image.length} bytes`);
      }

      // Extract message
      const estimatedLength = expectedLength || this.estimateMessageLength(decoder);
      const extractResult = extractMessageFromDctBlocks(decoder, estimatedLength);

      if (extractResult.bytes.length === 0) {
        return {
          success: false,
          error: 'No message found or extraction failed',
        };
      }

      const extractedMessage = new TextDecoder().decode(extractResult.bytes);

      if (this.debugMode) {
        console.log(`Extracted: "${extractedMessage}"`);
        console.log(`Read ${extractResult.coefficientsRead} coefficients`);
      }

      return {
        success: true,
        message: extractedMessage,
        stats: {
          messageLength: extractedMessage.length,
          coefficientsRead: extractResult.coefficientsRead,
        },
      };
    } catch (error) {
      console.error('Extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown extraction error',
      };
    }
  }

  /**
   * Test round-trip: embed message, then extract it to verify
   */
  async testRoundTrip(
    image: Uint8Array,
    message: string,
    options: SteganographyOptions = {}
  ): Promise<RoundTripTestResult> {
    try {
      if (this.debugMode) {
        console.log('=== ROUND-TRIP TEST ===');
        console.log(`Testing message: "${message}"`);
      }

      // Step 1: Embed message
      const embedResult = await this.embedMessage(image, message, options);

      if (!embedResult.success || !embedResult.imageWithMessage) {
        return {
          success: false,
          error: embedResult.error || 'Embedding failed',
          originalMessage: message,
        };
      }

      // Step 2: Extract message
      const extractResult = await this.extractMessage(embedResult.imageWithMessage.data, message.length);

      if (!extractResult.success) {
        return {
          success: false,
          error: extractResult.error || 'Extraction failed',
          originalMessage: message,
        };
      }

      // Step 3: Verify round-trip
      const messagesMatch = extractResult.message === message;

      if (this.debugMode) {
        console.log(`Original: "${message}"`);
        console.log(`Extracted: "${extractResult.message}"`);
        console.log(`Match: ${messagesMatch ? '✅ SUCCESS' : '❌ FAILURE'}`);
      }

      return {
        success: messagesMatch,
        originalMessage: message,
        extractedMessage: extractResult.message,
        messagesMatch,
      };
    } catch (error) {
      console.error('Round-trip test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown round-trip error',
        originalMessage: message,
      };
    }
  }

  // ============================================================================
  // INTERNAL HELPER METHODS
  // ============================================================================

  private estimateOriginalQuality(decoder: IJpegInternalDecoder): number {
    const quantTable = decoder.components[0]?.quantizationTable || [];
    if (quantTable.length === 0) {
      return 85;
    }

    const avgQuant = Array.from(quantTable).reduce((sum, val) => sum + val, 0) / quantTable.length;
    return Math.max(10, Math.min(100, 100 - avgQuant));
  }

  private estimateMessageLength(decoder: IJpegInternalDecoder): number {
    // Conservative estimate: assume we can use 10% of suitable coefficients
    const component = decoder.components[0];
    const blocks = component.dctBlocks || component.blocks || [];
    const totalCoefficients = blocks.length * 64;
    return Math.floor((totalCoefficients * 0.1) / 8); // bits to bytes
  }

  private createEncoderMetadata(decoder: IJpegInternalDecoder, options: SteganographyOptions) {
    // Fix the subsampling bug mentioned in the analysis
    const hSampRatio = decoder.components[1]
      ? decoder.components[1].scaleX === 0.5
        ? 1
        : Math.round(1 / (decoder.components[1].scaleX || 1))
      : 1;
    const vSampRatio = decoder.components[1]
      ? decoder.components[1].scaleY === 0.5
        ? 1
        : Math.round(1 / (decoder.components[1].scaleY || 1))
      : 1;

    return {
      width: decoder.width,
      height: decoder.height,
      quantizationTables: options.preserveQuality
        ? ([
            Array.from(decoder.components[0]?.quantizationTable || []),
            decoder.components[1] ? Array.from(decoder.components[1].quantizationTable || []) : undefined,
          ] as [number[], number[]?])
        : undefined,
      hSampRatio,
      vSampRatio,
      comments: decoder.comments || [],
      exif: decoder.exifBuffer || null,
    };
  }

  // ============================================================================
  // LEGACY/DEBUG METHODS (for internal testing and backwards compatibility)
  // ============================================================================
  /**
   * LEGACY: Parse JPEG using our jp3g fork and try to access internal DCT data
   *
   * @deprecated Use the clean interface methods instead
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
          const dctCoefficients = extractDCTFromPreservedBlocks(internalDecoder);

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
          const dctCoefficients = extractDCTFromInternalBlocks(internalDecoder);

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
   * DEBUG: Inspect the internal structure of our jp3g fork
   */
  async debugInternalStructure(imageBuffer: Uint8Array): Promise<void> {
    try {
      console.log('=== JP3G FORK DEBUG: Internal Structure Analysis ===');

      // Create a new decoder directly
      const decoder = new (JpegImage as unknown as new () => JpegDecoder)();
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
        decoder.components.forEach((comp: DecoderComponent, index: number) => {
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
        const value = (decoder as unknown as Record<string, unknown>)[prop];
        console.log(`${prop}:`, typeof value, Array.isArray(value) ? `[${value.length}]` : '');
      });
    } catch (error) {
      console.error('Debug failed:', error);
    }
  }
}
