import { IJpegInternalDecoder } from '../../types/IJpegDecoder';

export interface IExtractResult {
  bytes: Uint8Array;
  bitsExtracted: number;
  coefficientsRead: number;
}

/**
 * Extract a message of the given length (in bytes) from the luminance component
 * of the decoder, assuming the same embedding strategy as `MessageEmbedder`.
 */
export function extractMessageFromDctBlocks(decoder: IJpegInternalDecoder, expectedLength: number): IExtractResult {
  if (!decoder?.components?.length) {
    throw new Error('Decoder has no components');
  }

  const yComponent = decoder.components[0];

  if (!yComponent?.dctBlocks) {
    throw new Error('Decoder component has no dctBlocks');
  }

  const resultBytes = new Uint8Array(expectedLength);
  let messageIndex = 0;
  let bitIndex = 0;
  let currentByte = 0;
  let coefficientsRead = 0;

  outer: for (let row = 0; row < yComponent.dctBlocks.length; row++) {
    const rowData = yComponent.dctBlocks[row];
    for (let col = 0; col < rowData.length; col++) {
      const block: number[] = rowData[col];
      if (!block || block.length !== 64) {
        continue;
      }

      for (let coefIdx = 1; coefIdx < 64 && messageIndex < expectedLength; coefIdx++) {
        const coef = block[coefIdx];
        if (coef !== 0 && Math.abs(coef) >= 2) {
          const bit = coef & 1;
          currentByte |= bit << (7 - bitIndex);

          coefficientsRead++;
          bitIndex++;

          if (bitIndex === 8) {
            resultBytes[messageIndex] = currentByte;
            messageIndex++;
            bitIndex = 0;
            currentByte = 0;

            if (messageIndex === expectedLength) {
              break outer;
            }
          }
        }
      }
    }
  }

  return {
    bytes: resultBytes.subarray(0, messageIndex),
    bitsExtracted: messageIndex * 8,
    coefficientsRead,
  };
}
