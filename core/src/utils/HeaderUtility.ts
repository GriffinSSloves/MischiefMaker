import type { SteganographyHeader } from '../types/DataTypes';
import type { EncodingMethod } from '../types/AlgorithmTypes';
import { BitOperations } from './BitOperations';
import { ChecksumUtility } from './ChecksumUtility';
import { HEADER_CONSTANTS, CAPACITY_CONSTANTS } from '../types/Constants';

/**
 * Utility class for creating and parsing steganography headers
 * Handles header serialization, validation, and integrity verification
 */
export class HeaderUtility {
  /**
   * Magic signature for MischiefMaker headers - "MSCH" as 32-bit integer
   */
  private static readonly MAGIC_SIGNATURE = 0x4d534348; // "MSCH" in ASCII

  /**
   * Current header version
   */
  private static readonly CURRENT_VERSION = 1;

  /**
   * Create a steganography header for embedding
   */
  static createHeader(
    messageLength: number,
    encodingMethod: EncodingMethod,
    messageData?: Uint8Array
  ): SteganographyHeader {
    // Validate inputs
    if (messageLength < 0) {
      throw new Error('Message length cannot be negative');
    }

    if (messageLength > 0xffffffff) {
      throw new Error('Message length exceeds maximum supported size (4GB)');
    }

    // Calculate checksum if message data is provided
    let checksum = 0;
    if (messageData) {
      if (messageData.length !== messageLength) {
        throw new Error('Message data length does not match specified length');
      }
      checksum = ChecksumUtility.calculateCRC32(messageData);
    }

    return {
      magicSignature: this.MAGIC_SIGNATURE,
      version: this.CURRENT_VERSION,
      messageLength,
      checksum,
      encodingMethod,
      reserved: 0, // Reserved for future use
    };
  }

  /**
   * Serialize header to bit array for embedding
   */
  static serializeHeader(header: SteganographyHeader): number[] {
    const bits: number[] = [];

    // Magic signature (4 bytes = 32 bits)
    const magicBits = BitOperations.numberToBits(header.magicSignature, 32);
    bits.push(...magicBits);

    // Version (2 bytes = 16 bits)
    const versionBits = BitOperations.numberToBits(header.version, 16);
    bits.push(...versionBits);

    // Message length (4 bytes = 32 bits)
    const lengthBits = BitOperations.numberToBits(header.messageLength, 32);
    bits.push(...lengthBits);

    // Checksum (4 bytes = 32 bits)
    const checksumBits = BitOperations.numberToBits(header.checksum, 32);
    bits.push(...checksumBits);

    // Encoding method (1 byte = 8 bits)
    const methodValue = this.encodingMethodToValue(header.encodingMethod);
    const methodBits = BitOperations.numberToBits(methodValue, 8);
    bits.push(...methodBits);

    // Reserved (1 byte = 8 bits)
    const reservedBits = BitOperations.numberToBits(header.reserved, 8);
    bits.push(...reservedBits);

    // Verify total header size
    const expectedBits = this.getHeaderSizeInBits();
    if (bits.length !== expectedBits) {
      throw new Error(`Header serialization error: expected ${expectedBits} bits, got ${bits.length}`);
    }

    return bits;
  }

  /**
   * Deserialize header from bit array
   */
  static deserializeHeader(bits: number[]): SteganographyHeader {
    const expectedBits = this.getHeaderSizeInBits();
    if (bits.length !== expectedBits) {
      throw new Error(`Invalid header size: expected ${expectedBits} bits, got ${bits.length}`);
    }

    let offset = 0;

    // Magic signature (32 bits)
    const magicBits = bits.slice(offset, offset + 32);
    const magicSignature = BitOperations.bitsToNumber(magicBits);
    offset += 32;

    // Version (16 bits)
    const versionBits = bits.slice(offset, offset + 16);
    const version = BitOperations.bitsToNumber(versionBits);
    offset += 16;

    // Message length (32 bits)
    const lengthBits = bits.slice(offset, offset + 32);
    const messageLength = BitOperations.bitsToNumber(lengthBits);
    offset += 32;

    // Checksum (32 bits)
    const checksumBits = bits.slice(offset, offset + 32);
    const checksum = BitOperations.bitsToNumber(checksumBits);
    offset += 32;

    // Encoding method (8 bits)
    const methodBits = bits.slice(offset, offset + 8);
    const methodValue = BitOperations.bitsToNumber(methodBits);
    const encodingMethod = this.valueToEncodingMethod(methodValue);
    offset += 8;

    // Reserved (8 bits)
    const reservedBits = bits.slice(offset, offset + 8);
    const reserved = BitOperations.bitsToNumber(reservedBits);

    return {
      magicSignature,
      version,
      messageLength,
      checksum,
      encodingMethod,
      reserved,
    };
  }

  /**
   * Validate header integrity and compatibility
   */
  static validateHeader(header: SteganographyHeader): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check magic signature
    if (header.magicSignature !== this.MAGIC_SIGNATURE) {
      errors.push(
        `Invalid magic signature: expected ${this.MAGIC_SIGNATURE.toString(16)}, got ${header.magicSignature.toString(16)}`
      );
    }

    // Check version compatibility
    if (header.version > this.CURRENT_VERSION) {
      errors.push(`Unsupported version: ${header.version} (current version: ${this.CURRENT_VERSION})`);
    }

    if (header.version < 1) {
      errors.push(`Invalid version: ${header.version}`);
    }

    // Check message length
    if (header.messageLength < 0) {
      errors.push(`Invalid message length: ${header.messageLength}`);
    }

    if (header.messageLength > 0xffffffff) {
      errors.push(`Message length too large: ${header.messageLength}`);
    }

    // Check encoding method
    if (!this.isValidEncodingMethod(header.encodingMethod)) {
      errors.push(`Invalid encoding method: ${header.encodingMethod}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Verify message data matches header checksum
   */
  static verifyMessageIntegrity(header: SteganographyHeader, messageData: Uint8Array): boolean {
    if (messageData.length !== header.messageLength) {
      return false;
    }

    const calculatedChecksum = ChecksumUtility.calculateCRC32(messageData);
    return calculatedChecksum === header.checksum;
  }

  /**
   * Get header size in bits
   */
  static getHeaderSizeInBits(): number {
    return (
      (HEADER_CONSTANTS.MAGIC_SIGNATURE_BYTES +
        HEADER_CONSTANTS.VERSION_BYTES +
        HEADER_CONSTANTS.MESSAGE_LENGTH_BYTES +
        HEADER_CONSTANTS.CHECKSUM_BYTES +
        HEADER_CONSTANTS.ENCODING_METHOD_BYTES +
        HEADER_CONSTANTS.RESERVED_BYTES) *
      CAPACITY_CONSTANTS.BITS_PER_BYTE
    );
  }

  /**
   * Get header size in bytes
   */
  static getHeaderSizeInBytes(): number {
    return this.getHeaderSizeInBits() / CAPACITY_CONSTANTS.BITS_PER_BYTE;
  }

  /**
   * Convert encoding method to numeric value for serialization
   */
  private static encodingMethodToValue(method: EncodingMethod): number {
    switch (method) {
      case 'simple-lsb':
        return 1;
      case 'triple-redundancy':
        return 2;
      case 'adaptive-lsb':
        return 3;
      default:
        throw new Error(`Unknown encoding method: ${method}`);
    }
  }

  /**
   * Convert numeric value to encoding method
   */
  private static valueToEncodingMethod(value: number): EncodingMethod {
    switch (value) {
      case 1:
        return 'simple-lsb';
      case 2:
        return 'triple-redundancy';
      case 3:
        return 'adaptive-lsb';
      default:
        throw new Error(`Unknown encoding method value: ${value}`);
    }
  }

  /**
   * Check if encoding method is valid
   */
  private static isValidEncodingMethod(method: EncodingMethod): boolean {
    return ['simple-lsb', 'triple-redundancy', 'adaptive-lsb'].includes(method);
  }

  /**
   * Create a header with automatic checksum calculation
   */
  static createHeaderWithChecksum(messageData: Uint8Array, encodingMethod: EncodingMethod): SteganographyHeader {
    return this.createHeader(messageData.length, encodingMethod, messageData);
  }

  /**
   * Parse and validate header from bit array with comprehensive error checking
   */
  static parseAndValidateHeader(bits: number[]): { header?: SteganographyHeader; isValid: boolean; errors: string[] } {
    try {
      const header = this.deserializeHeader(bits);
      const validation = this.validateHeader(header);

      return {
        header: validation.isValid ? header : undefined,
        isValid: validation.isValid,
        errors: validation.errors,
      };
    } catch (error) {
      return {
        header: undefined,
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown parsing error'],
      };
    }
  }

  /**
   * Calculate header overhead for capacity planning
   */
  static calculateHeaderOverhead(encodingMethod: EncodingMethod): number {
    const headerBits = this.getHeaderSizeInBits();

    // Apply encoding method overhead
    switch (encodingMethod) {
      case 'simple-lsb':
        return headerBits; // 1:1 ratio
      case 'triple-redundancy':
        return headerBits * 3; // 1:3 ratio
      case 'adaptive-lsb':
        return headerBits; // Assumes simple LSB for header
      default:
        return headerBits;
    }
  }

  /**
   * Extract header information as human-readable summary
   */
  static summarizeHeader(header: SteganographyHeader): string {
    return `MischiefMaker Header v${header.version}:
- Message Length: ${header.messageLength} bytes
- Encoding Method: ${header.encodingMethod}
- Checksum: 0x${header.checksum.toString(16).toUpperCase()}
- Magic: 0x${header.magicSignature.toString(16).toUpperCase()}
- Reserved: ${header.reserved}`;
  }

  /**
   * Compare two headers for equality
   */
  static headersEqual(header1: SteganographyHeader, header2: SteganographyHeader): boolean {
    return (
      header1.magicSignature === header2.magicSignature &&
      header1.version === header2.version &&
      header1.messageLength === header2.messageLength &&
      header1.checksum === header2.checksum &&
      header1.encodingMethod === header2.encodingMethod &&
      header1.reserved === header2.reserved
    );
  }
}
