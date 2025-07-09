import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { TripleRedundancyDecoder } from './TripleRedundancyDecoder';
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

describe('TripleRedundancyDecoder', () => {
  let decoder: TripleRedundancyDecoder;

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
    encodingMethod: 'triple-redundancy',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    decoder = new TripleRedundancyDecoder();
  });

  describe('constructor', () => {
    it('should create decoder with default dependencies', () => {
      const defaultDecoder = new TripleRedundancyDecoder();
      expect(defaultDecoder).toBeInstanceOf(TripleRedundancyDecoder);
    });

    it('should create decoder with injected dependencies', () => {
      expect(decoder).toBeInstanceOf(TripleRedundancyDecoder);
    });
  });

  describe('extractHeader', () => {
    it('should extract and validate header from pixel data with redundancy', async () => {
      const mockHeaderSizeInBits = 104; // 13 bytes * 8 bits
      const mockRedundantHeaderBits = [
        // Each bit repeated 3 times: 1, 0, 1, 0 becomes 1,1,1, 0,0,0, 1,1,1, 0,0,0
        1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0,
      ];

      // Mock HeaderUtility static methods
      (getHeaderSizeInBits as Mock).mockReturnValue(mockHeaderSizeInBits);
      (deserializeHeader as Mock).mockReturnValue(sampleHeader);
      (validateHeader as Mock).mockReturnValue({ isValid: true, errors: [] });

      // Mock PixelDataUtility.extractBits
      (extractBits as Mock).mockReturnValue(mockRedundantHeaderBits);

      const result = await decoder.extractHeader(samplePixelData);

      expect(getHeaderSizeInBits).toHaveBeenCalled();
      expect(extractBits).toHaveBeenCalledWith(samplePixelData, mockHeaderSizeInBits * 3);
      expect(deserializeHeader).toHaveBeenCalledWith([1, 0, 1, 0]); // After majority voting
      expect(validateHeader).toHaveBeenCalledWith(sampleHeader);
      expect(result).toBe(sampleHeader);
    });

    it('should throw error for invalid header', async () => {
      const mockHeaderSizeInBits = 104;
      const mockRedundantHeaderBits = new Array(312).fill(0); // 104 * 3

      // Mock HeaderUtility static methods
      (getHeaderSizeInBits as Mock).mockReturnValue(mockHeaderSizeInBits);
      (deserializeHeader as Mock).mockReturnValue(sampleHeader);
      (validateHeader as Mock).mockReturnValue({
        isValid: false,
        errors: ['Invalid magic signature', 'Unsupported version'],
      });

      // Mock PixelDataUtility.extractBits
      (extractBits as Mock).mockReturnValue(mockRedundantHeaderBits);

      await expect(decoder.extractHeader(samplePixelData)).rejects.toThrow(
        'Invalid header: Invalid magic signature, Unsupported version'
      );
    });

    it('should propagate errors from utility methods', async () => {
      // Mock HeaderUtility.getHeaderSizeInBits to throw error
      (getHeaderSizeInBits as Mock).mockImplementation(() => {
        throw new Error('Header size calculation failed');
      });

      await expect(decoder.extractHeader(samplePixelData)).rejects.toThrow('Header size calculation failed');
    });
  });

  describe('validateMessage', () => {
    it('should validate message successfully', async () => {
      const messageData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const header = { ...sampleHeader, messageLength: 5, checksum: 0x12345678 };

      // Mock ChecksumUtility.calculateCRC32
      (calculateCRC32 as Mock).mockReturnValue(0x12345678);

      const result = await decoder.validateMessage(messageData, header);

      expect(calculateCRC32).toHaveBeenCalledWith(messageData);
      expect(result).toEqual({
        isValid: true,
        errors: [],
        magicSignatureValid: true,
        versionSupported: true,
        checksumValid: true,
        lengthValid: true,
      });
    });

    it('should detect message length mismatch', async () => {
      const messageData = new Uint8Array([72, 101, 108]); // 3 bytes
      const header = { ...sampleHeader, messageLength: 5, checksum: 0x12345678 }; // Expects 5 bytes

      // Mock ChecksumUtility.calculateCRC32
      (calculateCRC32 as Mock).mockReturnValue(0x12345678);

      const result = await decoder.validateMessage(messageData, header);

      expect(result.isValid).toBe(false);
      expect(result.lengthValid).toBe(false);
      expect(result.errors).toContain('Message length mismatch: expected 5, got 3');
    });

    it('should detect checksum mismatch', async () => {
      const messageData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const header = { ...sampleHeader, messageLength: 5, checksum: 0x12345678 };

      // Mock ChecksumUtility.calculateCRC32 to return different checksum
      (calculateCRC32 as Mock).mockReturnValue(0x87654321);

      const result = await decoder.validateMessage(messageData, header);

      expect(result.isValid).toBe(false);
      expect(result.checksumValid).toBe(false);
      expect(result.errors).toContain('Checksum mismatch: expected 305419896, got 2271560481');
    });

    it('should handle validation errors', async () => {
      const messageData = new Uint8Array([72, 101, 108, 108, 111]);
      const header = { ...sampleHeader, messageLength: 5, checksum: 0x12345678 };

      // Mock ChecksumUtility.calculateCRC32 to throw error
      (calculateCRC32 as Mock).mockImplementation(() => {
        throw new Error('Checksum calculation failed');
      });

      const result = await decoder.validateMessage(messageData, header);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Validation error: Checksum calculation failed');
    });
  });

  describe('decode', () => {
    it('should delegate to decodeWithRedundancy method with default redundancy factor', async () => {
      const messageData = new Uint8Array([72, 101, 108, 108, 111]);

      // Mock the decodeWithRedundancy method
      const mockDecodeWithRedundancy = vi.spyOn(decoder, 'decodeWithRedundancy').mockResolvedValue(messageData);

      const result = await decoder.decode(samplePixelData, sampleHeader);

      expect(mockDecodeWithRedundancy).toHaveBeenCalledWith(samplePixelData, sampleHeader, 3);
      expect(result).toBe(messageData);
    });
  });

  describe('decodeWithRedundancy', () => {
    it('should decode message using triple redundancy with majority voting', async () => {
      const messageData = new Uint8Array([72, 101]); // "He"
      const header = { ...sampleHeader, messageLength: 2, checksum: 0x12345678 };

      // Mock HeaderUtility.getHeaderSizeInBits
      (getHeaderSizeInBits as Mock).mockReturnValue(104);

      // Mock PixelDataUtility.extractBits
      // Header bits (104 * 3) + message bits (2 * 8 * 3) = 312 + 48 = 360 total bits
      const mockHeaderBits = new Array(312).fill(0); // 104 * 3
      const mockMessageBits = [
        // "He" as redundant bits: H=72, e=101 with 3x redundancy
        // H = 72 = 01001000, each bit repeated 3 times
        0,
        0,
        0,
        1,
        1,
        1,
        0,
        0,
        0,
        0,
        0,
        0,
        1,
        1,
        1,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0, // H = 72
        // e = 101 = 01100101, each bit repeated 3 times
        0,
        0,
        0,
        1,
        1,
        1,
        1,
        1,
        1,
        0,
        0,
        0,
        0,
        0,
        0,
        1,
        1,
        1,
        0,
        0,
        0,
        1,
        1,
        1, // e = 101
      ];
      const allBits = [...mockHeaderBits, ...mockMessageBits];
      (extractBits as Mock).mockReturnValue(allBits);

      // Mock ChecksumUtility.calculateCRC32
      (calculateCRC32 as Mock).mockReturnValue(0x12345678);

      const result = await decoder.decodeWithRedundancy(samplePixelData, header, 3);

      expect(getHeaderSizeInBits).toHaveBeenCalled();
      expect(extractBits).toHaveBeenCalledWith(samplePixelData, 360);
      expect(calculateCRC32).toHaveBeenCalledWith(messageData);
      expect(result).toEqual(messageData);
    });

    it('should throw error for invalid encoding method', async () => {
      const invalidHeader = { ...sampleHeader, encodingMethod: 'simple-lsb' as const };

      await expect(decoder.decodeWithRedundancy(samplePixelData, invalidHeader, 3)).rejects.toThrow(
        'Invalid encoding method for TripleRedundancyDecoder: simple-lsb'
      );
    });

    it('should throw error for message validation failure', async () => {
      const header = { ...sampleHeader, messageLength: 2, checksum: 0x12345678 };

      // Mock HeaderUtility.getHeaderSizeInBits
      (getHeaderSizeInBits as Mock).mockReturnValue(104);

      // Mock PixelDataUtility.extractBits
      const mockHeaderBits = new Array(312).fill(0); // 104 * 3
      const mockMessageBits = new Array(48).fill(0); // 2 bytes * 8 bits * 3 redundancy = 48 bits
      const allBits = [...mockHeaderBits, ...mockMessageBits];
      (extractBits as Mock).mockReturnValue(allBits);

      // Mock ChecksumUtility.calculateCRC32 to return different checksum
      (calculateCRC32 as Mock).mockReturnValue(0x87654321);

      await expect(decoder.decodeWithRedundancy(samplePixelData, header, 3)).rejects.toThrow(
        'Message validation failed: Checksum mismatch: expected 305419896, got 2271560481'
      );
    });

    it('should handle empty message', async () => {
      const emptyMessage = new Uint8Array(0);
      const header = { ...sampleHeader, messageLength: 0, checksum: 0x12345678 };

      // Mock HeaderUtility.getHeaderSizeInBits
      (getHeaderSizeInBits as Mock).mockReturnValue(104);

      // Mock PixelDataUtility.extractBits - only header bits with redundancy
      const mockHeaderBits = new Array(312).fill(0); // 104 * 3
      (extractBits as Mock).mockReturnValue(mockHeaderBits);

      // Mock ChecksumUtility.calculateCRC32 for empty message
      (calculateCRC32 as Mock).mockReturnValue(0x12345678);

      const result = await decoder.decodeWithRedundancy(samplePixelData, header, 3);

      expect(result).toEqual(emptyMessage);
    });

    it('should handle custom redundancy factors', async () => {
      const messageData = new Uint8Array([255]); // Single byte: 11111111
      const header = { ...sampleHeader, messageLength: 1, checksum: 0x12345678 };

      // Mock HeaderUtility.getHeaderSizeInBits
      (getHeaderSizeInBits as Mock).mockReturnValue(104);

      // Mock PixelDataUtility.extractBits with 5x redundancy
      const mockHeaderBits = new Array(520).fill(0); // 104 * 5
      const mockMessageBits = new Array(40).fill(1); // 1 byte * 8 bits * 5 redundancy = 40 bits (all 1s)
      const allBits = [...mockHeaderBits, ...mockMessageBits];
      (extractBits as Mock).mockReturnValue(allBits);

      // Mock ChecksumUtility.calculateCRC32
      (calculateCRC32 as Mock).mockReturnValue(0x12345678);

      const result = await decoder.decodeWithRedundancy(samplePixelData, header, 5);

      expect(result).toEqual(messageData);
    });

    it('should propagate errors from utility methods', async () => {
      const header = { ...sampleHeader, messageLength: 2, checksum: 0x12345678 };

      // Mock HeaderUtility.getHeaderSizeInBits to throw error
      (getHeaderSizeInBits as Mock).mockImplementation(() => {
        throw new Error('Header size calculation failed');
      });

      await expect(decoder.decodeWithRedundancy(samplePixelData, header, 3)).rejects.toThrow(
        'Header size calculation failed'
      );
    });
  });

  describe('majorityVote', () => {
    it('should return 1 when majority are 1s', () => {
      const result = decoder.majorityVote([1, 1, 0]);
      expect(result).toBe(1);
    });

    it('should return 0 when majority are 0s', () => {
      const result = decoder.majorityVote([0, 0, 1]);
      expect(result).toBe(0);
    });

    it('should return 0 when there are equal numbers (tie goes to 0)', () => {
      const result = decoder.majorityVote([1, 0]);
      expect(result).toBe(0);
    });

    it('should handle all 1s', () => {
      const result = decoder.majorityVote([1, 1, 1]);
      expect(result).toBe(1);
    });

    it('should handle all 0s', () => {
      const result = decoder.majorityVote([0, 0, 0]);
      expect(result).toBe(0);
    });

    it('should handle larger groups', () => {
      const result = decoder.majorityVote([1, 1, 1, 0, 0]);
      expect(result).toBe(1);
    });

    it('should handle single bit', () => {
      expect(decoder.majorityVote([1])).toBe(1);
      expect(decoder.majorityVote([0])).toBe(0);
    });
  });

  describe('applyMajorityVoting', () => {
    it('should apply majority voting to recover original bits', () => {
      // Access private method through any cast for testing
      const applyMajorityVoting = (decoder as any).applyMajorityVoting.bind(decoder);

      // Test with redundancy factor 3: [1,1,0, 0,0,1, 1,1,1] -> [1, 0, 1]
      const redundantBits = [1, 1, 0, 0, 0, 1, 1, 1, 1];
      const result = applyMajorityVoting(redundantBits, 3);

      expect(result).toEqual([1, 0, 1]);
    });

    it('should handle empty redundant bits', () => {
      const applyMajorityVoting = (decoder as any).applyMajorityVoting.bind(decoder);

      const result = applyMajorityVoting([], 3);

      expect(result).toEqual([]);
    });

    it('should handle different redundancy factors', () => {
      const applyMajorityVoting = (decoder as any).applyMajorityVoting.bind(decoder);

      // Redundancy factor 5: [1,1,1,0,0, 0,0,0,1,1] -> [1, 0]
      const redundantBits = [1, 1, 1, 0, 0, 0, 0, 0, 1, 1];
      const result = applyMajorityVoting(redundantBits, 5);

      expect(result).toEqual([1, 0]);
    });
  });

  describe('bitsToBytes', () => {
    it('should convert bits to bytes correctly', () => {
      // Access private method through any cast for testing
      const bitsToBytes = (decoder as any).bitsToBytes.bind(decoder);

      // Test "He" (72, 101)
      const bits = [
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
      ];

      const result = bitsToBytes(bits);

      expect(result).toEqual(new Uint8Array([72, 101]));
    });

    it('should handle empty bit array', () => {
      const bitsToBytes = (decoder as any).bitsToBytes.bind(decoder);

      const result = bitsToBytes([]);

      expect(result).toEqual(new Uint8Array(0));
    });

    it('should handle incomplete last byte', () => {
      const bitsToBytes = (decoder as any).bitsToBytes.bind(decoder);

      // Only 4 bits: 1010 -> should become 10100000 = 160
      const bits = [1, 0, 1, 0];

      const result = bitsToBytes(bits);

      expect(result).toEqual(new Uint8Array([160]));
    });
  });
});
