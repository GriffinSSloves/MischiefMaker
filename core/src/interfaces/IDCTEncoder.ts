import { DCTEncodingOptions } from '../types/DCTEncodingOptions';
import { DCTEncodingResult } from '../types/DCTEncodingResult';

/**
 * Interface for DCT coefficient-based steganography encoding
 * Uses f5stegojs library for JPEG steganography
 */
export interface IDCTEncoder {
  /**
   * Encode a message into JPEG DCT coefficients
   * @param jpegBuffer - Source JPEG image as ArrayBuffer
   * @param message - Message to encode (string or Uint8Array)
   * @param options - DCT encoding options including steganography key
   * @returns Promise resolving to encoding result with stego JPEG
   */
  encode(
    jpegBuffer: ArrayBuffer,
    message: string | Uint8Array,
    options: DCTEncodingOptions
  ): Promise<DCTEncodingResult>;
}
