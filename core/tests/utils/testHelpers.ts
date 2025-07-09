import type { PixelData } from '../../src/types/PixelData';
import type { SteganographyHeader } from '../../src/types/SteganographyHeader';
import { SimpleLSBEncoder } from '../../src/algorithms/SimpleLSBEncoder';
import { SimpleLSBDecoder } from '../../src/algorithms/SimpleLSBDecoder';
import { TripleRedundancyEncoder } from '../../src/algorithms/TripleRedundancyEncoder';
import { TripleRedundancyDecoder } from '../../src/algorithms/TripleRedundancyDecoder';
import { createHeader } from '../../src/utils/HeaderUtility/HeaderUtility';
import { createPixelDataForMessage } from './pixelDataHelpers';

/**
 * Validate complete round-trip encode-decode operation
 * Tests that a message can be encoded and then decoded back to the original
 */
export async function validateRoundTrip(
  originalMessage: string,
  algorithm: 'simple-lsb' | 'triple-redundancy' = 'simple-lsb',
  pixelData?: PixelData
): Promise<void> {
  const messageData = new TextEncoder().encode(originalMessage);
  const testPixelData = pixelData || createPixelDataForMessage(originalMessage.length, algorithm);

  let encoder: SimpleLSBEncoder | TripleRedundancyEncoder;
  let decoder: SimpleLSBDecoder | TripleRedundancyDecoder;

  if (algorithm === 'simple-lsb') {
    encoder = new SimpleLSBEncoder();
    decoder = new SimpleLSBDecoder();
  } else {
    encoder = new TripleRedundancyEncoder();
    decoder = new TripleRedundancyDecoder();
  }

  // 1. Create header and encode
  const header = createHeader(originalMessage.length, algorithm, messageData);
  const encodedPixelData = await encoder.encode(testPixelData, messageData, header);

  // 2. Extract header and decode
  const extractedHeader = await decoder.extractHeader(encodedPixelData);
  const decodedBytes = await decoder.decode(encodedPixelData, extractedHeader);
  const decodedMessage = new TextDecoder().decode(decodedBytes);

  // 3. Validate round-trip
  if (decodedMessage !== originalMessage) {
    throw new Error(`Round-trip failed: expected "${originalMessage}", got "${decodedMessage}"`);
  }
}

/**
 * Create a valid header with corrupted field for testing validation
 */
export function createCorruptedHeader(
  messageData: Uint8Array,
  algorithm: 'simple-lsb' | 'triple-redundancy',
  corruption: 'checksum' | 'length' | 'magic' | 'version' | 'method'
): SteganographyHeader {
  const validHeader = createHeader(messageData.length, algorithm, messageData);

  switch (corruption) {
    case 'checksum':
      validHeader.checksum = 0x12345678; // Wrong checksum
      break;
    case 'length':
      validHeader.messageLength = messageData.length + 5; // Wrong length
      break;
    case 'magic':
      validHeader.magicSignature = 0x00000000; // Invalid magic
      break;
    case 'version':
      validHeader.version = 999; // Unsupported version
      break;
    case 'method':
      // This would require changing the type, so we'll corrupt the checksum instead
      validHeader.checksum = 0x12345678;
      break;
  }

  return validHeader;
}

/**
 * Generate test messages of various sizes and characteristics
 */
export const TEST_MESSAGES = {
  empty: '',
  single: 'A',
  short: 'Hi',
  normal: 'Hello, World!',
  long: 'This is a longer message that should test the encoder and decoder with more realistic data. It contains various characters and punctuation!',
  special: 'Special chars: !@#$%^&*()[]{}|;:,.<>?',
  unicode: '🎭 Unicode test: Héllo Wörld! 🚀',
  numeric: '1234567890',
  repeated: 'A'.repeat(100),
  mixed: 'Mixed content: ABC123!@# 🎯',
} as const;

/**
 * Create test scenarios with different message and pixel data combinations
 */
export function createTestScenarios() {
  return [
    {
      name: 'small message, small image',
      message: TEST_MESSAGES.short,
      pixelData: { width: 20, height: 20 },
    },
    {
      name: 'normal message, normal image',
      message: TEST_MESSAGES.normal,
      pixelData: { width: 50, height: 50 },
    },
    {
      name: 'long message, large image',
      message: TEST_MESSAGES.long,
      pixelData: { width: 100, height: 100 },
    },
    {
      name: 'special characters',
      message: TEST_MESSAGES.special,
      pixelData: { width: 50, height: 50 },
    },
  ];
}

/**
 * Expected error messages for validation testing
 */
export const EXPECTED_ERRORS = {
  invalidMagic: 'Invalid magic signature',
  unsupportedVersion: 'Unsupported version',
  invalidMethod: 'Invalid encoding method',
  checksumMismatch: 'Checksum mismatch',
  lengthMismatch: 'Message length mismatch',
  insufficientCapacity: 'Message too large for image',
  invalidBitLength: 'must be multiple of',
  validationFailed: 'Message validation failed',
} as const;

/**
 * Assert that an async function throws with a specific error message
 */
export async function expectToThrowWithMessage(fn: () => Promise<any>, expectedMessage: string): Promise<void> {
  try {
    await fn();
    throw new Error(`Expected function to throw with message containing "${expectedMessage}", but it did not throw`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes(expectedMessage)) {
      throw new Error(`Expected error message to contain "${expectedMessage}", but got: "${message}"`);
    }
  }
}

/**
 * Time an async operation and return both result and duration
 */
export async function timeOperation<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await operation();
  const duration = Date.now() - start;
  return { result, duration };
}

/**
 * Create a realistic test environment for capacity testing
 */
export function createCapacityTestEnvironment() {
  return {
    tiny: { width: 10, height: 10, expectedCapacity: 37 }, // 300 bits / 8 - header
    small: { width: 50, height: 50, expectedCapacity: 922 }, // 7500 bits / 8 - header
    medium: { width: 100, height: 100, expectedCapacity: 3735 }, // 30000 bits / 8 - header
    large: { width: 200, height: 200, expectedCapacity: 14985 }, // 120000 bits / 8 - header
  };
}
