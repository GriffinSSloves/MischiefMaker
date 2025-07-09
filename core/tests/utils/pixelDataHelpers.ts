import type { PixelData } from '../../src/types/PixelData';

/**
 * Create deterministic test pixel data for consistent testing
 * Generates varied but predictable pixel values for reliable testing
 */
export function createDeterministicPixelData(width: number, height: number): PixelData {
  const totalPixels = width * height;
  const red = new Array(totalPixels);
  const green = new Array(totalPixels);
  const blue = new Array(totalPixels);

  // Generate deterministic but varied pixel values
  for (let i = 0; i < totalPixels; i++) {
    red[i] = (i * 17) % 256;
    green[i] = (i * 31) % 256;
    blue[i] = (i * 47) % 256;
  }

  return {
    width,
    height,
    channels: { red, green, blue },
    totalPixels,
  };
}

/**
 * Create test pixel data with uniform values
 * Useful for simple test scenarios where pixel variation isn't important
 */
export function createTestPixelData(width: number, height: number, fillValue: number = 128): PixelData {
  const totalPixels = width * height;
  return {
    width,
    height,
    channels: {
      red: new Array(totalPixels).fill(fillValue),
      green: new Array(totalPixels).fill(fillValue),
      blue: new Array(totalPixels).fill(fillValue),
    },
    totalPixels,
  };
}

/**
 * Create pixel data with specific bits encoded in LSBs
 * Useful for testing specific bit patterns and decoding scenarios
 */
export function createPixelDataWithBits(width: number, height: number, bits: number[]): PixelData {
  const totalPixels = width * height;
  const red = new Array(totalPixels).fill(128);
  const green = new Array(totalPixels).fill(128);
  const blue = new Array(totalPixels).fill(128);

  // Encode bits into LSBs (red channel first, then green, then blue)
  for (let i = 0; i < bits.length; i++) {
    const pixelIndex = Math.floor(i / 3);
    const channelIndex = i % 3;

    if (pixelIndex < totalPixels) {
      const originalValue = 128; // Base value
      const newValue = (originalValue & 0xfe) | bits[i]; // Clear LSB and set to bit value

      switch (channelIndex) {
        case 0:
          red[pixelIndex] = newValue;
          break;
        case 1:
          green[pixelIndex] = newValue;
          break;
        case 2:
          blue[pixelIndex] = newValue;
          break;
      }
    }
  }

  return {
    width,
    height,
    channels: { red, green, blue },
    totalPixels,
  };
}

/**
 * Create pixel data suitable for large message testing
 * Automatically determines appropriate dimensions for the message size
 */
export function createPixelDataForMessage(
  messageLength: number,
  algorithm: 'simple-lsb' | 'triple-redundancy' = 'simple-lsb'
): PixelData {
  // Calculate required capacity
  const headerBits = 120; // Approximate header size in bits
  const messageBits = messageLength * 8;
  const redundancyFactor = algorithm === 'triple-redundancy' ? 3 : 1;
  const totalBitsNeeded = (headerBits + messageBits) * redundancyFactor;

  // Calculate required pixels (3 bits per pixel for RGB channels)
  const pixelsNeeded = Math.ceil(totalBitsNeeded / 3);

  // Create square-ish image with some margin
  const dimension = Math.ceil(Math.sqrt(pixelsNeeded * 1.2)); // 20% margin

  return createDeterministicPixelData(dimension, dimension);
}

/**
 * Corrupt pixel data by flipping LSBs in a specific range
 * Useful for testing error detection and corruption handling
 */
export function corruptPixelDataLSBs(pixelData: PixelData, startPixel: number, endPixel: number): PixelData {
  const corrupted = {
    ...pixelData,
    channels: {
      red: [...pixelData.channels.red],
      green: [...pixelData.channels.green],
      blue: [...pixelData.channels.blue],
    },
  };

  for (let i = startPixel; i < endPixel && i < pixelData.totalPixels; i++) {
    corrupted.channels.red[i] ^= 1; // Flip LSB
    corrupted.channels.green[i] ^= 1; // Flip LSB
    corrupted.channels.blue[i] ^= 1; // Flip LSB
  }

  return corrupted;
}

/**
 * Corrupt pixel data with sparse, random corruption that respects redundancy
 * This corruption pattern is designed to test redundancy recovery effectively
 */
export function corruptPixelDataSparse(pixelData: PixelData, corruptionCount: number): PixelData {
  const corrupted = {
    ...pixelData,
    channels: {
      red: [...pixelData.channels.red],
      green: [...pixelData.channels.green],
      blue: [...pixelData.channels.blue],
    },
  };

  // Create a deterministic but pseudo-random corruption pattern
  // This ensures we don't corrupt all copies of the same redundant group
  const totalBits = pixelData.totalPixels * 3;
  const corruptedBits = new Set<number>();

  for (let i = 0; i < corruptionCount && corruptedBits.size < totalBits; i++) {
    let bitPosition;
    let attempts = 0;

    do {
      // Generate pseudo-random bit position using a simple PRNG
      bitPosition = ((i * 17 + 23) * 31) % totalBits;
      attempts++;
    } while (corruptedBits.has(bitPosition) && attempts < 100);

    if (attempts < 100) {
      corruptedBits.add(bitPosition);

      // Convert bit position to pixel and channel
      const pixelIndex = Math.floor(bitPosition / 3);
      const channelIndex = bitPosition % 3;

      if (pixelIndex < pixelData.totalPixels) {
        switch (channelIndex) {
          case 0:
            corrupted.channels.red[pixelIndex] ^= 1;
            break;
          case 1:
            corrupted.channels.green[pixelIndex] ^= 1;
            break;
          case 2:
            corrupted.channels.blue[pixelIndex] ^= 1;
            break;
        }
      }
    }
  }

  return corrupted;
}
