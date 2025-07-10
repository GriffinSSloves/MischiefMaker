import { DCTDecodingOptions } from '../types/DCTDecodingOptions';
import { DCTDecodingResult } from '../types/DCTDecodingResult';

/**
 * Interface for DCT coefficient-based steganography decoding
 * Uses f5stegojs library for JPEG steganography
 */
export interface IDCTDecoder {
  /**
   * Decode a message from JPEG DCT coefficients
   * @param stegoJpegBuffer - Stego JPEG image as ArrayBuffer
   * @param options - DCT decoding options including steganography key
   * @returns Promise resolving to decoding result with extracted message
   */
  decode(stegoJpegBuffer: ArrayBuffer, options: DCTDecodingOptions): Promise<DCTDecodingResult>;
}
