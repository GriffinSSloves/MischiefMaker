import F5Stego from 'f5stegojs';

export interface IF5StegoParseResult {
  success: boolean;
  error?: string;
  capacityInfo?: {
    capacity: number[];
    coeff_total: number;
    coeff_large: number;
  };
}

export interface IF5StegoEmbedResult {
  stegoImage: Uint8Array;
  success: boolean;
  error?: string;
  stats?: {
    k: number;
    examined: number;
    changed: number;
    thrown: number;
    efficiency: string;
  };
}

export interface IF5StegoExtractResult {
  message: Uint8Array;
  success: boolean;
  error?: string;
}

export class F5StegoClient {
  /**
   * Convert string key to number array for F5Stego
   */
  private stringToKeyArray(key: string): number[] {
    return Array.from(new TextEncoder().encode(key));
  }

  /**
   * Validate and parse a JPEG image, returning capacity information
   */
  parse(imageBuffer: Uint8Array, stegoKey: string): IF5StegoParseResult {
    try {
      // Validate JPEG magic bytes
      if (imageBuffer[0] !== 0xff || imageBuffer[1] !== 0xd8) {
        throw new Error('Invalid JPEG format: Missing JPEG magic bytes');
      }

      const keyArray = this.stringToKeyArray(stegoKey);
      const f5 = new F5Stego(keyArray);

      f5.parse(imageBuffer);
      const analysis = f5.analyze();

      return {
        success: true,
        capacityInfo: {
          capacity: analysis.capacity,
          coeff_total: analysis.coeff_total,
          coeff_large: analysis.coeff_large,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          error: `JPEG format not supported by f5stegojs: ${error.message}`,
        };
      }
      return {
        success: false,
        error:
          'JPEG format not supported by f5stegojs. The library requires baseline JPEG with specific characteristics.',
      };
    }
  }

  /**
   * Get embedding capacity of an image in bytes
   */
  capacity(imageBuffer: Uint8Array, stegoKey: string): number {
    try {
      const parseResult = this.parse(imageBuffer, stegoKey);
      if (!parseResult.success || !parseResult.capacityInfo) {
        throw new Error(parseResult.error || 'Could not parse image');
      }

      // Return total capacity from the first element (assuming it's the main capacity)
      return parseResult.capacityInfo.capacity[0] || 0;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Cannot calculate capacity: ${error.message}`);
      }
      throw new Error('Cannot calculate capacity for this image format');
    }
  }

  /**
   * Embed data into an image
   */
  embed(imageBuffer: Uint8Array, message: string, stegoKey: string): IF5StegoEmbedResult {
    try {
      const keyArray = this.stringToKeyArray(stegoKey);
      const f5 = new F5Stego(keyArray);

      f5.parse(imageBuffer);
      const messageBytes = new TextEncoder().encode(message);
      const embedResult = f5.f5put(messageBytes);
      const stegoImage = f5.pack();

      return {
        stegoImage,
        success: true,
        stats: {
          k: embedResult.k,
          examined: embedResult.examined,
          changed: embedResult.changed,
          thrown: embedResult.thrown,
          efficiency: embedResult.efficiency,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown embedding error';
      return {
        stegoImage: new Uint8Array(),
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Extract data from an image
   */
  extract(imageBuffer: Uint8Array, stegoKey: string): IF5StegoExtractResult {
    try {
      const keyArray = this.stringToKeyArray(stegoKey);
      const f5 = new F5Stego(keyArray);

      f5.parse(imageBuffer);
      const messageBytes = f5.f5get();

      return {
        message: messageBytes,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown extraction error';
      return {
        message: new Uint8Array(),
        success: false,
        error: errorMessage,
      };
    }
  }
}
