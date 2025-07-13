/* eslint-disable no-console */
import { IJpegInternalDecoder } from '../../types/IJpegDecoder';

export interface IPerceptualEmbedStats {
  /** Number of AC coefficients whose LSB has been changed */
  coefficientsModified: number;
  /** Total number of 8×8 blocks visited in the luminance component */
  blocksVisited: number;
  /** Bytes of message successfully embedded */
  bytesEmbedded: number;
  /** Average perceptual weight of modified coefficients (higher = less visible) */
  averagePerceptualWeight: number;
  /** Number of coefficients skipped due to low perceptual weight */
  coefficientsSkipped: number;
}

/**
 * Perceptual weighting matrix for DCT coefficients (8x8 block)
 * Based on human visual system sensitivity to different frequencies.
 * Higher values = less visually important = better for steganography
 *
 * This matrix prioritizes high-frequency coefficients that are less
 * perceptible to human vision while being practical for steganography.
 */
const PERCEPTUAL_WEIGHT_MATRIX = [
  // DC component (index 0) - never modified
  0,
  // AC components (indices 1-63) - zigzag order with balanced weights
  5,
  8,
  12,
  16,
  20,
  24,
  28,
  32, // Low frequencies (more visible but usable)
  10,
  15,
  20,
  25,
  30,
  35,
  40,
  45, // Mid frequencies
  20,
  25,
  30,
  35,
  40,
  45,
  50,
  55, // Higher frequencies (less visible)
  25,
  30,
  35,
  40,
  45,
  50,
  55,
  60, // High frequencies (good for steganography)
  30,
  35,
  40,
  45,
  50,
  55,
  60,
  65, // Higher frequencies
  35,
  40,
  45,
  50,
  55,
  60,
  65,
  70, // Higher frequencies
  40,
  45,
  50,
  55,
  60,
  65,
  70,
  75, // Higher frequencies
  45,
  50,
  55,
  60,
  65,
  70,
  75,
  80, // Highest frequencies (best for steganography)
];

/**
 * Advanced coefficient evaluation considering:
 * 1. Magnitude (avoid small coefficients that become zero after quantization)
 * 2. Perceptual weight (prefer high-frequency, less visible coefficients)
 * 3. Quantization sensitivity (avoid coefficients near quantization boundaries)
 */
function evaluateCoefficient(
  coefficient: number,
  coefficientIndex: number,
  quantizationValue: number = 1
): { suitable: boolean; weight: number; reason?: string } {
  // Never modify DC coefficient
  if (coefficientIndex === 0) {
    return { suitable: false, weight: 0, reason: 'DC coefficient' };
  }

  // Skip zero coefficients (nothing to modify)
  if (coefficient === 0) {
    return { suitable: false, weight: 0, reason: 'Zero coefficient' };
  }

  const absCoef = Math.abs(coefficient);
  const perceptualWeight = PERCEPTUAL_WEIGHT_MATRIX[coefficientIndex] || 1;

  // Minimum magnitude threshold (avoid coefficients that might become zero)
  // Use lenient threshold but ensure coefficient won't become zero after LSB modification
  const minMagnitude = Math.max(2, Math.ceil(quantizationValue * 0.3));
  if (absCoef < minMagnitude) {
    return { suitable: false, weight: 0, reason: `Magnitude too small (${absCoef} < ${minMagnitude})` };
  }

  // Avoid coefficients near quantization boundaries only for low-frequency components
  // This check is too restrictive for many images, so we'll be more lenient
  const quantizationBoundaryDistance = absCoef % quantizationValue;
  const nearBoundary = quantizationBoundaryDistance <= 1 || quantizationBoundaryDistance >= quantizationValue - 1;

  // Only skip boundary coefficients if they're in very visible frequencies AND have low perceptual weight
  if (nearBoundary && perceptualWeight < 10 && coefficientIndex < 16) {
    return { suitable: false, weight: 0, reason: 'Near quantization boundary in highly visible frequency' };
  }

  // Calculate final suitability weight
  const magnitudeWeight = Math.min(absCoef / 10, 5); // Prefer moderate magnitude coefficients
  const finalWeight = perceptualWeight * magnitudeWeight;

  // Only use coefficients with reasonable perceptual weighting
  // Further lowered threshold to ensure sufficient capacity for all image types
  const suitable = finalWeight >= 2.5; // Minimum threshold for embedding

  return { suitable, weight: finalWeight };
}

/**
 * Enhanced message embedding with perceptual weighting and quantization awareness.
 * This version provides significantly better visual quality by:
 *
 * 1. Prioritizing high-frequency coefficients (less visible to human eye)
 * 2. Avoiding quantization boundaries that create visible artifacts
 * 3. Using magnitude thresholds adapted to quantization characteristics
 * 4. Providing detailed statistics for quality assessment
 */
export function embedMessageWithPerceptualWeighting(
  decoder: IJpegInternalDecoder,
  message: Uint8Array,
  debugMode: boolean = false
): IPerceptualEmbedStats {
  if (!decoder?.components?.length) {
    throw new Error('Decoder has no components');
  }

  const yComponent = decoder.components[0];

  if (!yComponent?.dctBlocks) {
    throw new Error('Decoder component has no dctBlocks');
  }

  // Get quantization table for the luminance component
  const quantTable = yComponent.quantizationTable ? Array.from(yComponent.quantizationTable) : new Array(64).fill(1);

  let coefficientsModified = 0;
  let coefficientsSkipped = 0;
  let messageIndex = 0;
  let bitIndex = 0;
  let totalPerceptualWeight = 0;

  const totalRows = yComponent.dctBlocks.length;
  const totalCols = yComponent.dctBlocks[0].length;

  if (debugMode) {
    console.log(`\n=== PERCEPTUAL EMBEDDING DEBUG ===`);
    console.log(`Image: ${decoder.width}x${decoder.height}, Blocks: ${totalRows}x${totalCols}`);
    console.log(`Message: ${message.length} bytes (${message.length * 8} bits)`);
    console.log(`Quantization table available: ${quantTable.length === 64 ? 'Yes' : 'No'}`);
  }

  outer: for (let row = 0; row < totalRows; row++) {
    const rowData = yComponent.dctBlocks[row];
    for (let col = 0; col < totalCols; col++) {
      const block: number[] = rowData[col];
      if (!block || block.length !== 64) {
        continue;
      }

      // Process AC coefficients in sequential order to ensure deterministic embedding/extraction
      // Start from index 1 (skip DC) and process in natural order for consistency
      for (let coefIdx = 1; coefIdx < 64; coefIdx++) {
        if (messageIndex >= message.length) {
          break outer;
        }

        const coef = block[coefIdx];
        const quantValue = quantTable[coefIdx] || 1;
        const evaluation = evaluateCoefficient(coef, coefIdx, quantValue);

        if (!evaluation.suitable) {
          coefficientsSkipped++;
          if (debugMode && coefficientsSkipped < 10) {
            console.log(`  Skip coef[${coefIdx}]=${coef}: ${evaluation.reason}`);
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
        totalPerceptualWeight += evaluation.weight;
        bitIndex++;

        if (debugMode && coefficientsModified <= 5) {
          console.log(
            `  Embed bit ${bit} in coef[${coefIdx}]: ${coef} → ${block[coefIdx]} (weight: ${evaluation.weight.toFixed(1)})`
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
    console.log(`\n=== EMBEDDING RESULTS ===`);
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
 * Extract message using the same perceptual coefficient ordering
 * This ensures we read bits in the same order they were written
 */
export function extractMessageWithPerceptualWeighting(
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

  const quantTable = yComponent.quantizationTable ? Array.from(yComponent.quantizationTable) : new Array(64).fill(1);
  const messageBytes = new Uint8Array(expectedMessageLength);

  let coefficientsRead = 0;
  let coefficientsSkipped = 0;
  let messageIndex = 0;
  let bitIndex = 0;
  let currentByte = 0;

  const totalRows = yComponent.dctBlocks.length;
  const totalCols = yComponent.dctBlocks[0].length;

  if (debugMode) {
    console.log(`\n=== PERCEPTUAL EXTRACTION DEBUG ===`);
    console.log(`Expected message length: ${expectedMessageLength} bytes`);
  }

  outer: for (let row = 0; row < totalRows; row++) {
    const rowData = yComponent.dctBlocks[row];
    for (let col = 0; col < totalCols; col++) {
      const block: number[] = rowData[col];
      if (!block || block.length !== 64) {
        continue;
      }

      // Use same sequential coefficient ordering as embedding for consistency
      for (let coefIdx = 1; coefIdx < 64; coefIdx++) {
        if (messageIndex >= expectedMessageLength) {
          break outer;
        }

        const coef = block[coefIdx];
        const quantValue = quantTable[coefIdx] || 1;
        const evaluation = evaluateCoefficient(coef, coefIdx, quantValue);

        if (!evaluation.suitable) {
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
    console.log(`\n=== EXTRACTION RESULTS ===`);
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
