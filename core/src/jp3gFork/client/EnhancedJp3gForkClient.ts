/* eslint-disable no-console */

import jp3gFork from '../decoder/jp3gDecoder';
import { IJpegInternalDecoder } from '../types/IJpegDecoder';
import { JPEGEncoder } from '../encoder/jp3gEncoder';
import { embedMessageSimplePerceptual, extractMessageSimplePerceptual } from './utils/SimplePerceptualEmbedder';
import { optimizeQualityForSteganography, IQualityAnalysis } from './utils/QualityAdaptation';
import {
  ISteganographyClient,
  SteganographyOptions,
  EmbedResult,
  ExtractResult,
  RoundTripTestResult,
  ImageBuffer,
} from '../interfaces/ISteganographyClient';

export interface IEnhancedEmbedResult {
  success: boolean;
  error?: string;
  modifiedJpeg?: Uint8Array;
  stats?: {
    coefficientsModified: number;
    coefficientsSkipped: number;
    bytesEmbedded: number;
    averagePerceptualWeight: number;
    embeddingEfficiency: number;
    originalSize: number;
    modifiedSize: number;
    sizeChangePercent: number;
    qualityAnalysis: IQualityAnalysis;
    encodingStrategy: string;
    recommendedQuality: number;
    actualQuality: number;
  };
}

export interface IEnhancedExtractResult {
  success: boolean;
  error?: string;
  message?: string;
  stats?: {
    coefficientsRead: number;
    coefficientsSkipped: number;
    bitsExtracted: number;
    extractionEfficiency: number;
  };
}

/**
 * Enhanced JPEG Steganography Client with perceptual weighting and quality adaptation
 *
 * Implements the clean ISteganographyClient interface with advanced features:
 * - Perceptual weighting for better visual quality
 * - Adaptive quality optimization
 * - Fallback strategies for challenging images
 */
export class EnhancedJp3gForkClient implements ISteganographyClient {
  private debugMode: boolean = false;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
  }

  // ============================================================================
  // PUBLIC INTERFACE METHODS (ISteganographyClient)
  // ============================================================================

  /**
   * Hide a text message inside a JPEG image with enhanced perceptual weighting
   */
  async embedMessage(image: Uint8Array, message: string, options: SteganographyOptions = {}): Promise<EmbedResult> {
    try {
      if (this.debugMode) {
        console.log('\n=== ENHANCED STEGANOGRAPHY EMBEDDING ===');
        console.log(`Message: "${message}" (${message.length} chars, ${message.length * 8} bits)`);
        console.log('Options:', options);
      }

      // Step 1: Parse the original JPEG
      const jpegObject = jp3gFork(image).toObject();
      const decoder = jpegObject._decoder as IJpegInternalDecoder;

      if (!decoder) {
        return { success: false, error: 'Failed to access internal decoder' };
      }

      if (this.debugMode) {
        console.log(`\nOriginal JPEG: ${decoder.width}x${decoder.height}, ${decoder.components.length} components`);
        console.log(`File size: ${image.length} bytes`);
      }

      // Step 2: Analyze image quality and optimize encoding parameters
      const qualityOptimization = optimizeQualityForSteganography(decoder, options.maxFileSize);
      let actualQuality = options.quality || qualityOptimization.quality;

      if (options.preserveQuality) {
        actualQuality = Math.max(qualityOptimization.analysis.estimatedQuality, actualQuality);
      }

      if (this.debugMode) {
        console.log(`\nQuality Analysis:`);
        console.log(`  Estimated original quality: ${qualityOptimization.analysis.estimatedQuality}`);
        console.log(`  Recommended quality: ${qualityOptimization.quality}`);
        console.log(`  Actual encoding quality: ${actualQuality}`);
        console.log(`  Strategy: ${qualityOptimization.strategy}`);
        console.log(`  Analysis confidence: ${(qualityOptimization.analysis.confidence * 100).toFixed(1)}%`);
      }

      // Step 3: Enhanced message embedding with simple perceptual weighting
      const messageBytes = new TextEncoder().encode(message);
      const embedStats = embedMessageSimplePerceptual(decoder, messageBytes, this.debugMode);

      if (embedStats.bytesEmbedded < messageBytes.length) {
        if (this.debugMode) {
          console.log(`⚠️ Enhanced embedding insufficient capacity, using fallback strategy`);
        }

        // Fallback: Use simpler algorithm with lower perceptual weights but better capacity
        const fallbackStats = this.embedMessageFallback(decoder, messageBytes);

        if (fallbackStats.bytesEmbedded < messageBytes.length) {
          return {
            success: false,
            error: `Insufficient capacity even with fallback: embedded ${fallbackStats.bytesEmbedded}/${messageBytes.length} bytes`,
          };
        }

        if (this.debugMode) {
          console.log(`✅ Fallback embedding successful: ${fallbackStats.bytesEmbedded} bytes`);
        }
      }

      if (this.debugMode) {
        console.log(`\nEmbedding completed successfully!`);
        console.log(`  Coefficients modified: ${embedStats.coefficientsModified}`);
        console.log(`  Coefficients skipped: ${embedStats.coefficientsSkipped}`);
        console.log(`  Average perceptual weight: ${embedStats.averagePerceptualWeight.toFixed(2)}`);
        console.log(
          `  Embedding efficiency: ${((embedStats.coefficientsModified / (embedStats.coefficientsModified + embedStats.coefficientsSkipped)) * 100).toFixed(1)}%`
        );
      }

      // Step 4: Re-encode with optimized settings and fixed subsampling
      const encoder = new JPEGEncoder(actualQuality);
      const metadata = this.createEnhancedEncoderMetadata(decoder, qualityOptimization, options);
      const modifiedJpeg = encoder.encodeFromDCT(decoder, metadata, actualQuality);

      const imageBuffer: ImageBuffer = {
        data: new Uint8Array(modifiedJpeg),
        size: modifiedJpeg.length,
      };

      const sizeChangePercent = ((modifiedJpeg.length - image.length) / image.length) * 100;

      if (this.debugMode) {
        console.log(`\nRe-encoding completed!`);
        console.log(`  Original size: ${image.length} bytes`);
        console.log(`  Modified size: ${modifiedJpeg.length} bytes`);
        console.log(`  Size change: ${sizeChangePercent > 0 ? '+' : ''}${sizeChangePercent.toFixed(1)}%`);
      }

      return {
        success: true,
        imageWithMessage: imageBuffer,
        stats: {
          messageLength: message.length,
          coefficientsUsed: embedStats.coefficientsModified,
          originalFileSize: image.length,
          finalFileSize: modifiedJpeg.length,
          qualityUsed: actualQuality,
        },
      };
    } catch (error) {
      console.error('Enhanced embedding failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown enhanced embedding error',
      };
    }
  }

  /**
   * Extract a hidden message from a JPEG image with enhanced perceptual weighting
   */
  async extractMessage(image: Uint8Array, expectedLength?: number): Promise<ExtractResult> {
    try {
      if (this.debugMode) {
        console.log('\n=== ENHANCED STEGANOGRAPHY EXTRACTION ===');
        console.log(`Expected message length: ${expectedLength || 'auto-detect'} chars`);
      }

      // Parse the JPEG
      const jpegObject = jp3gFork(image).toObject();
      const decoder = jpegObject._decoder as IJpegInternalDecoder;

      if (!decoder) {
        return { success: false, error: 'Failed to access internal decoder' };
      }

      if (this.debugMode) {
        console.log(`\nJPEG: ${decoder.width}x${decoder.height}, ${decoder.components.length} components`);
        console.log(`File size: ${image.length} bytes`);
      }

      // Extract message using simple perceptual weighting
      const estimatedLength = expectedLength || this.estimateMessageLength(decoder);
      const extractResult = extractMessageSimplePerceptual(decoder, estimatedLength, this.debugMode);

      if (extractResult.bytes.length < estimatedLength) {
        return {
          success: false,
          error: `Extraction incomplete: got ${extractResult.bytes.length}/${estimatedLength} bytes`,
        };
      }

      const extractedMessage = new TextDecoder().decode(extractResult.bytes);
      const extractionEfficiency =
        (extractResult.coefficientsRead / (extractResult.coefficientsRead + extractResult.coefficientsSkipped)) * 100;

      if (this.debugMode) {
        console.log(`\nExtraction completed!`);
        console.log(`  Message: "${extractedMessage}"`);
        console.log(`  Coefficients read: ${extractResult.coefficientsRead}`);
        console.log(`  Coefficients skipped: ${extractResult.coefficientsSkipped}`);
        console.log(`  Extraction efficiency: ${extractionEfficiency.toFixed(1)}%`);
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
      console.error('Enhanced extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown enhanced extraction error',
      };
    }
  }

  /**
   * Test round-trip with enhanced algorithms
   */
  async testRoundTrip(
    image: Uint8Array,
    message: string,
    options: SteganographyOptions = {}
  ): Promise<RoundTripTestResult> {
    try {
      if (this.debugMode) {
        console.log('\n=== ENHANCED ROUND-TRIP TEST ===');
        console.log(`Testing message: "${message}"`);
      }

      // Step 1: Enhanced embedding
      const embedResult = await this.embedMessage(image, message, options);

      if (!embedResult.success || !embedResult.imageWithMessage) {
        return {
          success: false,
          error: embedResult.error || 'Enhanced embedding failed',
          originalMessage: message,
        };
      }

      // Step 2: Enhanced extraction
      const extractResult = await this.extractMessage(embedResult.imageWithMessage.data, message.length);

      if (!extractResult.success) {
        return {
          success: false,
          error: extractResult.error || 'Enhanced extraction failed',
          originalMessage: message,
        };
      }

      // Step 3: Verify round-trip
      const messagesMatch = extractResult.message === message;

      if (this.debugMode) {
        console.log(`\n=== ROUND-TRIP RESULTS ===`);
        console.log(`Original: "${message}"`);
        console.log(`Extracted: "${extractResult.message}"`);
        console.log(`Match: ${messagesMatch ? '✅ SUCCESS' : '❌ FAILURE'}`);

        if (embedResult.stats) {
          console.log(`\nQuality metrics:`);
          console.log(`  Encoding quality: ${embedResult.stats.qualityUsed}`);
          console.log(
            `  Size change: ${(((embedResult.stats.finalFileSize - embedResult.stats.originalFileSize) / embedResult.stats.originalFileSize) * 100).toFixed(1)}%`
          );
          console.log(`  Coefficients used: ${embedResult.stats.coefficientsUsed}`);
        }
      }

      return {
        success: messagesMatch,
        originalMessage: message,
        extractedMessage: extractResult.message,
        messagesMatch,
      };
    } catch (error) {
      console.error('Enhanced round-trip test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown enhanced round-trip error',
        originalMessage: message,
      };
    }
  }

  // ============================================================================
  // INTERNAL HELPER METHODS
  // ============================================================================

  private estimateMessageLength(decoder: IJpegInternalDecoder): number {
    // Conservative estimate for enhanced algorithm
    const component = decoder.components[0];
    const blocks = component.dctBlocks || component.blocks || [];
    const totalCoefficients = blocks.length * 64;
    return Math.floor((totalCoefficients * 0.05) / 8); // More conservative due to perceptual weighting
  }

  private createEnhancedEncoderMetadata(
    decoder: IJpegInternalDecoder,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    qualityOptimization: any,
    options: SteganographyOptions
  ) {
    // Fix the subsampling bug: handle 0.5 scale factors properly
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
        ? qualityOptimization.quantizationTables
        : ([qualityOptimization.quantizationTables[0], qualityOptimization.quantizationTables[1]] as [
            number[],
            number[]?,
          ]),
      hSampRatio,
      vSampRatio,
      comments: decoder.comments || [],
      exif: decoder.exifBuffer || null,
    };
  }

  /**
   * INTERNAL: Fallback embedding strategy using simpler coefficient selection
   * for images where the enhanced algorithm is too restrictive
   */
  private embedMessageFallback(
    decoder: IJpegInternalDecoder,
    message: Uint8Array
  ): {
    coefficientsModified: number;
    bytesEmbedded: number;
    blocksVisited: number;
    averagePerceptualWeight: number;
    coefficientsSkipped: number;
  } {
    const yComponent = decoder.components[0];
    if (!yComponent?.dctBlocks) {
      throw new Error('No DCT blocks available for fallback embedding');
    }

    let coefficientsModified = 0;
    let messageIndex = 0;
    let bitIndex = 0;

    const totalRows = yComponent.dctBlocks.length;
    const totalCols = yComponent.dctBlocks[0].length;

    // Simple fallback: use original algorithm with magnitude >= 2
    outer: for (let row = 0; row < totalRows; row++) {
      const rowData = yComponent.dctBlocks[row];
      for (let col = 0; col < totalCols; col++) {
        const block: number[] = rowData[col];
        if (!block || block.length !== 64) {
          continue;
        }

        for (let coefIdx = 1; coefIdx < 64; coefIdx++) {
          if (messageIndex >= message.length) {
            break outer;
          }

          const coef = block[coefIdx];
          if (coef !== 0 && Math.abs(coef) >= 2) {
            const bit = (message[messageIndex] >> (7 - bitIndex)) & 1;

            if (coef > 0) {
              block[coefIdx] = (coef & ~1) | bit;
            } else {
              block[coefIdx] = -((Math.abs(coef) & ~1) | bit);
            }

            coefficientsModified++;
            bitIndex++;

            if (bitIndex === 8) {
              bitIndex = 0;
              messageIndex++;
              if (messageIndex === message.length) {
                break outer;
              }
            }
          }
        }
      }
    }

    return {
      coefficientsModified,
      bytesEmbedded: messageIndex,
      blocksVisited: totalRows * totalCols,
      averagePerceptualWeight: 10, // Moderate weight for fallback
      coefficientsSkipped: 0,
    };
  }
}
