/* eslint-disable */
// @ts-nocheck

import jp3gFork from '../decoder/jp3gDecoder';
import { IJpegInternalDecoder } from '../types/IJpegDecoder';
import { JPEGEncoder } from '../encoder/jp3gEncoder';
import { embedMessageSimplePerceptual, extractMessageSimplePerceptual } from './utils/SimplePerceptualEmbedder';
import { optimizeQualityForSteganography, IQualityAnalysis } from './utils/QualityAdaptation';

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
 * Enhanced JP3G Fork Client with perceptual weighting and quality adaptation
 * Provides significantly better visual quality for steganography operations
 */
export class EnhancedJp3gForkClient {
  private debugMode: boolean = false;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
  }

  /**
   * Enhanced message embedding with perceptual weighting and adaptive quality
   */
  async embedMessageEnhanced(
    imageBuffer: Uint8Array,
    message: string,
    options: {
      targetFileSize?: number;
      forceQuality?: number;
      preserveOriginalQuality?: boolean;
    } = {}
  ): Promise<IEnhancedEmbedResult> {
    try {
      if (this.debugMode) {
        console.log('\n=== ENHANCED STEGANOGRAPHY EMBEDDING ===');
        console.log(`Message: "${message}" (${message.length} chars, ${message.length * 8} bits)`);
        console.log(`Options:`, options);
      }

      // Step 1: Parse the original JPEG
      const jpegObject = jp3gFork(imageBuffer).toObject();
      const decoder = jpegObject._decoder as IJpegInternalDecoder;

      if (!decoder) {
        return { success: false, error: 'Failed to access internal decoder' };
      }

      if (this.debugMode) {
        console.log(`\nOriginal JPEG: ${decoder.width}x${decoder.height}, ${decoder.components.length} components`);
        console.log(`File size: ${imageBuffer.length} bytes`);
      }

      // Step 2: Analyze image quality and optimize encoding parameters
      const qualityOptimization = optimizeQualityForSteganography(decoder, options.targetFileSize);
      let actualQuality = options.forceQuality || qualityOptimization.quality;

      if (options.preserveOriginalQuality) {
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

      // Step 4: Re-encode with optimized settings
      const encoder = new JPEGEncoder(actualQuality);

      // Create metadata with optimized quantization tables
      const metadata = {
        width: decoder.width,
        height: decoder.height,
        quantizationTables: [qualityOptimization.quantizationTables[0], qualityOptimization.quantizationTables[1]] as [
          number[],
          number?,
        ],
        hSampRatio: decoder.components[1] ? Math.round(1 / (decoder.components[1].scaleX || 1)) : 2,
        vSampRatio: decoder.components[1] ? Math.round(1 / (decoder.components[1].scaleY || 1)) : 2,
        comments: decoder.comments || [],
        exif: decoder.exifBuffer || null,
      };

      if (this.debugMode) {
        console.log(`\nRe-encoding with optimized parameters...`);
        console.log(`  Using ${qualityOptimization.quantizationTables.length} quantization tables`);
        console.log(`  Sampling ratio: ${metadata.hSampRatio}:${metadata.vSampRatio}`);
      }

      const modifiedJpeg = encoder.encodeFromDCT(decoder, metadata, actualQuality);
      const modifiedSize = modifiedJpeg.length;
      const sizeChangePercent = ((modifiedSize - imageBuffer.length) / imageBuffer.length) * 100;

      if (this.debugMode) {
        console.log(`\nRe-encoding completed!`);
        console.log(`  Original size: ${imageBuffer.length} bytes`);
        console.log(`  Modified size: ${modifiedSize} bytes`);
        console.log(`  Size change: ${sizeChangePercent > 0 ? '+' : ''}${sizeChangePercent.toFixed(1)}%`);
      }

      return {
        success: true,
        modifiedJpeg: new Uint8Array(modifiedJpeg),
        stats: {
          coefficientsModified: embedStats.coefficientsModified,
          coefficientsSkipped: embedStats.coefficientsSkipped,
          bytesEmbedded: embedStats.bytesEmbedded,
          averagePerceptualWeight: embedStats.averagePerceptualWeight,
          embeddingEfficiency:
            (embedStats.coefficientsModified / (embedStats.coefficientsModified + embedStats.coefficientsSkipped)) *
            100,
          originalSize: imageBuffer.length,
          modifiedSize,
          sizeChangePercent,
          qualityAnalysis: qualityOptimization.analysis,
          encodingStrategy: qualityOptimization.strategy,
          recommendedQuality: qualityOptimization.quality,
          actualQuality,
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
   * Enhanced message extraction with perceptual weighting
   */
  async extractMessageEnhanced(
    imageBuffer: Uint8Array,
    expectedMessageLength: number
  ): Promise<IEnhancedExtractResult> {
    try {
      if (this.debugMode) {
        console.log('\n=== ENHANCED STEGANOGRAPHY EXTRACTION ===');
        console.log(`Expected message length: ${expectedMessageLength} chars`);
      }

      // Parse the JPEG
      const jpegObject = jp3gFork(imageBuffer).toObject();
      const decoder = jpegObject._decoder as IJpegInternalDecoder;

      if (!decoder) {
        return { success: false, error: 'Failed to access internal decoder' };
      }

      if (this.debugMode) {
        console.log(`\nJPEG: ${decoder.width}x${decoder.height}, ${decoder.components.length} components`);
        console.log(`File size: ${imageBuffer.length} bytes`);
      }

      // Extract message using simple perceptual weighting
      const extractResult = extractMessageSimplePerceptual(decoder, expectedMessageLength, this.debugMode);

      if (extractResult.bytes.length < expectedMessageLength) {
        return {
          success: false,
          error: `Extraction incomplete: got ${extractResult.bytes.length}/${expectedMessageLength} bytes`,
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
          coefficientsRead: extractResult.coefficientsRead,
          coefficientsSkipped: extractResult.coefficientsSkipped,
          bitsExtracted: extractResult.bitsExtracted,
          extractionEfficiency,
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
   * Complete round-trip test with enhanced algorithms
   */
  async testRoundTripEnhanced(
    imageBuffer: Uint8Array,
    message: string,
    options: {
      targetFileSize?: number;
      forceQuality?: number;
      preserveOriginalQuality?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    error?: string;
    originalMessage: string;
    extractedMessage?: string;
    messagesMatch?: boolean;
    modifiedJpeg?: Uint8Array;
    embedStats?: IEnhancedEmbedResult['stats'];
    extractStats?: IEnhancedExtractResult['stats'];
  }> {
    try {
      if (this.debugMode) {
        console.log('\n=== ENHANCED ROUND-TRIP TEST ===');
        console.log(`Testing message: "${message}"`);
      }

      // Step 1: Enhanced embedding
      const embedResult = await this.embedMessageEnhanced(imageBuffer, message, options);

      if (!embedResult.success || !embedResult.modifiedJpeg) {
        return {
          success: false,
          error: embedResult.error || 'Enhanced embedding failed',
          originalMessage: message,
        };
      }

      // Step 2: Enhanced extraction
      const extractResult = await this.extractMessageEnhanced(embedResult.modifiedJpeg, message.length);

      if (!extractResult.success) {
        return {
          success: false,
          error: extractResult.error || 'Enhanced extraction failed',
          originalMessage: message,
          modifiedJpeg: embedResult.modifiedJpeg,
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
          console.log(`  Original quality: ${embedResult.stats.qualityAnalysis.estimatedQuality}`);
          console.log(`  Encoding strategy: ${embedResult.stats.encodingStrategy}`);
          console.log(
            `  Size change: ${embedResult.stats.sizeChangePercent > 0 ? '+' : ''}${embedResult.stats.sizeChangePercent.toFixed(1)}%`
          );
          console.log(`  Embedding efficiency: ${embedResult.stats.embeddingEfficiency.toFixed(1)}%`);
          console.log(`  Perceptual weight: ${embedResult.stats.averagePerceptualWeight.toFixed(2)}`);
        }
      }

      return {
        success: messagesMatch,
        originalMessage: message,
        extractedMessage: extractResult.message,
        messagesMatch,
        modifiedJpeg: embedResult.modifiedJpeg,
        embedStats: embedResult.stats,
        extractStats: extractResult.stats,
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

  /**
   * Fallback embedding strategy using simpler coefficient selection
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
