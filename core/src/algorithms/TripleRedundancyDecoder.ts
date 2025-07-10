import type { ITripleRedundancyDecoder } from '../interfaces/IDecoder';
import type { PixelData } from '../types/PixelData';
import type { SteganographyHeader } from '../types/SteganographyHeader';
import type { ValidationResult } from '../types/ValidationResult';
import type { LSBConfig } from '../types/LSBConfig';
import { extractBits } from '../utils/PixelDataUtility/PixelDataUtility';
import { getHeaderSizeInBits, deserializeHeader, validateHeader } from '../utils/HeaderUtility/HeaderUtility';
import { calculateCRC32 } from '../utils/ChecksumUtility/ChecksumUtility';
import { ALGORITHM_CONSTANTS } from '../types/Constants';
import { bitsToBytes } from '../utils/BitOperations/BitOperations';

/**
 * Triple redundancy LSB decoder implementation
 * Decodes messages encoded with triple redundancy (3x encoding with majority vote)
 */
export class TripleRedundancyDecoder implements ITripleRedundancyDecoder {
  /**
   * Decode message data from pixel data using triple redundancy LSB method
   */
  async decode(pixelData: PixelData, header: SteganographyHeader, _config?: Partial<LSBConfig>): Promise<Uint8Array> {
    return this.decodeWithRedundancy(pixelData, header, ALGORITHM_CONSTANTS.redundancyFactor);
  }

  /**
   * Extract and validate header from pixel data
   */
  async extractHeader(pixelData: PixelData): Promise<SteganographyHeader> {
    // Get header size in bits
    const headerSizeInBits = getHeaderSizeInBits();

    // Extract header bits with redundancy
    const redundantHeaderBits = extractBits(pixelData, headerSizeInBits * ALGORITHM_CONSTANTS.redundancyFactor);

    // Apply majority voting to recover original header bits
    const headerBits = this.applyMajorityVoting(redundantHeaderBits, ALGORITHM_CONSTANTS.redundancyFactor);

    // Deserialize header from bits
    const header = deserializeHeader(headerBits);

    // Validate header
    const validation = validateHeader(header);
    if (!validation.isValid) {
      throw new Error(`Invalid header: ${validation.errors?.join(', ') || 'Unknown validation error'}`);
    }

    return header;
  }

  /**
   * Validate extracted message against header
   */
  async validateMessage(messageData: Uint8Array, header: SteganographyHeader): Promise<ValidationResult> {
    try {
      // Re-validate header first (in case it was corrupted and passed directly to decode)
      const headerValidation = validateHeader(header);
      if (!headerValidation.isValid) {
        return {
          isValid: false,
          errors: headerValidation.errors,
          magicSignatureValid: header.magicSignature === 0x4d534348,
          versionSupported: header.version <= 1,
          checksumValid: false,
          lengthValid: false,
        };
      }

      // Validate message length SECOND (more specific error)
      if (messageData.length !== header.messageLength) {
        return {
          isValid: false,
          errors: [`Message length mismatch: expected ${header.messageLength}, got ${messageData.length}`],
          magicSignatureValid: true,
          versionSupported: true,
          checksumValid: false,
          lengthValid: false,
        };
      }

      // Validate checksum only if header and length are correct
      const calculatedChecksum = calculateCRC32(messageData);
      if (calculatedChecksum !== header.checksum) {
        return {
          isValid: false,
          errors: [`Checksum mismatch: expected ${header.checksum}, got ${calculatedChecksum}`],
          magicSignatureValid: true,
          versionSupported: true,
          checksumValid: false,
          lengthValid: true,
        };
      }

      return {
        isValid: true,
        errors: [],
        magicSignatureValid: true,
        versionSupported: true,
        checksumValid: true,
        lengthValid: true,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
        magicSignatureValid: false,
        versionSupported: false,
        checksumValid: false,
        lengthValid: false,
      };
    }
  }

  /**
   * Decode with triple redundancy and majority vote
   */
  async decodeWithRedundancy(
    pixelData: PixelData,
    header: SteganographyHeader,
    redundancyFactor: number = ALGORITHM_CONSTANTS.redundancyFactor
  ): Promise<Uint8Array> {
    // Validate encoding method
    if (header.encodingMethod !== 'triple-redundancy') {
      throw new Error(`Invalid encoding method for TripleRedundancyDecoder: ${header.encodingMethod}`);
    }

    // Calculate total bits needed (header + message) with redundancy
    const headerSizeInBits = getHeaderSizeInBits();
    const messageSizeInBits = header.messageLength * 8;
    const totalBitsNeeded = (headerSizeInBits + messageSizeInBits) * redundancyFactor;

    // Extract all bits from pixel data
    const allRedundantBits = extractBits(pixelData, totalBitsNeeded);

    // Skip header bits (already extracted and validated) and get message bits
    const redundantMessageBits = allRedundantBits.slice(headerSizeInBits * redundancyFactor);

    // Apply majority voting to recover original message bits
    const messageBits = this.applyMajorityVoting(redundantMessageBits, redundancyFactor);

    // Convert message bits to bytes
    const messageData = bitsToBytes(messageBits);

    // Validate the extracted message - checksum after majority vote
    const validation = await this.validateMessage(messageData, header);
    if (!validation.isValid) {
      throw new Error(`Message validation failed: ${validation.errors?.join(', ') || 'Unknown validation error'}`);
    }

    return messageData;
  }

  /**
   * Perform majority vote on redundant bits
   */
  majorityVote(bits: number[]): number {
    const ones = bits.filter(bit => bit === 1).length;
    const zeros = bits.filter(bit => bit === 0).length;
    return ones > zeros ? 1 : 0;
  }

  /**
   * Apply majority voting to recover original bits from redundant bits
   */
  private applyMajorityVoting(redundantBits: number[], redundancyFactor: number): number[] {
    const originalBits: number[] = [];
    const originalLength = redundantBits.length / redundancyFactor;

    for (let i = 0; i < originalLength; i++) {
      const start = i * redundancyFactor;
      const redundantGroup = redundantBits.slice(start, start + redundancyFactor);
      const recoveredBit = this.majorityVote(redundantGroup);
      originalBits.push(recoveredBit);
    }

    return originalBits;
  }
}
