import type { ITripleRedundancyEncoder } from '../interfaces/IEncoder';
import type { ICapacityCalculator } from '../interfaces/ICapacityCalculator';
import type { PixelData } from '../types/PixelData';
import type { SteganographyHeader } from '../types/SteganographyHeader';
import type { LSBConfig } from '../types/LSBConfig';
import { embedBits } from '../utils/PixelDataUtility/PixelDataUtility';
import { serializeHeader } from '../utils/HeaderUtility/HeaderUtility';
import { CapacityCalculator } from '../utils/CapacityCalculator/CapacityCalculator';
import { ALGORITHM_CONSTANTS } from '../types/Constants';

/**
 * Triple redundancy LSB encoder implementation
 * Uses 1 bit per channel with 3x redundancy for high reliability
 */
export class TripleRedundancyEncoder implements ITripleRedundancyEncoder {
  private readonly capacityCalculator: ICapacityCalculator;

  constructor(capacityCalculator: ICapacityCalculator = new CapacityCalculator()) {
    this.capacityCalculator = capacityCalculator;
  }

  /**
   * Encode message data into pixel data using triple redundancy LSB method
   */
  async encode(
    pixelData: PixelData,
    messageData: Uint8Array,
    header: SteganographyHeader,
    _config?: Partial<LSBConfig>
  ): Promise<PixelData> {
    return this.encodeWithRedundancy(pixelData, messageData, header, ALGORITHM_CONSTANTS.redundancyFactor);
  }

  /**
   * Encode with triple redundancy for high reliability
   */
  async encodeWithRedundancy(
    pixelData: PixelData,
    messageData: Uint8Array,
    header: SteganographyHeader,
    redundancyFactor: number = ALGORITHM_CONSTANTS.redundancyFactor
  ): Promise<PixelData> {
    // Validate capacity first
    const totalMessageLength = messageData.length;
    if (!this.canEncode(pixelData, totalMessageLength)) {
      throw new Error(
        `Message too large for image. Required: ${totalMessageLength} bytes, Available: ${this.calculateCapacity(
          pixelData.width,
          pixelData.height
        )} bytes`
      );
    }

    // Create header with triple redundancy encoding method
    const headerWithMethod = { ...header, encodingMethod: 'triple-redundancy' as const };

    // Serialize header to bits
    const headerBits = serializeHeader(headerWithMethod);

    // Convert message to bits
    const messageBits = Array.from(messageData).flatMap(byte =>
      Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1)
    );

    // Combine header and message bits
    const allBits = [...headerBits, ...messageBits];

    // Apply triple redundancy to all bits
    const redundantBits = this.applyRedundancy(allBits, redundancyFactor);

    // Embed bits using triple redundancy method
    const modifiedPixelData = embedBits(pixelData, redundantBits);

    return modifiedPixelData;
  }

  /**
   * Calculate capacity for triple redundancy encoding
   */
  calculateCapacity(width: number, height: number): number {
    return this.capacityCalculator.calculateCapacity(width, height).tripleCapacity;
  }

  /**
   * Validate that message can be encoded with triple redundancy
   */
  canEncode(pixelData: PixelData, messageLength: number): boolean {
    const availableCapacity = this.calculateCapacity(pixelData.width, pixelData.height);
    return messageLength <= availableCapacity;
  }

  /**
   * Apply redundancy to bits by repeating each bit multiple times
   */
  private applyRedundancy(bits: number[], redundancyFactor: number): number[] {
    const redundantBits: number[] = [];
    for (const bit of bits) {
      for (let i = 0; i < redundancyFactor; i++) {
        redundantBits.push(bit);
      }
    }
    return redundantBits;
  }
}
