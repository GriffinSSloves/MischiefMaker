import type { SteganographyHeader } from '../../types/SteganographyHeader';
import type { EncodingMethod } from '../../types/EncodingMethod';
import { numberToBits, bitsToNumber } from '../BitOperations/BitOperations';
import { calculateCRC32 } from '../ChecksumUtility/ChecksumUtility';
import { CAPACITY_CONSTANTS } from '../../types/Constants';

/**
 * Steganography header creation and parsing functions
 * Pure functions for header serialization, validation, and integrity verification
 */

/**
 * Magic signature for MischiefMaker headers - "MSCH" as 32-bit integer
 */
const MAGIC_SIGNATURE = 0x4d534348; // "MSCH" in ASCII

/**
 * Current header version
 */
const CURRENT_VERSION = 1;

/**
 * Create a steganography header for embedding
 */
export function createHeader(
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
    checksum = calculateCRC32(messageData);
  }

  return {
    magicSignature: MAGIC_SIGNATURE,
    version: CURRENT_VERSION,
    messageLength,
    checksum,
    encodingMethod,
    reserved: 0, // Reserved for future use
  };
}

/**
 * Serialize header to bit array for embedding
 */
export function serializeHeader(header: SteganographyHeader): number[] {
  const bits: number[] = [];

  // Magic signature (4 bytes = 32 bits)
  const magicBits = numberToBits(header.magicSignature, 32);
  bits.push(...magicBits);

  // Version (2 bytes = 16 bits)
  const versionBits = numberToBits(header.version, 16);
  bits.push(...versionBits);

  // Message length (4 bytes = 32 bits)
  const lengthBits = numberToBits(header.messageLength, 32);
  bits.push(...lengthBits);

  // Checksum (4 bytes = 32 bits)
  const checksumBits = numberToBits(header.checksum, 32);
  bits.push(...checksumBits);

  // Encoding method (1 byte = 8 bits)
  const methodValue = encodingMethodToValue(header.encodingMethod);
  const methodBits = numberToBits(methodValue, 8);
  bits.push(...methodBits);

  // Reserved (1 byte = 8 bits)
  const reservedBits = numberToBits(header.reserved, 8);
  bits.push(...reservedBits);

  // Verify total header size
  const expectedBits = getHeaderSizeInBits();
  if (bits.length !== expectedBits) {
    throw new Error(`Header serialization error: expected ${expectedBits} bits, got ${bits.length}`);
  }

  return bits;
}

/**
 * Deserialize header from bit array
 */
export function deserializeHeader(bits: number[]): SteganographyHeader {
  const expectedBits = getHeaderSizeInBits();
  if (bits.length !== expectedBits) {
    throw new Error(`Invalid header size: expected ${expectedBits} bits, got ${bits.length}`);
  }

  let offset = 0;

  // Magic signature (32 bits)
  const magicBits = bits.slice(offset, offset + 32);
  const magicSignature = bitsToNumber(magicBits);
  offset += 32;

  // Version (16 bits)
  const versionBits = bits.slice(offset, offset + 16);
  const version = bitsToNumber(versionBits);
  offset += 16;

  // Message length (32 bits)
  const lengthBits = bits.slice(offset, offset + 32);
  const messageLength = bitsToNumber(lengthBits);
  offset += 32;

  // Checksum (32 bits)
  const checksumBits = bits.slice(offset, offset + 32);
  const checksum = bitsToNumber(checksumBits);
  offset += 32;

  // Encoding method (8 bits)
  const methodBits = bits.slice(offset, offset + 8);
  const methodValue = bitsToNumber(methodBits);
  const encodingMethod = valueToEncodingMethod(methodValue);
  offset += 8;

  // Reserved (8 bits)
  const reservedBits = bits.slice(offset, offset + 8);
  const reserved = bitsToNumber(reservedBits);

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
export function validateHeader(header: SteganographyHeader): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check magic signature
  if (header.magicSignature !== MAGIC_SIGNATURE) {
    errors.push(
      `Invalid magic signature: expected ${MAGIC_SIGNATURE.toString(16)}, got ${header.magicSignature.toString(16)}`
    );
  }

  // Check version compatibility
  if (header.version > CURRENT_VERSION) {
    errors.push(`Unsupported version: ${header.version} (current version: ${CURRENT_VERSION})`);
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
  if (!isValidEncodingMethod(header.encodingMethod)) {
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
export function verifyMessageIntegrity(header: SteganographyHeader, messageData: Uint8Array): boolean {
  if (messageData.length !== header.messageLength) {
    return false;
  }

  const calculatedChecksum = calculateCRC32(messageData);
  return calculatedChecksum === header.checksum;
}

/**
 * Get header size in bits
 */
export function getHeaderSizeInBits(): number {
  return (
    32 + // Magic signature
    16 + // Version
    32 + // Message length
    32 + // Checksum
    8 + // Encoding method
    8 // Reserved
  ); // Total: 128 bits
}

/**
 * Get header size in bytes
 */
export function getHeaderSizeInBytes(): number {
  return getHeaderSizeInBits() / CAPACITY_CONSTANTS.BITS_PER_BYTE;
}

/**
 * Convert encoding method to numeric value for serialization
 */
function encodingMethodToValue(method: EncodingMethod): number {
  switch (method) {
    case 'simple-lsb':
      return 0;
    case 'triple-redundancy':
      return 1;
    default:
      throw new Error(`Unsupported encoding method: ${method}`);
  }
}

/**
 * Convert numeric value to encoding method for deserialization
 */
function valueToEncodingMethod(value: number): EncodingMethod {
  switch (value) {
    case 0:
      return 'simple-lsb';
    case 1:
      return 'triple-redundancy';
    default:
      throw new Error(`Invalid encoding method value: ${value}`);
  }
}

/**
 * Validate encoding method
 */
function isValidEncodingMethod(method: EncodingMethod): boolean {
  return method === 'simple-lsb' || method === 'triple-redundancy';
}

/**
 * Create header with calculated checksum
 */
export function createHeaderWithChecksum(messageData: Uint8Array, encodingMethod: EncodingMethod): SteganographyHeader {
  return createHeader(messageData.length, encodingMethod, messageData);
}

/**
 * Parse and validate header from bits
 */
export function parseAndValidateHeader(bits: number[]): {
  header?: SteganographyHeader;
  isValid: boolean;
  errors: string[];
} {
  try {
    const header = deserializeHeader(bits);
    const validation = validateHeader(header);

    if (validation.isValid) {
      return {
        header,
        isValid: true,
        errors: [],
      };
    } else {
      return {
        header,
        isValid: false,
        errors: validation.errors,
      };
    }
  } catch (error) {
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown parsing error'],
    };
  }
}

/**
 * Calculate header overhead for capacity planning
 */
export function calculateHeaderOverhead(encodingMethod: EncodingMethod): number {
  const headerBits = getHeaderSizeInBits();

  // For triple redundancy, header bits are also stored with redundancy
  const redundancyFactor = encodingMethod === 'triple-redundancy' ? 3 : 1;

  return headerBits * redundancyFactor;
}

/**
 * Create human-readable summary of header
 */
export function summarizeHeader(header: SteganographyHeader): string {
  return `Header: ${header.messageLength} bytes, ${header.encodingMethod} encoding, checksum: ${header.checksum.toString(16)}`;
}

/**
 * Compare two headers for equality
 */
export function headersEqual(header1: SteganographyHeader, header2: SteganographyHeader): boolean {
  return (
    header1.magicSignature === header2.magicSignature &&
    header1.version === header2.version &&
    header1.messageLength === header2.messageLength &&
    header1.checksum === header2.checksum &&
    header1.encodingMethod === header2.encodingMethod &&
    header1.reserved === header2.reserved
  );
}
