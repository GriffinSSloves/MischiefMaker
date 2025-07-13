import { IJpegInternalDecoder } from '../../types/IJpegDecoder';

export interface IQualityAnalysis {
  /** Estimated original JPEG quality (1-100) */
  estimatedQuality: number;
  /** Recommended re-encoding quality to minimize artifacts */
  recommendedQuality: number;
  /** Whether the image appears to be high-quality (minimal compression artifacts) */
  isHighQuality: boolean;
  /** Whether the image has fine details that need preservation */
  hasFineDetails: boolean;
  /** Analysis confidence (0-1, higher = more reliable) */
  confidence: number;
  /** Detailed analysis for debugging */
  analysis: {
    avgQuantY: number;
    avgQuantC: number;
    maxQuantY: number;
    highFrequencyActivity: number;
    compressionRatio: number;
  };
}

/**
 * Standard JPEG quantization table for quality 50
 * Used as reference for quality estimation
 */
const STANDARD_QUANTIZATION_TABLE_50 = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51,
  87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99,
];

/**
 * Analyze JPEG quality characteristics to determine optimal re-encoding settings
 * This helps prevent quality degradation during steganography operations
 */
export function analyzeImageQuality(decoder: IJpegInternalDecoder): IQualityAnalysis {
  if (!decoder?.components?.length) {
    throw new Error('Decoder has no components for quality analysis');
  }

  const yComponent = decoder.components[0];
  const quantTable = yComponent.quantizationTable ? Array.from(yComponent.quantizationTable) : new Array(64).fill(1);

  // Calculate average quantization values
  const avgQuantY = quantTable.reduce((sum: number, val: number) => sum + val, 0) / 64;

  // Get chrominance quantization (or fallback to luminance)
  const cComponent = decoder.components[1] || yComponent;
  const cQuantTable = cComponent.quantizationTable ? Array.from(cComponent.quantizationTable) : quantTable;
  const avgQuantC = cQuantTable.reduce((sum: number, val: number) => sum + val, 0) / 64;

  // Find maximum quantization value (indicates compression level)
  const maxQuantY = Math.max(...quantTable);

  // Estimate original quality by comparing to standard tables
  // Lower quantization values = higher quality
  const qualityEstimate = Math.max(
    1,
    Math.min(100, 100 - ((avgQuantY - 1) / (Math.max(...STANDARD_QUANTIZATION_TABLE_50) - 1)) * 50)
  );

  // Analyze high-frequency activity in DCT blocks
  let highFrequencyActivity = 0;
  let totalBlocks = 0;

  if (yComponent.dctBlocks) {
    for (let row = 0; row < Math.min(yComponent.dctBlocks.length, 10); row++) {
      for (let col = 0; col < Math.min(yComponent.dctBlocks[row].length, 10); col++) {
        const block = yComponent.dctBlocks[row][col];
        if (block && block.length === 64) {
          // Measure activity in high-frequency coefficients (indices 32-63)
          let blockActivity = 0;
          for (let i = 32; i < 64; i++) {
            blockActivity += Math.abs(block[i]);
          }
          highFrequencyActivity += blockActivity;
          totalBlocks++;
        }
      }
    }
  }

  if (totalBlocks > 0) {
    highFrequencyActivity /= totalBlocks;
  }

  // Calculate compression ratio estimate (placeholder - would need original file size)
  const compressionRatio = 1;

  // Determine quality characteristics
  const isHighQuality = qualityEstimate > 70 && maxQuantY < 50;
  const hasFineDetails = highFrequencyActivity > 10;

  // Calculate recommended re-encoding quality
  let recommendedQuality: number;

  if (isHighQuality) {
    // For high-quality images, use slightly lower quality to avoid bloat
    recommendedQuality = Math.max(75, qualityEstimate - 10);
  } else if (qualityEstimate < 30) {
    // For low-quality images, don't compress further
    recommendedQuality = Math.max(30, qualityEstimate + 5);
  } else {
    // For medium quality, maintain similar level
    recommendedQuality = qualityEstimate;
  }

  // Adjust for fine details
  if (hasFineDetails) {
    recommendedQuality = Math.min(95, recommendedQuality + 5);
  }

  // Calculate confidence based on quantization table consistency
  const quantVariance =
    quantTable.reduce((sum: number, val: number) => {
      const diff = val - avgQuantY;
      return sum + diff * diff;
    }, 0) / 64;

  const confidence = Math.max(0.3, Math.min(1.0, 1.0 - quantVariance / (avgQuantY * avgQuantY)));

  return {
    estimatedQuality: Math.round(qualityEstimate),
    recommendedQuality: Math.round(recommendedQuality),
    isHighQuality,
    hasFineDetails,
    confidence,
    analysis: {
      avgQuantY: Math.round(avgQuantY * 100) / 100,
      avgQuantC: Math.round(avgQuantC * 100) / 100,
      maxQuantY,
      highFrequencyActivity: Math.round(highFrequencyActivity * 100) / 100,
      compressionRatio: Math.round(compressionRatio * 100) / 100,
    },
  };
}

/**
 * Adapt quantization tables to minimize artifacts during re-encoding
 * This preserves the visual characteristics of the original image
 */
export function adaptQuantizationTables(originalQuantTable: number[], targetQuality: number): number[] {
  if (originalQuantTable.length !== 64) {
    throw new Error('Quantization table must have 64 elements');
  }

  // Quality factor scaling (similar to JPEG standard)
  let scaleFactor: number;
  if (targetQuality >= 50) {
    scaleFactor = (100 - targetQuality) / 50;
  } else {
    scaleFactor = 50 / targetQuality;
  }

  // Apply scaling with bounds checking
  const adaptedTable = originalQuantTable.map(val => {
    const scaled = Math.round(val * scaleFactor);
    // Ensure values stay within valid JPEG quantization range
    return Math.max(1, Math.min(255, scaled));
  });

  return adaptedTable;
}

/**
 * Comprehensive quality optimization for steganography re-encoding
 */
export function optimizeQualityForSteganography(
  decoder: IJpegInternalDecoder,
  targetFileSize?: number
): {
  quality: number;
  quantizationTables: number[][];
  strategy: string;
  analysis: IQualityAnalysis;
} {
  const analysis = analyzeImageQuality(decoder);
  let quality = analysis.recommendedQuality;
  let strategy = 'adaptive';

  // Adjust for target file size if specified
  if (targetFileSize) {
    const currentSize = decoder.width * decoder.height * 3; // Rough estimate
    const targetRatio = targetFileSize / currentSize;

    if (targetRatio < 0.1) {
      quality = Math.max(30, quality - 20);
      strategy = 'size-optimized';
    } else if (targetRatio > 0.5) {
      quality = Math.min(95, quality + 10);
      strategy = 'quality-optimized';
    }
  }

  // Special handling for different image types
  if (analysis.hasFineDetails && analysis.isHighQuality) {
    quality = Math.min(90, quality + 5);
    strategy = 'detail-preserving';
  } else if (!analysis.isHighQuality && analysis.analysis.maxQuantY > 80) {
    quality = Math.max(25, quality - 5);
    strategy = 'artifact-minimizing';
  }

  // Adapt quantization tables
  const yComponent = decoder.components[0];
  const originalQuantY = yComponent.quantizationTable
    ? Array.from(yComponent.quantizationTable)
    : new Array(64).fill(1);

  const cComponent = decoder.components[1] || yComponent;
  const originalQuantC = cComponent.quantizationTable ? Array.from(cComponent.quantizationTable) : originalQuantY;

  const adaptedQuantY = adaptQuantizationTables(originalQuantY, quality);
  const adaptedQuantC = adaptQuantizationTables(originalQuantC, quality);

  return {
    quality: Math.round(quality),
    quantizationTables: [adaptedQuantY, adaptedQuantC],
    strategy,
    analysis,
  };
}
