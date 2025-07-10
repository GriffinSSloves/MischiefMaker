import type { IDCTSteganographyEngine } from '../interfaces/IDCTSteganographyEngine';
import type { DCTEncodingOptions } from '../types/DCTEncodingOptions';
import type { DCTEncodingResult } from '../types/DCTEncodingResult';
import type { DCTDecodingOptions } from '../types/DCTDecodingOptions';
import type { DCTDecodingResult } from '../types/DCTDecodingResult';
import F5Stego from 'f5stegojs';

/**
 * DCT coefficient-based steganography engine using f5stegojs
 * Provides JPEG steganography with compression resistance
 */
export class DCTSteganographyEngine implements IDCTSteganographyEngine {
  /**
   * Verify that the engine is ready
   */
  isReady(): boolean {
    return typeof F5Stego !== 'undefined';
  }

  /**
   * Encode a message into JPEG DCT coefficients
   */
  async encode(
    jpegBuffer: ArrayBuffer,
    message: string | Uint8Array,
    options: DCTEncodingOptions
  ): Promise<DCTEncodingResult> {
    if (!this.isReady()) {
      throw new Error('F5Stego library not available');
    }

    try {
      // Convert message to Uint8Array if it's a string
      const messageBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;

      // Convert ArrayBuffer to Uint8Array for f5stegojs
      const jpegBytes = new Uint8Array(jpegBuffer);

      // Validate JPEG format before processing
      if (jpegBytes.length < 10 || jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) {
        throw new Error('Invalid JPEG format: File does not start with JPEG magic bytes');
      }

      // Create F5Stego instance with key
      const stegger = new F5Stego(options.stegoKey);

      // Parse the JPEG to prepare for embedding
      // f5stegojs throws strings, not Error objects, so we need special handling
      try {
        stegger.parse(jpegBytes);
      } catch (parseError) {
        if (parseError === 'bad jpeg') {
          throw new Error(
            'JPEG format not supported by f5stegojs. The library requires baseline JPEG with specific characteristics. Try re-encoding the image with standard JPEG compression.'
          );
        }
        throw new Error(`JPEG parsing failed: ${parseError}`);
      }

      // Perform the embedding
      const embedResult = stegger.f5put(messageBytes);

      // Pack the result back to JPEG
      const stegoImageBytes = stegger.pack();

      // Convert back to ArrayBuffer
      const stegoImage = stegoImageBytes.buffer.slice(
        stegoImageBytes.byteOffset,
        stegoImageBytes.byteOffset + stegoImageBytes.byteLength
      );

      // Verify embedding if requested
      let verified: boolean | undefined;
      if (options.verifyEmbedding !== false) {
        try {
          const verifyStegger = new F5Stego(options.stegoKey);
          verifyStegger.parse(stegoImageBytes);
          const extractedBytes = verifyStegger.f5get();
          verified = this.arrayBuffersEqual(messageBytes, extractedBytes);
        } catch {
          verified = false;
        }
      }

      return {
        stegoImage,
        statistics: {
          originalSize: jpegBuffer.byteLength,
          stegoSize: stegoImage.byteLength,
          messageSize: messageBytes.length,
          codingParameter: embedResult.k,
          coefficientsExamined: embedResult.examined,
          coefficientsChanged: embedResult.changed,
          coefficientsThrown: embedResult.thrown,
          efficiency: parseFloat(embedResult.efficiency),
          processingTime: 0, // Timing will be handled in tests
        },
        verified,
      };
    } catch (error) {
      throw new Error(`DCT encoding failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Decode a message from JPEG DCT coefficients
   */
  async decode(stegoJpegBuffer: ArrayBuffer, options: DCTDecodingOptions): Promise<DCTDecodingResult> {
    if (!this.isReady()) {
      throw new Error('F5Stego library not available');
    }

    try {
      // Convert ArrayBuffer to Uint8Array for f5stegojs
      const stegoJpegBytes = new Uint8Array(stegoJpegBuffer);

      // Validate JPEG format before processing
      if (stegoJpegBytes.length < 10 || stegoJpegBytes[0] !== 0xff || stegoJpegBytes[1] !== 0xd8) {
        throw new Error('Invalid JPEG format: File does not start with JPEG magic bytes');
      }

      // Create F5Stego instance with key
      const stegger = new F5Stego(options.stegoKey);

      // Parse the stego JPEG
      // f5stegojs throws strings, not Error objects, so we need special handling
      try {
        stegger.parse(stegoJpegBytes);
      } catch (parseError) {
        if (parseError === 'bad jpeg') {
          throw new Error(
            'JPEG format not supported by f5stegojs. The library requires baseline JPEG with specific characteristics. Try re-encoding the image with standard JPEG compression.'
          );
        }
        throw new Error(`JPEG parsing failed: ${parseError}`);
      }

      // Extract the hidden message
      const extractedBytes = stegger.f5get();

      // Check if extraction was successful
      const success = extractedBytes && extractedBytes.length > 0;

      if (!success) {
        return {
          message: options.outputFormat === 'uint8array' ? new Uint8Array(0) : '',
          success: false,
          statistics: {
            stegoSize: stegoJpegBuffer.byteLength,
            messageSize: 0,
            processingTime: 0, // Timing will be handled in tests
          },
          error: 'No hidden message found or extraction failed',
        };
      }

      // Convert message to requested format
      const message = options.outputFormat === 'uint8array' ? extractedBytes : new TextDecoder().decode(extractedBytes);

      return {
        message,
        success: true,
        statistics: {
          stegoSize: stegoJpegBuffer.byteLength,
          messageSize: extractedBytes.length,
          processingTime: 0, // Timing will be handled in tests
        },
      };
    } catch (error) {
      return {
        message: options.outputFormat === 'uint8array' ? new Uint8Array(0) : '',
        success: false,
        statistics: {
          stegoSize: stegoJpegBuffer.byteLength,
          messageSize: 0,
          processingTime: 0, // Timing will be handled in tests
        },
        error: `DCT decoding failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get the maximum capacity for a JPEG image
   */
  async getCapacity(
    jpegBuffer: ArrayBuffer,
    stegoKey: number[]
  ): Promise<{
    maxBytes: number;
    maxBits: number;
    capacityByMode: number[];
    totalCoefficients: number;
    usableCoefficients: number;
  }> {
    if (!this.isReady()) {
      throw new Error('F5Stego library not available');
    }

    try {
      // Convert ArrayBuffer to Uint8Array for f5stegojs
      const jpegBytes = new Uint8Array(jpegBuffer);

      // Validate JPEG format before processing
      if (jpegBytes.length < 10 || jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) {
        throw new Error('Invalid JPEG format: File does not start with JPEG magic bytes');
      }

      // Create F5Stego instance with key
      const stegger = new F5Stego(stegoKey);

      // Parse the JPEG to analyze capacity
      // f5stegojs throws strings, not Error objects, so we need special handling
      try {
        stegger.parse(jpegBytes);
      } catch (parseError) {
        if (parseError === 'bad jpeg') {
          throw new Error(
            'JPEG format not supported by f5stegojs. The library requires baseline JPEG with specific characteristics. Try re-encoding the image with standard JPEG compression.'
          );
        }
        throw new Error(`JPEG parsing failed: ${parseError}`);
      }

      // Get capacity information
      const capacityInfo = stegger.analyze();

      // Find the maximum capacity (excluding index 0 which is unused)
      const maxBytes = Math.max(...capacityInfo.capacity.slice(1));
      const maxBits = maxBytes * 8;

      return {
        maxBytes,
        maxBits,
        capacityByMode: capacityInfo.capacity,
        totalCoefficients: capacityInfo.coeff_total,
        usableCoefficients: capacityInfo.coeff_large,
      };
    } catch (error) {
      throw new Error(`Capacity analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Helper method to compare two Uint8Arrays for verification
   */
  private arrayBuffersEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }
}
