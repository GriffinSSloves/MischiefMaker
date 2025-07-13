/* eslint-disable no-console */
import { IJpegInternalDecoder } from '../../types/IJpegDecoder';

export interface ISimpleEmbedStats {
  coefficientsModified: number;
  blocksVisited: number;
  bytesEmbedded: number;
  averagePerceptualWeight: number;
  coefficientsSkipped: number;
}

/**
 * Simplified perceptual embedding that ensures consistent coefficient selection
 * between embedding and extraction operations
 */
export function embedMessageSimplePerceptual(
  decoder: IJpegInternalDecoder,
  message: Uint8Array,
  debugMode: boolean = false
): ISimpleEmbedStats {
  if (!decoder?.components?.length) {
    throw new Error('Decoder has no components');
  }

  const yComponent = decoder.components[0];
  if (!yComponent?.dctBlocks) {
    throw new Error('Decoder component has no dctBlocks');
  }

  let coefficientsModified = 0;
  let coefficientsSkipped = 0;
  let messageIndex = 0;
  let bitIndex = 0;
  let totalPerceptualWeight = 0;

  const totalRows = yComponent.dctBlocks.length;
  const totalCols = yComponent.dctBlocks[0].length;

  if (debugMode) {
    console.log(`\n=== SIMPLE PERCEPTUAL EMBEDDING ===`);
    console.log(`Image: ${decoder.width}x${decoder.height}, Blocks: ${totalRows}x${totalCols}`);
    console.log(`Message: ${message.length} bytes (${message.length * 8} bits)`);
  }

  outer: for (let row = 0; row < totalRows; row++) {
    const rowData = yComponent.dctBlocks[row];
    for (let col = 0; col < totalCols; col++) {
      const block: number[] = rowData[col];
      if (!block || block.length !== 64) {
        continue;
      }

      // Process AC coefficients in sequential order
      for (let coefIdx = 1; coefIdx < 64; coefIdx++) {
        if (messageIndex >= message.length) {
          break outer;
        }

        const coef = block[coefIdx];

        // Simple but reliable coefficient selection:
        // 1. Non-zero coefficients
        // 2. Magnitude >= 2 (to avoid becoming zero)
        // 3. Prefer higher frequency coefficients (lower modification impact)
        const isValidCoefficient = coef !== 0 && Math.abs(coef) >= 2;
        const perceptualWeight = coefIdx > 15 ? 2.0 : 1.0; // Higher frequencies get more weight

        if (!isValidCoefficient) {
          coefficientsSkipped++;
          if (debugMode && coefficientsSkipped < 5) {
            console.log(`  Skip coef[${coefIdx}]=${coef}: ${coef === 0 ? 'Zero' : 'Magnitude < 2'}`);
          }
          continue;
        }

        // Extract bit from message
        const bit = (message[messageIndex] >> (7 - bitIndex)) & 1;

        // Apply LSB modification with sign preservation
        if (coef > 0) {
          block[coefIdx] = (coef & ~1) | bit;
        } else {
          block[coefIdx] = -((Math.abs(coef) & ~1) | bit);
        }

        coefficientsModified++;
        totalPerceptualWeight += perceptualWeight;
        bitIndex++;

        if (debugMode && coefficientsModified <= 5) {
          console.log(
            `  Embed bit ${bit} in coef[${coefIdx}]: ${coef} → ${block[coefIdx]} (weight: ${perceptualWeight})`
          );
        }

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

  const averagePerceptualWeight = coefficientsModified > 0 ? totalPerceptualWeight / coefficientsModified : 0;

  if (debugMode) {
    console.log(`\n=== SIMPLE EMBEDDING RESULTS ===`);
    console.log(`Coefficients modified: ${coefficientsModified}`);
    console.log(`Coefficients skipped: ${coefficientsSkipped}`);
    console.log(`Bytes embedded: ${messageIndex} / ${message.length}`);
    console.log(`Average perceptual weight: ${averagePerceptualWeight.toFixed(2)}`);
    console.log(
      `Embedding efficiency: ${((coefficientsModified / (coefficientsModified + coefficientsSkipped)) * 100).toFixed(1)}%`
    );
  }

  return {
    coefficientsModified,
    blocksVisited: totalRows * totalCols,
    bytesEmbedded: messageIndex,
    averagePerceptualWeight,
    coefficientsSkipped,
  };
}

/**
 * Extract message using the same simple perceptual coefficient ordering
 */
export function extractMessageSimplePerceptual(
  decoder: IJpegInternalDecoder,
  expectedMessageLength: number,
  debugMode: boolean = false
): {
  bytes: Uint8Array;
  bitsExtracted: number;
  coefficientsRead: number;
  coefficientsSkipped: number;
} {
  if (!decoder?.components?.length) {
    throw new Error('Decoder has no components');
  }

  const yComponent = decoder.components[0];
  if (!yComponent?.dctBlocks) {
    throw new Error('Decoder component has no dctBlocks');
  }

  const messageBytes = new Uint8Array(expectedMessageLength);
  let coefficientsRead = 0;
  let coefficientsSkipped = 0;
  let messageIndex = 0;
  let bitIndex = 0;
  let currentByte = 0;

  const totalRows = yComponent.dctBlocks.length;
  const totalCols = yComponent.dctBlocks[0].length;

  if (debugMode) {
    console.log(`\n=== SIMPLE PERCEPTUAL EXTRACTION ===`);
    console.log(`Expected message length: ${expectedMessageLength} bytes`);
  }

  outer: for (let row = 0; row < totalRows; row++) {
    const rowData = yComponent.dctBlocks[row];
    for (let col = 0; col < totalCols; col++) {
      const block: number[] = rowData[col];
      if (!block || block.length !== 64) {
        continue;
      }

      // Use exactly the same coefficient selection logic as embedding
      for (let coefIdx = 1; coefIdx < 64; coefIdx++) {
        if (messageIndex >= expectedMessageLength) {
          break outer;
        }

        const coef = block[coefIdx];

        // Use EXACTLY the same selection criteria as embedding
        const isValidCoefficient = coef !== 0 && Math.abs(coef) >= 2;

        if (!isValidCoefficient) {
          coefficientsSkipped++;
          continue;
        }

        // Extract LSB
        const bit = Math.abs(coef) & 1;
        currentByte = (currentByte << 1) | bit;
        coefficientsRead++;
        bitIndex++;

        if (debugMode && coefficientsRead <= 5) {
          console.log(`  Extract bit ${bit} from coef[${coefIdx}]=${coef}`);
        }

        if (bitIndex === 8) {
          messageBytes[messageIndex] = currentByte;
          messageIndex++;
          bitIndex = 0;
          currentByte = 0;

          if (messageIndex >= expectedMessageLength) {
            break outer;
          }
        }
      }
    }
  }

  if (debugMode) {
    console.log(`\n=== SIMPLE EXTRACTION RESULTS ===`);
    console.log(`Coefficients read: ${coefficientsRead}`);
    console.log(`Coefficients skipped: ${coefficientsSkipped}`);
    console.log(`Bytes extracted: ${messageIndex} / ${expectedMessageLength}`);
  }

  return {
    bytes: messageBytes.slice(0, messageIndex),
    bitsExtracted: coefficientsRead,
    coefficientsRead,
    coefficientsSkipped,
  };
}
