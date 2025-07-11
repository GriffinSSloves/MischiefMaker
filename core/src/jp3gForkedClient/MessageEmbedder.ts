import { IJpegInternalDecoder } from './IJpegDecoder';

// DCT types live in DCTExtractor but are not needed directly here

export interface IEmbedStats {
  /** Number of AC coefficients whose LSB has been changed */
  coefficientsModified: number;
  /** Total number of 8×8 blocks visited in the luminance component */
  blocksVisited: number;
  /** Bytes of message successfully embedded */
  bytesEmbedded: number;
}

/**
 * Embed the given message bytes into the luminance (Y) component's DCT blocks
 * using the classic LSB technique on AC coefficients (indices 1–63).
 *
 * This function mutates the decoder's `dctBlocks` in-place.
 */
export function embedMessageInDctBlocks(decoder: IJpegInternalDecoder, message: Uint8Array): IEmbedStats {
  if (!decoder?.components?.length) {
    throw new Error('Decoder has no components');
  }

  const yComponent = decoder.components[0];

  if (!yComponent?.dctBlocks) {
    throw new Error('Decoder component has no dctBlocks');
  }

  let coefficientsModified = 0;
  let messageIndex = 0;
  let bitIndex = 0;

  const totalRows = yComponent.dctBlocks.length;
  const totalCols = yComponent.dctBlocks[0].length;

  outer: for (let row = 0; row < totalRows; row++) {
    const rowData = yComponent.dctBlocks[row];
    for (let col = 0; col < totalCols; col++) {
      const block: number[] = rowData[col];
      if (!block || block.length !== 64) continue;

      // Modify AC coefficients (skip DC at index 0)
      for (let coefIdx = 1; coefIdx < 64 && messageIndex < message.length; coefIdx++) {
        const coef = block[coefIdx];

        // Only modify non-zero coefficients with magnitude ≥ 2 to minimise distortion
        if (coef !== 0 && Math.abs(coef) >= 2) {
          const bit = (message[messageIndex] >> (7 - bitIndex)) & 1;
          // Apply bit to LSB
          if (coef > 0) {
            block[coefIdx] = (coef & ~1) | bit;
          } else {
            block[coefIdx] = -((Math.abs(coef) & ~1) | bit);
          }

          coefficientsModified++;
          bitIndex++;

          if (bitIndex === 8) {
            bitIndex = 0;
            messageIndex++;
            if (messageIndex === message.length) {
              break outer;
            }
          }
        }
      }
    }
  }

  return {
    coefficientsModified,
    blocksVisited: totalRows * totalCols,
    bytesEmbedded: messageIndex,
  };
}
