import type { ISteganographyEngine } from '../interfaces/ISteganographyEngine';
import type { IImageProcessor, IImageData } from '../interfaces/IImageProcessor';
import type { EncodingResult } from '../types/EncodingResult';
import type { DecodingResult } from '../types/DecodingResult';
import type { CapacityCheckResult } from '../types/CapacityCheckResult';
import type { CompressionOptions } from '../types/CompressionOptions';
import type { EncodingMethod } from '../types/EncodingMethod';
import type { PixelData } from '../types/PixelData';

import { SimpleLSBEncoder } from '../algorithms/SimpleLSBEncoder';
import { SimpleLSBDecoder } from '../algorithms/SimpleLSBDecoder';
import { TripleRedundancyEncoder } from '../algorithms/TripleRedundancyEncoder';
import { TripleRedundancyDecoder } from '../algorithms/TripleRedundancyDecoder';
import { CapacityCalculator } from '../utils/CapacityCalculator/CapacityCalculator';
import { createHeader } from '../utils/HeaderUtility/HeaderUtility';
import { ALGORITHM_CONSTANTS, ERROR_CODES } from '../types/Constants';

/**
 * Simplified steganography engine for encoding/decoding messages in images
 * Handles automatic method selection, fallback logic, and JPEG compression to under 1MB
 */
export class SteganographyEngine implements ISteganographyEngine {
  private readonly imageProcessor: IImageProcessor;
  private readonly capacityCalculator: CapacityCalculator;
  private readonly simpleLSBEncoder: SimpleLSBEncoder;
  private readonly simpleLSBDecoder: SimpleLSBDecoder;
  private readonly tripleRedundancyEncoder: TripleRedundancyEncoder;
  private readonly tripleRedundancyDecoder: TripleRedundancyDecoder;

  constructor(imageProcessor: IImageProcessor) {
    this.imageProcessor = imageProcessor;
    this.capacityCalculator = new CapacityCalculator();
    this.simpleLSBEncoder = new SimpleLSBEncoder();
    this.simpleLSBDecoder = new SimpleLSBDecoder();
    this.tripleRedundancyEncoder = new TripleRedundancyEncoder();
    this.tripleRedundancyDecoder = new TripleRedundancyDecoder();
  }

  /**
   * Encode a message into an image with automatic method selection and compression
   */
  async encodeMessage(
    imageBuffer: ArrayBuffer,
    message: string,
    options: Partial<CompressionOptions> = {}
  ): Promise<EncodingResult> {
    try {
      // Prepare compression options - target under 1MB
      const compressionOptions: CompressionOptions = {
        quality: ALGORITHM_CONSTANTS.jpegQuality,
        maxSize: 1024 * 1024, // 1MB limit
        maxDimensions: ALGORITHM_CONSTANTS.maxDimensions,
        maintainAspectRatio: true,
        algorithm: 'none',
        level: 1,
        includeMetadata: false,
        ...options,
      };

      // Preprocess image to JPEG with steganography-optimized compression
      const preprocessedBuffer = await this.imageProcessor.preprocessImageToJPEG(imageBuffer, compressionOptions);

      // Decompress JPEG to intermediate format
      const imageData = await this.imageProcessor.decompressJPEG(preprocessedBuffer);

      // Convert to pixel data for LSB manipulation
      const pixelData = await this.imageProcessor.convertToPixelData(imageData);

      // Prepare message data
      const messageData = new TextEncoder().encode(message);

      // Try SimpleLSB first (maximum capacity)
      const simpleResult = await this.trySimpleLSBWithValidation(pixelData, messageData, imageData);
      if (simpleResult.success) {
        return simpleResult;
      }

      // If SimpleLSB fails and fallback is enabled, try TripleRedundancy
      if (ALGORITHM_CONSTANTS.enableFallback) {
        const tripleResult = await this.tryTripleRedundancy(pixelData, messageData, imageData);
        if (tripleResult.success) {
          return { ...tripleResult, usedFallback: true };
        }
      }

      // Both methods failed
      return {
        success: false,
        error: 'Message encoding failed with both Simple LSB and Triple Redundancy methods',
        errorCode: ERROR_CODES.MESSAGE_TOO_LARGE,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown encoding error',
        errorCode: ERROR_CODES.ENCODING_METHOD_FAILED,
      };
    }
  }

  /**
   * Decode a message from an image with automatic method detection
   */
  async decodeMessage(imageBuffer: ArrayBuffer): Promise<DecodingResult> {
    try {
      // Decompress JPEG to intermediate format
      const imageData = await this.imageProcessor.decompressJPEG(imageBuffer);

      // Convert to pixel data for LSB extraction
      const pixelData = await this.imageProcessor.convertToPixelData(imageData);

      // Try to detect encoding method by attempting to extract header
      const methodDetected = await this.detectEncodingMethod(pixelData);

      if (!methodDetected) {
        return {
          success: false,
          error: 'No valid steganography header found',
          errorCode: ERROR_CODES.INVALID_MAGIC_SIGNATURE,
        };
      }

      // Decode using detected method
      const result = await this.decodeWithMethod(pixelData, methodDetected);
      return { ...result, methodDetected };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown decoding error',
        errorCode: ERROR_CODES.EXTRACTION_FAILED,
      };
    }
  }

  /**
   * Check if a message can fit in an image and get capacity information
   */
  async checkCapacity(imageBuffer: ArrayBuffer, messageLength: number): Promise<CapacityCheckResult> {
    try {
      const dimensions = await this.imageProcessor.getImageDimensions(imageBuffer);

      // Calculate capacity for simple LSB (primary method)
      const simpleCapacity = this.capacityCalculator.calculateCapacity(
        dimensions.width,
        dimensions.height,
        1 // No redundancy
      );

      // Calculate capacity for triple redundancy (fallback)
      const tripleCapacity = this.capacityCalculator.calculateCapacity(
        dimensions.width,
        dimensions.height,
        3 // Triple redundancy
      );

      // Check if message fits in either method
      const canFit = messageLength <= simpleCapacity.capacity || messageLength <= tripleCapacity.capacity;

      return {
        canFit,
        capacity: simpleCapacity, // Return primary method capacity
      };
    } catch (error) {
      throw new Error(`Capacity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Try encoding with SimpleLSB method and validate the result
   */
  private async trySimpleLSBWithValidation(
    pixelData: PixelData,
    messageData: Uint8Array,
    imageData: IImageData
  ): Promise<EncodingResult> {
    try {
      // Check capacity
      const capacity = this.capacityCalculator.calculateCapacity(pixelData.width, pixelData.height, 1);
      if (messageData.length > capacity.capacity) {
        return {
          success: false,
          error: 'Message too large for SimpleLSB capacity',
          errorCode: ERROR_CODES.INSUFFICIENT_CAPACITY,
        };
      }

      // Create header
      const header = createHeader(messageData.length, 'simple-lsb', messageData);

      // Encode
      const encodedPixelData = await this.simpleLSBEncoder.encode(pixelData, messageData, header);

      // Apply to image and convert to JPEG
      const modifiedImageData = await this.imageProcessor.applyPixelData(imageData, encodedPixelData);
      const resultBuffer = await this.imageProcessor.compressToJPEG(modifiedImageData, ALGORITHM_CONSTANTS.jpegQuality);

      // Validate the encoded result by attempting to decode it
      const validationResult = await this.validateEncodedResult(resultBuffer, messageData);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: 'Simple LSB encoding failed validation - data corrupted during JPEG compression',
          errorCode: ERROR_CODES.ENCODING_METHOD_FAILED,
        };
      }

      return {
        success: true,
        imageData: resultBuffer,
        methodUsed: 'simple-lsb',
        usedFallback: false,
        capacityInfo: capacity,
        dimensions: { width: pixelData.width, height: pixelData.height },
        fileSize: resultBuffer.byteLength,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SimpleLSB encoding failed',
        errorCode: ERROR_CODES.ENCODING_METHOD_FAILED,
      };
    }
  }

  /**
   * Validate an encoded result by attempting to decode it
   * This simulates decoding the image after JPEG compression has occurred
   */
  private async validateEncodedResult(
    encodedBuffer: ArrayBuffer,
    originalMessageData: Uint8Array
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Load the encoded JPEG buffer back to ImageData
      const corruptedImageData = await this.imageProcessor.decompressJPEG(encodedBuffer);

      // Extract pixel data from the corrupted image
      const corruptedPixelData = await this.imageProcessor.convertToPixelData(corruptedImageData);

      // Try to detect which encoding method was used
      const detectedMethod = await this.detectEncodingMethod(corruptedPixelData);

      if (!detectedMethod) {
        return { isValid: false, error: 'No valid encoding method detected' };
      }

      // Decode using the detected method
      const decodeResult = await this.decodeWithMethod(corruptedPixelData, detectedMethod);

      if (!decodeResult.success) {
        return { isValid: false, error: decodeResult.error };
      }

      // Check if the decoded message matches the original
      const decodedMessageData = new TextEncoder().encode(decodeResult.message!);

      if (decodedMessageData.length !== originalMessageData.length) {
        return { isValid: false, error: 'Message length mismatch' };
      }

      // Compare byte by byte
      for (let i = 0; i < originalMessageData.length; i++) {
        if (decodedMessageData[i] !== originalMessageData[i]) {
          return { isValid: false, error: `Message content mismatch at byte ${i}` };
        }
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: error instanceof Error ? error.message : 'Validation failed' };
    }
  }

  /**
   * Try encoding with TripleRedundancy method with validation
   */
  private async tryTripleRedundancy(
    pixelData: PixelData,
    messageData: Uint8Array,
    imageData: IImageData
  ): Promise<EncodingResult> {
    try {
      // Check capacity
      const capacity = this.capacityCalculator.calculateCapacity(pixelData.width, pixelData.height, 3);
      if (messageData.length > capacity.capacity) {
        return {
          success: false,
          error: 'Message too large for TripleRedundancy capacity',
          errorCode: ERROR_CODES.INSUFFICIENT_CAPACITY,
        };
      }

      // Create header
      const header = createHeader(messageData.length, 'triple-redundancy', messageData);

      // Encode
      const encodedPixelData = await this.tripleRedundancyEncoder.encode(pixelData, messageData, header);

      // Apply to image and convert to JPEG
      const modifiedImageData = await this.imageProcessor.applyPixelData(imageData, encodedPixelData);
      const resultBuffer = await this.imageProcessor.compressToJPEG(modifiedImageData, ALGORITHM_CONSTANTS.jpegQuality);

      // Validate the encoded result by attempting to decode it
      const validationResult = await this.validateEncodedResult(resultBuffer, messageData);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: 'Triple Redundancy encoding failed validation - data corrupted during JPEG compression',
          errorCode: ERROR_CODES.ENCODING_METHOD_FAILED,
        };
      }

      return {
        success: true,
        imageData: resultBuffer,
        methodUsed: 'triple-redundancy',
        usedFallback: false,
        capacityInfo: capacity,
        dimensions: { width: pixelData.width, height: pixelData.height },
        fileSize: resultBuffer.byteLength,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'TripleRedundancy encoding failed',
        errorCode: ERROR_CODES.ENCODING_METHOD_FAILED,
      };
    }
  }

  /**
   * Detect encoding method by attempting to extract headers
   */
  private async detectEncodingMethod(pixelData: PixelData): Promise<EncodingMethod | null> {
    // Try SimpleLSB first
    try {
      const header = await this.simpleLSBDecoder.extractHeader(pixelData);
      if (header && header.magicSignature === ALGORITHM_CONSTANTS.magicSignature) {
        return 'simple-lsb';
      }
    } catch {
      // Header extraction failed, try next method
    }

    // Try TripleRedundancy
    try {
      const header = await this.tripleRedundancyDecoder.extractHeader(pixelData);
      if (header && header.magicSignature === ALGORITHM_CONSTANTS.magicSignature) {
        return 'triple-redundancy';
      }
    } catch {
      // Header extraction failed
    }

    return null;
  }

  /**
   * Decode using the specified method
   */
  private async decodeWithMethod(pixelData: PixelData, method: EncodingMethod): Promise<DecodingResult> {
    try {
      if (method === 'simple-lsb') {
        const header = await this.simpleLSBDecoder.extractHeader(pixelData);
        const messageData = await this.simpleLSBDecoder.decode(pixelData, header);
        const message = new TextDecoder().decode(messageData);

        return {
          success: true,
          message,
          methodDetected: method,
          messageLength: messageData.length,
          validation: {
            isValid: true,
            errors: [],
            magicSignatureValid: true,
            versionSupported: true,
            checksumValid: true,
            lengthValid: true,
          },
        };
      } else if (method === 'triple-redundancy') {
        const header = await this.tripleRedundancyDecoder.extractHeader(pixelData);
        const messageData = await this.tripleRedundancyDecoder.decode(pixelData, header);
        const message = new TextDecoder().decode(messageData);

        return {
          success: true,
          message,
          methodDetected: method,
          messageLength: messageData.length,
          validation: {
            isValid: true,
            errors: [],
            magicSignatureValid: true,
            versionSupported: true,
            checksumValid: true,
            lengthValid: true,
          },
        };
      }

      return {
        success: false,
        error: `Unsupported encoding method: ${method}`,
        errorCode: ERROR_CODES.ENCODING_METHOD_FAILED,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Decoding failed',
        errorCode: ERROR_CODES.EXTRACTION_FAILED,
      };
    }
  }
}
