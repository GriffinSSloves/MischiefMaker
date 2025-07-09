import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { TripleRedundancyEncoder } from './TripleRedundancyEncoder';
import { CapacityCalculator } from '../utils/CapacityCalculator/CapacityCalculator';
import type { PixelData } from '../types/PixelData';
import type { SteganographyHeader } from '../types/SteganographyHeader';

// Mock the pure function modules
vi.mock('../utils/PixelDataUtility/PixelDataUtility', () => ({
  embedBits: vi.fn(),
}));

vi.mock('../utils/HeaderUtility/HeaderUtility', () => ({
  serializeHeader: vi.fn(),
}));

// Import the mocked functions
import { embedBits } from '../utils/PixelDataUtility/PixelDataUtility';
import { serializeHeader } from '../utils/HeaderUtility/HeaderUtility';

describe('TripleRedundancyEncoder', () => {
  let encoder: TripleRedundancyEncoder;
  let mockCapacityCalculator: CapacityCalculator;

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
    messageLength: 13,
    checksum: 0x12345678,
    reserved: 0,
    encodingMethod: 'triple-redundancy',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock capacity calculator
    mockCapacityCalculator = {
      calculateCapacity: vi.fn().mockReturnValue({
        tripleCapacity: 1000,
      }),
      calculateFromPixelData: vi.fn(),
    };

    encoder = new TripleRedundancyEncoder(mockCapacityCalculator);
  });

  describe('constructor', () => {
    it('should create encoder with default dependencies', () => {
      const defaultEncoder = new TripleRedundancyEncoder();
      expect(defaultEncoder).toBeInstanceOf(TripleRedundancyEncoder);
    });

    it('should create encoder with injected capacity calculator', () => {
      expect(encoder).toBeInstanceOf(TripleRedundancyEncoder);
    });
  });

  describe('calculateCapacity', () => {
    it('should calculate capacity using CapacityCalculator triple capacity', () => {
      const result = encoder.calculateCapacity(100, 100);
      expect(mockCapacityCalculator.calculateCapacity).toHaveBeenCalledWith(100, 100);
      expect(result).toBe(1000);
    });
  });

  describe('canEncode', () => {
    it('should return true when message fits in available capacity', () => {
      mockCapacityCalculator.calculateCapacity = vi.fn().mockReturnValue({
        tripleCapacity: 1000,
      });

      const result = encoder.canEncode(samplePixelData, 500);
      expect(result).toBe(true);
    });

    it('should return false when message exceeds capacity', () => {
      mockCapacityCalculator.calculateCapacity = vi.fn().mockReturnValue({
        tripleCapacity: 1000,
      });

      const result = encoder.canEncode(samplePixelData, 1500);
      expect(result).toBe(false);
    });
  });

  describe('encode', () => {
    it('should encode message using triple redundancy', async () => {
      const messageData = new Uint8Array([72, 101]); // "He"
      const modifiedPixelData = { ...samplePixelData };

      // Mock the pure functions
      (serializeHeader as Mock).mockReturnValue([1, 0, 1, 0]);
      (embedBits as Mock).mockReturnValue(modifiedPixelData);

      // Mock capacity to allow encoding
      mockCapacityCalculator.calculateCapacity = vi.fn().mockReturnValue({
        tripleCapacity: 1000,
      });

      const result = await encoder.encode(samplePixelData, messageData, sampleHeader);

      expect(serializeHeader).toHaveBeenCalledWith({
        ...sampleHeader,
        encodingMethod: 'triple-redundancy',
      });
      expect(embedBits).toHaveBeenCalled();
      expect(result).toBe(modifiedPixelData);
    });

    it('should throw error when message is too large', async () => {
      const largeMessage = new Uint8Array(2000);

      mockCapacityCalculator.calculateCapacity = vi.fn().mockReturnValue({
        tripleCapacity: 100,
      });

      await expect(encoder.encode(samplePixelData, largeMessage, sampleHeader)).rejects.toThrow('Message too large');
    });
  });

  describe('encodeWithRedundancy', () => {
    it('should encode with custom redundancy factor', async () => {
      const messageData = new Uint8Array([72]);
      const modifiedPixelData = { ...samplePixelData };

      (serializeHeader as Mock).mockReturnValue([1, 0]);
      (embedBits as Mock).mockReturnValue(modifiedPixelData);

      mockCapacityCalculator.calculateCapacity = vi.fn().mockReturnValue({
        tripleCapacity: 1000,
      });

      const result = await encoder.encodeWithRedundancy(samplePixelData, messageData, sampleHeader, 3);

      expect(result).toBe(modifiedPixelData);
    });
  });
});
