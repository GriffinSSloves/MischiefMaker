import { describe, it, expect } from 'vitest';
import { embedMessageInDctBlocks } from './MessageEmbedder';
import { extractMessageFromDctBlocks } from './MessageExtractor';
import { IJpegInternalDecoder } from './IJpegDecoder';

const createEmptyBlock = () => {
  const arr = new Array(64).fill(2); // magnitude >= 2, all positive
  arr[0] = 10; // DC coefficient (unused)
  return arr;
};

describe('MessageEmbedder & MessageExtractor', () => {
  it('round-trips a short message', () => {
    const message = 'Hi';
    const messageBytes = new TextEncoder().encode(message);

    // Mock decoder with 1×1 luminance block
    const mockDecoder: IJpegInternalDecoder = {
      width: 8,
      height: 8,
      components: [
        {
          dctBlocks: [[createEmptyBlock()]],
        },
      ],
    };

    // Embed
    const embedStats = embedMessageInDctBlocks(mockDecoder, messageBytes);
    expect(embedStats.bytesEmbedded).toBe(messageBytes.length);
    expect(embedStats.coefficientsModified).toBeGreaterThan(0);

    // Extract
    const extractResult = extractMessageFromDctBlocks(mockDecoder, messageBytes.length);
    const extracted = new TextDecoder().decode(extractResult.bytes);

    expect(extracted).toBe(message);
    expect(extractResult.bitsExtracted).toBe(messageBytes.length * 8);
  });
});
