import { IJpegInternalDecoder } from '../../types/IJpegDecoder';

export interface IDCTBlock {
  dc: number;
  ac: number[]; // 63 AC coefficients
}

export interface IDCTExtractionResult {
  blocks: IDCTBlock[];
  width: number;
  height: number;
  totalBlocks: number;
}

/**
 * Extract DCT coefficients from the custom `dctBlocks` property that our jp3g fork
 * preserves on each component.
 *
 * @param decoder - The internal decoder instance returned by jp3g.
 * @returns Collection of extracted blocks together with image dimensions.
 */
export function extractDCTFromPreservedBlocks(decoder: IJpegInternalDecoder): IDCTExtractionResult {
  const blocks: IDCTBlock[] = [];

  // Ensure we have at least one component to inspect.
  if (!decoder?.components?.length) {
    return { blocks, width: 0, height: 0, totalBlocks: 0 };
  }

  // Focus on first component (luminance) for now.
  const component = decoder.components[0];

  if (!component?.dctBlocks) {
    return { blocks, width: 0, height: 0, totalBlocks: 0 };
  }

  // Iterate over each 8×8 block in the preserved structure.
  for (let row = 0; row < component.dctBlocks.length; row++) {
    const rowData = component.dctBlocks[row];
    for (let col = 0; col < rowData.length; col++) {
      const block = rowData[col];
      if (block && block.length === 64) {
        const dc = block[0];
        const ac = Array.from(block.slice(1));
        blocks.push({ dc, ac });
      }
    }
  }

  return {
    blocks,
    width: decoder.width ?? 0,
    height: decoder.height ?? 0,
    totalBlocks: blocks.length,
  };
}

/**
 * Extract DCT coefficients from the original `blocks` property exposed by jp3g.
 * This path is used when the fork did not preserve `dctBlocks`.
 *
 * @param decoder - The internal decoder instance returned by jp3g.
 * @returns Collection of extracted blocks together with image dimensions.
 */
export function extractDCTFromInternalBlocks(decoder: IJpegInternalDecoder): IDCTExtractionResult {
  const blocks: IDCTBlock[] = [];

  if (!decoder?.components?.length) {
    return { blocks, width: 0, height: 0, totalBlocks: 0 };
  }

  const component = decoder.components[0];

  if (!component?.blocks) {
    return { blocks, width: 0, height: 0, totalBlocks: 0 };
  }

  for (let row = 0; row < component.blocks.length; row++) {
    const rowData = component.blocks[row];
    for (let col = 0; col < rowData.length; col++) {
      const block = rowData[col];
      if (block && block.length === 64) {
        const dc = block[0];
        const ac = Array.from(block.slice(1));
        blocks.push({ dc, ac });
      }
    }
  }

  return {
    blocks,
    width: decoder.width ?? 0,
    height: decoder.height ?? 0,
    totalBlocks: blocks.length,
  };
}
