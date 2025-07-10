import type { ISimpleLSBDecoder } from '../interfaces/IDecoder';
import type { PixelData } from '../types/PixelData';
import type { SteganographyHeader } from '../types/SteganographyHeader';
import type { ValidationResult } from '../types/ValidationResult';
import type { LSBConfig } from '../types/LSBConfig';
import { extractBits } from '../utils/PixelDataUtility/PixelDataUtility';
import { getHeaderSizeInBits, deserializeHeader, validateHeader } from '../utils/HeaderUtility/HeaderUtility';
import { calculateCRC32 } from '../utils/ChecksumUtility/ChecksumUtility';
import { bitsToBytes } from '../utils/BitOperations/BitOperations';

/**
 * Simple LSB decoder implementation
 * Decodes messages encoded with simple LSB method (1 bit per channel, no redundancy)
 */
export class SimpleLSBDecoder implements ISimpleLSBDecoder {
  /**
   * Decode message data from pixel data using simple LSB method
   */
  async decode(pixelData: PixelData, header: SteganographyHeader, _config?: Partial<LSBConfig>): Promise<Uint8Array> {
    return this.decodeSimple(pixelData, header);
  }

  /**
   * Extract and validate header from pixel data
   */
  async extractHeader(pixelData: PixelData): Promise<SteganographyHeader> {
    // Get header size in bits
    const headerSizeInBits = getHeaderSizeInBits();

    // Extract header bits from pixel data
    const headerBits = extractBits(pixelData, headerSizeInBits);

    // Deserialize header from bits
    const header = deserializeHeader(headerBits);

    // Validate header
    const validation = validateHeader(header);
    if (!validation.isValid) {
      throw new Error(`Invalid header: ${validation.errors.join(', ')}`);
    }

    return header;
  }

  /**
   * Validate extracted message against header
   */
  async validateMessage(messageData: Uint8Array, header: SteganographyHeader): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      // Validate message length
      if (messageData.length !== header.messageLength) {
        errors.push(`Message length mismatch: expected ${header.messageLength}, got ${messageData.length}`);
      }

      // Validate checksum
      const calculatedChecksum = calculateCRC32(messageData);
      if (calculatedChecksum !== header.checksum) {
        errors.push(`Checksum mismatch: expected ${header.checksum}, got ${calculatedChecksum}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        magicSignatureValid: true, // Already validated in extractHeader
        versionSupported: true, // Already validated in extractHeader
        checksumValid: calculatedChecksum === header.checksum,
        lengthValid: messageData.length === header.messageLength,
      };
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      return {
        isValid: false,
        errors,
        magicSignatureValid: false,
        versionSupported: false,
        checksumValid: false,
        lengthValid: false,
      };
    }
  }

  /**
   * Decode with simple bit extraction
   */
  async decodeSimple(pixelData: PixelData, header: SteganographyHeader): Promise<Uint8Array> {
    // Validate encoding method
    if (header.encodingMethod !== 'simple-lsb') {
      throw new Error(`Invalid encoding method for SimpleLSBDecoder: ${header.encodingMethod}`);
    }

    // Calculate total bits needed (header + message)
    const headerSizeInBits = getHeaderSizeInBits();
    const messageSizeInBits = header.messageLength * 8;
    const totalBitsNeeded = headerSizeInBits + messageSizeInBits;

    // Extract all bits from pixel data
    const allBits = extractBits(pixelData, totalBitsNeeded);

    // Skip header bits and get message bits
    const messageBits = allBits.slice(headerSizeInBits);

    // Convert message bits to bytes
    const messageData = bitsToBytes(messageBits);

    // Validate the extracted message
    const validation = await this.validateMessage(messageData, header);
    if (!validation.isValid) {
      throw new Error(`Message validation failed: ${validation.errors?.join(', ') || 'Unknown validation error'}`);
    }

    return messageData;
  }
}
