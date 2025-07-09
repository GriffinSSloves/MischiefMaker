import type { ISimpleLSBEncoder } from '../interfaces/IEncoder';
import type { ICapacityCalculator } from '../interfaces/ICapacityCalculator';
import type { PixelData } from '../types/PixelData';
import type { SteganographyHeader } from '../types/SteganographyHeader';
import type { LSBConfig } from '../types/LSBConfig';
import { embedBits } from '../utils/PixelDataUtility/PixelDataUtility';
import { serializeHeader } from '../utils/HeaderUtility/HeaderUtility';
import { CapacityCalculator } from '../utils/CapacityCalculator/CapacityCalculator';

/**
 * Simple LSB encoder implementation
 * Uses 1 bit per channel with no redundancy for maximum capacity
 */
export class SimpleLSBEncoder implements ISimpleLSBEncoder {
  private readonly capacityCalculator: ICapacityCalculator;

  constructor(capacityCalculator: ICapacityCalculator = new CapacityCalculator()) {
    this.capacityCalculator = capacityCalculator;
  }

  /**
   * Encode message data into pixel data using simple LSB method
   */
  async encode(
    pixelData: PixelData,
    messageData: Uint8Array,
    header: SteganographyHeader,
    _config?: Partial<LSBConfig>
  ): Promise<PixelData> {
    return this.encodeSimple(pixelData, messageData, header);
  }

  /**
   * Encode with maximum capacity utilization (no redundancy)
   */
  async encodeSimple(pixelData: PixelData, messageData: Uint8Array, header: SteganographyHeader): Promise<PixelData> {
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

    // Create header with simple encoding method
    const headerWithMethod = { ...header, encodingMethod: 'simple-lsb' as const };

    // Serialize header to bits
    const headerBits = serializeHeader(headerWithMethod);

    // Convert message to bits
    const messageBits = Array.from(messageData).flatMap(byte =>
      Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1)
    );

    // Combine header and message bits
    const allBits = [...headerBits, ...messageBits];

    // Embed bits using simple LSB method
    const modifiedPixelData = embedBits(pixelData, allBits);

    return modifiedPixelData;
  }

  /**
   * Calculate capacity for simple LSB encoding
   */
  calculateCapacity(width: number, height: number): number {
    return this.capacityCalculator.calculateCapacity(width, height).simpleCapacity;
  }

  /**
   * Validate that message can be encoded with simple LSB
   */
  canEncode(pixelData: PixelData, messageLength: number): boolean {
    const availableCapacity = this.calculateCapacity(pixelData.width, pixelData.height);
    return messageLength <= availableCapacity;
  }
}
