import { describe, it, expect } from 'vitest';
import { extractDCTFromPreservedBlocks, extractDCTFromInternalBlocks, IDCTExtractionResult } from './DCTExtractor';

// Helper to create a mock 8×8 block filled with incremental values for easy assertions.
const createMockBlock = () => Array.from({ length: 64 }, (_, i) => i);

describe('DCTExtractor', () => {
  it('extracts coefficients from preserved dctBlocks', () => {
    const mockDecoder: any = {
      width: 16,
      height: 16,
      components: [
        {
          dctBlocks: [[createMockBlock()]],
        },
      ],
    };

    const result: IDCTExtractionResult = extractDCTFromPreservedBlocks(mockDecoder);

    expect(result.totalBlocks).toBe(1);
    expect(result.blocks[0].dc).toBe(0); // First value of block
    expect(result.blocks[0].ac.length).toBe(63);
    expect(result.width).toBe(16);
    expect(result.height).toBe(16);
  });

  it('extracts coefficients from internal blocks', () => {
    const mockDecoder: any = {
      width: 8,
      height: 8,
      components: [
        {
          blocks: [[createMockBlock()]],
        },
      ],
    };

    const result: IDCTExtractionResult = extractDCTFromInternalBlocks(mockDecoder);

    expect(result.totalBlocks).toBe(1);
    expect(result.blocks[0].dc).toBe(0);
    expect(result.blocks[0].ac[0]).toBe(1);
    expect(result.width).toBe(8);
    expect(result.height).toBe(8);
  });
});
