import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { SimpleLSBDecoder } from './SimpleLSBDecoder';
import type { PixelData } from '../types/PixelData';
import type { SteganographyHeader } from '../types/SteganographyHeader';

// Mock the pure function modules
vi.mock('../utils/PixelDataUtility/PixelDataUtility', () => ({
  extractBits: vi.fn(),
}));

vi.mock('../utils/HeaderUtility/HeaderUtility', () => ({
  getHeaderSizeInBits: vi.fn(),
  deserializeHeader: vi.fn(),
  validateHeader: vi.fn(),
}));

vi.mock('../utils/ChecksumUtility/ChecksumUtility', () => ({
  calculateCRC32: vi.fn(),
}));

// Import the mocked functions
import { extractBits } from '../utils/PixelDataUtility/PixelDataUtility';
import { getHeaderSizeInBits, deserializeHeader, validateHeader } from '../utils/HeaderUtility/HeaderUtility';
import { calculateCRC32 } from '../utils/ChecksumUtility/ChecksumUtility';

describe('SimpleLSBDecoder', () => {
  let decoder: SimpleLSBDecoder;

  const samplePixelData: PixelData = {
    width: 100,
    height: 100,
    channels: {
      red: new Array(10000).fill(128),
      green: new Array(10000).fill(128),
      blue: new Array(10000).fill(128),
    },
    totalPixels: 10000,
  };

  const sampleHeader: SteganographyHeader = {
    magicSignature: 0x4d534348,
    version: 1,
    messageLength: 5,
    checksum: 0x12345678,
    reserved: 0,
    encodingMethod: 'simple-lsb',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    decoder = new SimpleLSBDecoder();
  });

  describe('constructor', () => {
    it('should create decoder', () => {
      expect(decoder).toBeInstanceOf(SimpleLSBDecoder);
    });
  });

  describe('extractHeader', () => {
    it('should extract and validate header from pixel data', async () => {
      const headerBits = [1, 0, 1, 0, 1, 0, 1, 0];

      (getHeaderSizeInBits as Mock).mockReturnValue(64);
      (extractBits as Mock).mockReturnValue(headerBits);
      (deserializeHeader as Mock).mockReturnValue(sampleHeader);
      (validateHeader as Mock).mockReturnValue({ isValid: true, errors: [] });

      const result = await decoder.extractHeader(samplePixelData);

      expect(extractBits).toHaveBeenCalledWith(samplePixelData, 64);
      expect(deserializeHeader).toHaveBeenCalledWith(headerBits);
      expect(validateHeader).toHaveBeenCalledWith(sampleHeader);
      expect(result).toBe(sampleHeader);
    });

    it('should handle invalid header', async () => {
      (getHeaderSizeInBits as Mock).mockReturnValue(64);
      (extractBits as Mock).mockReturnValue([1, 0, 1, 0]);
      (deserializeHeader as Mock).mockReturnValue(sampleHeader);
      (validateHeader as Mock).mockReturnValue({ isValid: false, errors: ['Invalid magic signature'] });

      await expect(decoder.extractHeader(samplePixelData)).rejects.toThrow('Invalid magic signature');
    });
  });

  describe('validateMessage', () => {
    it('should validate message successfully', async () => {
      const messageData = new Uint8Array([72, 101, 108, 108, 111]);
      (calculateCRC32 as Mock).mockReturnValue(0x12345678);

      const result = await decoder.validateMessage(messageData, sampleHeader);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect checksum mismatch', async () => {
      const messageData = new Uint8Array([72, 101, 108, 108, 111]);
      (calculateCRC32 as Mock).mockReturnValue(0x87654321);

      const result = await decoder.validateMessage(messageData, sampleHeader);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Checksum mismatch: expected 305419896, got 2271560481');
    });
  });

  describe('decode', () => {
    it('should decode simple LSB message', async () => {
      const headerSizeInBits = 104; // 13 bytes * 8 bits
      const messageSizeInBits = 5 * 8; // 5 bytes * 8 bits
      const totalBits = headerSizeInBits + messageSizeInBits;

      // Create header bits (104 bits) + message bits (40 bits) = 144 total bits
      const headerBits = new Array(headerSizeInBits).fill(0);
      const messageBits = [
        // "Hello" as bits: H=72, e=101, l=108, l=108, o=111
        0,
        1,
        0,
        0,
        1,
        0,
        0,
        0, // H = 72
        0,
        1,
        1,
        0,
        0,
        1,
        0,
        1, // e = 101
        0,
        1,
        1,
        0,
        1,
        1,
        0,
        0, // l = 108
        0,
        1,
        1,
        0,
        1,
        1,
        0,
        0, // l = 108
        0,
        1,
        1,
        0,
        1,
        1,
        1,
        1, // o = 111
      ];
      const allBits = [...headerBits, ...messageBits];

      (getHeaderSizeInBits as Mock).mockReturnValue(headerSizeInBits);
      (extractBits as Mock).mockReturnValue(allBits);
      (deserializeHeader as Mock).mockReturnValue(sampleHeader);
      (validateHeader as Mock).mockReturnValue({ isValid: true, errors: [] });
      (calculateCRC32 as Mock).mockReturnValue(0x12345678);

      const result = await decoder.decode(samplePixelData, sampleHeader);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111])); // "Hello"
      expect(extractBits).toHaveBeenCalledWith(samplePixelData, totalBits);
    });

    it('should handle invalid encoding method', async () => {
      const invalidHeader = { ...sampleHeader, encodingMethod: 'triple-redundancy' as const };

      await expect(decoder.decode(samplePixelData, invalidHeader)).rejects.toThrow(
        'Invalid encoding method for SimpleLSBDecoder: triple-redundancy'
      );
    });
  });

  describe('decodeSimple', () => {
    it('should decode with simple LSB method', async () => {
      const headerSizeInBits = 104; // 13 bytes * 8 bits
      const messageSizeInBits = 5 * 8; // 5 bytes * 8 bits
      const totalBits = headerSizeInBits + messageSizeInBits;

      // Create header bits (104 bits) + message bits (40 bits) = 144 total bits
      const headerBits = new Array(headerSizeInBits).fill(0);
      const messageBits = [
        // "Hello" as bits: H=72, e=101, l=108, l=108, o=111
        0,
        1,
        0,
        0,
        1,
        0,
        0,
        0, // H = 72
        0,
        1,
        1,
        0,
        0,
        1,
        0,
        1, // e = 101
        0,
        1,
        1,
        0,
        1,
        1,
        0,
        0, // l = 108
        0,
        1,
        1,
        0,
        1,
        1,
        0,
        0, // l = 108
        0,
        1,
        1,
        0,
        1,
        1,
        1,
        1, // o = 111
      ];
      const allBits = [...headerBits, ...messageBits];

      (getHeaderSizeInBits as Mock).mockReturnValue(headerSizeInBits);
      (extractBits as Mock).mockReturnValue(allBits);
      (calculateCRC32 as Mock).mockReturnValue(0x12345678);

      const result = await decoder.decodeSimple(samplePixelData, sampleHeader);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111])); // "Hello"
      expect(extractBits).toHaveBeenCalledWith(samplePixelData, totalBits);
    });
  });
});
