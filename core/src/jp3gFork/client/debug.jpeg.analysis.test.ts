/* eslint-disable */
// @ts-nocheck
// Currently not working. Keeping around for future use.
import { readFileSync } from 'fs';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { describe, it } from 'vitest';
import jp3gFork from '../decoder/jp3gDecoder';
import { JPEGEncoder } from '../encoder/jp3gEncoder';
import type { IJpegInternalDecoder, IJpegDecoderComponent } from '../types/IJpegDecoder';

interface JpegAnalysisMetrics {
  filename: string;
  timestamp: string;
  fileSize: number;
  dimensions: { width: number; height: number };
  components: ComponentAnalysis[];
  quantizationAnalysis: QuantizationAnalysis;
  dctAnalysis: DCTAnalysis;
  qualityEstimate: number;
  compressionCharacteristics: CompressionCharacteristics;
}

interface ComponentAnalysis {
  componentIndex: number;
  blocksPerLine: number;
  blocksPerColumn: number;
  totalBlocks: number;
  scaleX: number;
  scaleY: number;
  quantizationTable: {
    values: number[];
    avgValue: number;
    maxValue: number;
    minValue: number;
    distribution: Record<string, number>;
  };
}

interface QuantizationAnalysis {
  luminanceTable: number[];
  chrominanceTable?: number[];
  qualityFactor: number;
  standardCompliance: {
    isStandardLuminance: boolean;
    isStandardChrominance: boolean;
    deviationScore: number;
  };
}

interface DCTAnalysis {
  coefficientDistribution: {
    zeroCoefficients: number;
    nonZeroCoefficients: number;
    positiveCoefficients: number;
    negativeCoefficients: number;
    frequencyBandActivity: number[]; // 8 frequency bands
  };
  energyDistribution: {
    dcEnergy: number;
    lowFreqEnergy: number;
    midFreqEnergy: number;
    highFreqEnergy: number;
  };
  modifications: {
    suitableCoefficients: number;
    coefficientsByMagnitude: Record<string, number>;
    perceptualWeights: number[];
  };
}

interface CompressionCharacteristics {
  estimatedOriginalQuality: number;
  compressionArtifacts: {
    blockingArtifacts: number;
    ringArtifacts: number;
    smoothnessIndex: number;
  };
  textureAnalysis: {
    hasHighTexture: boolean;
    hasSmoothedRegions: boolean;
    textureComplexity: number;
  };
  colorSpaceInfo: {
    hasYCbCr: boolean;
    subsamplingPattern: string;
    colorRange: 'full' | 'limited' | 'unknown';
  };
}

/**
 * Comprehensive JPEG format analysis for debugging steganography issues
 */
describe.skip('JPEG Format Analysis for Steganography Debugging', () => {
  const testImagesDir = join(__dirname, '../../../tests/images');
  const logsDir = join(__dirname, '../../../tests/logs');
  const testImages = [
    'BlackShoe.jpeg',
    'Engagement.jpeg',
    'GoatArt.jpeg',
    'GoatArt-min.jpeg',
    'RemarkablyBrightCreatures.jpg',
    'Selfie.jpg',
    'Stairs.JPG',
    'Stairs-min.JPG',
  ];

  it('should analyze all test images and log comprehensive metadata', () => {
    const allAnalysis: JpegAnalysisMetrics[] = [];

    for (const filename of testImages) {
      const filePath = join(testImagesDir, filename);
      const imageBuffer = readFileSync(filePath);

      console.log(`\n=== Analyzing ${filename} ===`);

      try {
        const decodedResult = jp3gFork(imageBuffer);
        const decoded = decodedResult.toObject();
        const analysis = analyzeJpegImage(filename, imageBuffer, decoded);
        allAnalysis.push(analysis);

        console.log(
          `✅ ${filename}: ${analysis.dimensions.width}x${analysis.dimensions.height}, Quality: ${analysis.qualityEstimate}%`
        );
        console.log(
          `   Components: ${analysis.components.length}, DCT Blocks: ${analysis.components[0]?.totalBlocks || 0}`
        );
        console.log(`   Suitable coefficients: ${analysis.dctAnalysis.modifications.suitableCoefficients}`);
      } catch (error) {
        console.error(`❌ Failed to analyze ${filename}:`, error);
      }
    }

    // Write comprehensive analysis to log file
    const logData = {
      analysisTimestamp: new Date().toISOString(),
      totalImagesAnalyzed: allAnalysis.length,
      images: allAnalysis,
      summary: generateAnalysisSummary(allAnalysis),
    };

    const logFilePath = join(logsDir, `jpeg-analysis-${Date.now()}.json`);
    writeFileSync(logFilePath, JSON.stringify(logData, null, 2));
    console.log(`\n📊 Analysis saved to: ${logFilePath}`);

    // Generate human-readable summary
    const summaryPath = join(logsDir, `jpeg-analysis-summary-${Date.now()}.md`);
    writeFileSync(summaryPath, generateMarkdownSummary(logData));
    console.log(`📄 Summary saved to: ${summaryPath}`);
  });

  it('should test re-encoding with different strategies', () => {
    const strategies = [
      { name: 'Conservative', quality: 95, preserveOriginal: true },
      { name: 'Balanced', quality: 85, preserveOriginal: false },
      { name: 'Aggressive', quality: 75, preserveOriginal: false },
      { name: 'Adaptive', quality: -1, preserveOriginal: true }, // -1 means auto-detect
    ];

    const reEncodingResults: any[] = [];

    for (const filename of testImages.slice(0, 3)) {
      // Test first 3 images
      const filePath = join(testImagesDir, filename);
      const originalBuffer = readFileSync(filePath);
      const originalDecodedResult = jp3gFork(originalBuffer);
      const originalDecoded = originalDecodedResult.toObject();

      console.log(`\n=== Re-encoding tests for ${filename} ===`);

      for (const strategy of strategies) {
        try {
          const targetQuality = strategy.quality === -1 ? estimateOriginalQuality(originalDecoded) : strategy.quality;

          // Note: Simplified for now - full encoder integration needed
          const encoder = new JPEGEncoder();
          // Skip actual re-encoding for this test
          const reDecoded = originalDecoded;

          const result = {
            filename,
            strategy: strategy.name,
            originalSize: originalBuffer.length,
            reEncodedSize: reEncoded.length,
            sizeChange: (((reEncoded.length - originalBuffer.length) / originalBuffer.length) * 100).toFixed(2),
            qualityUsed: targetQuality,
            quantizationChanges: analyzeQuantizationChanges(originalDecoded, reDecoded),
            dctChanges: analyzeDCTChanges(originalDecoded, reDecoded),
          };

          reEncodingResults.push(result);
          console.log(`  ${strategy.name}: Size ${result.sizeChange}%, Quality ${targetQuality}%`);
        } catch (error) {
          console.error(`  ❌ ${strategy.name} failed:`, error);
        }
      }
    }

    // Log re-encoding results
    const reEncodingLogPath = join(logsDir, `re-encoding-analysis-${Date.now()}.json`);
    writeFileSync(
      reEncodingLogPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          results: reEncodingResults,
        },
        null,
        2
      )
    );
    console.log(`\n📊 Re-encoding analysis saved to: ${reEncodingLogPath}`);
  });
});

function analyzeJpegImage(filename: string, buffer: Buffer, decoded: IJpegInternalDecoder): JpegAnalysisMetrics {
  return {
    filename,
    timestamp: new Date().toISOString(),
    fileSize: buffer.length,
    dimensions: {
      width: decoded.width,
      height: decoded.height,
    },
    components: decoded.components.map((comp, idx) => analyzeComponent(comp, idx)),
    quantizationAnalysis: analyzeQuantization(decoded),
    dctAnalysis: analyzeDCTCoefficients(decoded),
    qualityEstimate: estimateOriginalQuality(decoded),
    compressionCharacteristics: analyzeCompressionCharacteristics(decoded),
  };
}

function analyzeComponent(component: IJpegDecoderComponent, index: number): ComponentAnalysis {
  const quantTable = Array.from(component.quantizationTable || []);
  const distribution: Record<string, number> = {};

  quantTable.forEach(val => {
    const range = Math.floor(val / 10) * 10;
    distribution[`${range}-${range + 9}`] = (distribution[`${range}-${range + 9}`] || 0) + 1;
  });

  return {
    componentIndex: index,
    blocksPerLine: component.blocksPerLine || 0,
    blocksPerColumn: component.blocksPerColumn || 0,
    totalBlocks: (component.blocksPerLine || 0) * (component.blocksPerColumn || 0),
    scaleX: component.scaleX || 1,
    scaleY: component.scaleY || 1,
    quantizationTable: {
      values: quantTable,
      avgValue: quantTable.reduce((sum, val) => sum + val, 0) / quantTable.length,
      maxValue: Math.max(...quantTable),
      minValue: Math.min(...quantTable),
      distribution,
    },
  };
}

function analyzeQuantization(decoded: IJpegInternalDecoder): QuantizationAnalysis {
  const luminanceTable = Array.from(decoded.components[0]?.quantizationTable || []);
  const chrominanceTable = decoded.components[1]
    ? Array.from(decoded.components[1].quantizationTable || [])
    : undefined;

  // Standard JPEG quantization tables for comparison
  const standardLuminance = [
    16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51,
    87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101,
    72, 92, 95, 98, 112, 100, 103, 99,
  ];

  const qualityFactor = estimateQualityFromQuantization(luminanceTable);
  const deviationScore = calculateTableDeviation(luminanceTable, standardLuminance);

  return {
    luminanceTable,
    chrominanceTable,
    qualityFactor,
    standardCompliance: {
      isStandardLuminance: deviationScore < 0.1,
      isStandardChrominance: chrominanceTable
        ? calculateTableDeviation(chrominanceTable, standardLuminance) < 0.1
        : false,
      deviationScore,
    },
  };
}

function analyzeDCTCoefficients(decoded: IJpegInternalDecoder): DCTAnalysis {
  let zeroCoefficients = 0;
  let nonZeroCoefficients = 0;
  let positiveCoefficients = 0;
  let negativeCoefficients = 0;
  let suitableCoefficients = 0;

  const frequencyBandActivity = new Array(8).fill(0);
  const coefficientsByMagnitude: Record<string, number> = {};
  const perceptualWeights: number[] = [];

  let dcEnergy = 0;
  let lowFreqEnergy = 0;
  let midFreqEnergy = 0;
  let highFreqEnergy = 0;

  // Analyze luminance component (index 0)
  const component = decoded.components[0];
  const dctBlocks = component.dctBlocks || component.blocks || [];
  const quantTable = component.quantizationTable || [];

  for (const block of dctBlocks) {
    for (const row of block) {
      for (let i = 0; i < row.length; i++) {
        const coeff = row[i];
        const quantValue = quantTable[i] || 1;

        if (coeff === 0) {
          zeroCoefficients++;
        } else {
          nonZeroCoefficients++;
          if (coeff > 0) positiveCoefficients++;
          else negativeCoefficients++;

          // Magnitude distribution
          const magnitude = Math.abs(coeff);
          const magnitudeRange = magnitude < 10 ? `${magnitude}` : `${Math.floor(magnitude / 10) * 10}+`;
          coefficientsByMagnitude[magnitudeRange] = (coefficientsByMagnitude[magnitudeRange] || 0) + 1;

          // Frequency band analysis
          const bandIndex = Math.min(7, Math.floor(i / 8));
          frequencyBandActivity[bandIndex] += magnitude;

          // Energy distribution
          if (i === 0) dcEnergy += Math.pow(coeff, 2);
          else if (i < 16) lowFreqEnergy += Math.pow(coeff, 2);
          else if (i < 32) midFreqEnergy += Math.pow(coeff, 2);
          else highFreqEnergy += Math.pow(coeff, 2);

          // Perceptual weight calculation
          const perceptualWeight = calculatePerceptualWeight(i);
          perceptualWeights.push(perceptualWeight);

          // Suitability for steganography
          if (magnitude >= 2 && perceptualWeight > 10) {
            suitableCoefficients++;
          }
        }
      }
    }
  }

  return {
    coefficientDistribution: {
      zeroCoefficients,
      nonZeroCoefficients,
      positiveCoefficients,
      negativeCoefficients,
      frequencyBandActivity,
    },
    energyDistribution: {
      dcEnergy,
      lowFreqEnergy,
      midFreqEnergy,
      highFreqEnergy,
    },
    modifications: {
      suitableCoefficients,
      coefficientsByMagnitude,
      perceptualWeights,
    },
  };
}

function analyzeCompressionCharacteristics(decoded: IJpegInternalDecoder): CompressionCharacteristics {
  const estimatedQuality = estimateOriginalQuality(decoded);

  // Simple heuristics for compression artifacts
  const component = decoded.components[0];
  const quantTable = component.quantizationTable || [];
  const avgQuant = quantTable.reduce((sum, val) => sum + val, 0) / quantTable.length;

  return {
    estimatedOriginalQuality: estimatedQuality,
    compressionArtifacts: {
      blockingArtifacts: avgQuant > 20 ? (avgQuant - 20) / 30 : 0,
      ringArtifacts: Math.max(...quantTable) > 50 ? 0.7 : 0.3,
      smoothnessIndex: 1 - avgQuant / 100,
    },
    textureAnalysis: {
      hasHighTexture: calculateTextureComplexity(decoded) > 0.5,
      hasSmoothedRegions: avgQuant > 15,
      textureComplexity: calculateTextureComplexity(decoded),
    },
    colorSpaceInfo: {
      hasYCbCr: decoded.components.length === 3,
      subsamplingPattern: determineSubsamplingPattern(decoded),
      colorRange: 'unknown', // Would need more analysis
    },
  };
}

function estimateOriginalQuality(decoded: IJpegInternalDecoder): number {
  const quantTable = decoded.components[0]?.quantizationTable || [];
  if (quantTable.length === 0) return 50;

  const avgQuant = quantTable.reduce((sum, val) => sum + val, 0) / quantTable.length;

  // Quality estimation based on average quantization values
  if (avgQuant <= 1) return 100;
  if (avgQuant <= 2) return 95;
  if (avgQuant <= 4) return 90;
  if (avgQuant <= 8) return 85;
  if (avgQuant <= 16) return 75;
  if (avgQuant <= 32) return 60;
  if (avgQuant <= 64) return 40;
  return Math.max(10, 80 - avgQuant);
}

function estimateQualityFromQuantization(quantTable: number[]): number {
  // More sophisticated quality estimation
  const standardLuminance = [
    16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51,
    87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101,
    72, 92, 95, 98, 112, 100, 103, 99,
  ];

  if (quantTable.length !== 64) return 50;

  // Find the scale factor that best matches standard table
  let bestQuality = 50;
  let minError = Infinity;

  for (let quality = 1; quality <= 100; quality++) {
    const scaleFactor = quality < 50 ? 5000 / quality : 200 - 2 * quality;
    let error = 0;

    for (let i = 0; i < 64; i++) {
      const expectedValue = Math.max(1, Math.min(255, Math.round((standardLuminance[i] * scaleFactor) / 100)));
      error += Math.abs(quantTable[i] - expectedValue);
    }

    if (error < minError) {
      minError = error;
      bestQuality = quality;
    }
  }

  return bestQuality;
}

function calculateTableDeviation(table1: number[], table2: number[]): number {
  if (table1.length !== table2.length) return 1;

  let totalDiff = 0;
  let totalValue = 0;

  for (let i = 0; i < table1.length; i++) {
    totalDiff += Math.abs(table1[i] - table2[i]);
    totalValue += table2[i];
  }

  return totalDiff / totalValue;
}

function calculatePerceptualWeight(coefficientIndex: number): number {
  // Perceptual weighting based on zigzag order and frequency importance
  const zigzagOrder = [
    0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21,
    28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54,
    47, 55, 62, 63,
  ];

  const zigzagPosition = zigzagOrder.indexOf(coefficientIndex);
  if (zigzagPosition === -1) return 1;

  // Higher frequencies are less perceptually important
  return Math.max(1, zigzagPosition * 2);
}

function calculateTextureComplexity(decoded: IJpegInternalDecoder): number {
  const component = decoded.components[0];
  const dctBlocks = component.dctBlocks || component.blocks || [];

  if (dctBlocks.length === 0) return 0;

  let totalVariance = 0;
  let blockCount = 0;

  for (const block of dctBlocks.slice(0, 100)) {
    // Sample first 100 blocks
    for (const row of block) {
      const mean = row.reduce((sum, val) => sum + val, 0) / row.length;
      const variance = row.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / row.length;
      totalVariance += variance;
      blockCount++;
    }
  }

  const avgVariance = totalVariance / blockCount;
  return Math.min(1, avgVariance / 1000); // Normalize to 0-1 range
}

function determineSubsamplingPattern(decoded: IJpegInternalDecoder): string {
  if (decoded.components.length !== 3) return 'unknown';

  const y = decoded.components[0];
  const cb = decoded.components[1];
  const cr = decoded.components[2];

  if (y.scaleX === cb.scaleX && y.scaleY === cb.scaleY) return '4:4:4';
  if (y.scaleX === 2 && cb.scaleX === 1 && y.scaleY === cb.scaleY) return '4:2:2';
  if (y.scaleX === 2 && y.scaleY === 2 && cb.scaleX === 1 && cb.scaleY === 1) return '4:2:0';

  return `${y.scaleX}:${cb.scaleX}:${cr.scaleX}`;
}

function analyzeQuantizationChanges(original: IJpegInternalDecoder, reEncoded: IJpegInternalDecoder) {
  const origQuant = original.components[0]?.quantizationTable || [];
  const newQuant = reEncoded.components[0]?.quantizationTable || [];

  if (origQuant.length !== newQuant.length) {
    return { error: 'Quantization table size mismatch' };
  }

  let totalChange = 0;
  let maxChange = 0;
  const changes = [];

  for (let i = 0; i < origQuant.length; i++) {
    const change = Math.abs(origQuant[i] - newQuant[i]);
    changes.push(change);
    totalChange += change;
    maxChange = Math.max(maxChange, change);
  }

  return {
    totalChange,
    maxChange,
    avgChange: totalChange / origQuant.length,
    changes,
  };
}

function analyzeDCTChanges(original: IJpegInternalDecoder, reEncoded: IJpegInternalDecoder) {
  const origBlocks = original.components[0]?.dctBlocks || original.components[0]?.blocks || [];
  const newBlocks = reEncoded.components[0]?.dctBlocks || reEncoded.components[0]?.blocks || [];

  if (origBlocks.length === 0 || newBlocks.length === 0) {
    return { error: 'No DCT blocks available for comparison' };
  }

  let totalChanges = 0;
  let significantChanges = 0;
  let maxChange = 0;

  const sampleSize = Math.min(origBlocks.length, newBlocks.length, 50); // Sample first 50 blocks

  for (let blockIdx = 0; blockIdx < sampleSize; blockIdx++) {
    const origBlock = origBlocks[blockIdx];
    const newBlock = newBlocks[blockIdx];

    if (!origBlock || !newBlock) continue;

    for (let rowIdx = 0; rowIdx < Math.min(origBlock.length, newBlock.length); rowIdx++) {
      const origRow = origBlock[rowIdx];
      const newRow = newBlock[rowIdx];

      for (let i = 0; i < Math.min(origRow.length, newRow.length); i++) {
        const change = Math.abs(origRow[i] - newRow[i]);
        totalChanges += change;
        maxChange = Math.max(maxChange, change);

        if (change > 1) significantChanges++;
      }
    }
  }

  return {
    totalChanges,
    significantChanges,
    maxChange,
    avgChange: totalChanges / (sampleSize * 64), // Assuming 64 coefficients per block
    sampledBlocks: sampleSize,
  };
}

function generateAnalysisSummary(analyses: JpegAnalysisMetrics[]) {
  return {
    averageQuality: analyses.reduce((sum, a) => sum + a.qualityEstimate, 0) / analyses.length,
    qualityRange: {
      min: Math.min(...analyses.map(a => a.qualityEstimate)),
      max: Math.max(...analyses.map(a => a.qualityEstimate)),
    },
    averageFileSize: analyses.reduce((sum, a) => sum + a.fileSize, 0) / analyses.length,
    totalSuitableCoefficients: analyses.reduce((sum, a) => sum + a.dctAnalysis.modifications.suitableCoefficients, 0),
    imagesByQuality: {
      high: analyses.filter(a => a.qualityEstimate > 80).map(a => a.filename),
      medium: analyses.filter(a => a.qualityEstimate >= 60 && a.qualityEstimate <= 80).map(a => a.filename),
      low: analyses.filter(a => a.qualityEstimate < 60).map(a => a.filename),
    },
  };
}

function generateMarkdownSummary(logData: any): string {
  const { images, summary } = logData;

  return `# JPEG Analysis Summary

Generated: ${logData.analysisTimestamp}

## Overview
- **Total Images Analyzed**: ${logData.totalImagesAnalyzed}
- **Average Quality**: ${summary.averageQuality.toFixed(1)}%
- **Quality Range**: ${summary.qualityRange.min}% - ${summary.qualityRange.max}%
- **Average File Size**: ${(summary.averageFileSize / 1024).toFixed(1)} KB

## Images by Quality Category

### High Quality (>80%)
${summary.imagesByQuality.high.map((name: string) => `- ${name}`).join('\n')}

### Medium Quality (60-80%)
${summary.imagesByQuality.medium.map((name: string) => `- ${name}`).join('\n')}

### Low Quality (<60%)
${summary.imagesByQuality.low.map((name: string) => `- ${name}`).join('\n')}

## Detailed Analysis

${images
  .map(
    (img: JpegAnalysisMetrics) => `
### ${img.filename}
- **Dimensions**: ${img.dimensions.width}x${img.dimensions.height}
- **File Size**: ${(img.fileSize / 1024).toFixed(1)} KB
- **Estimated Quality**: ${img.qualityEstimate}%
- **Components**: ${img.components.length}
- **Suitable Coefficients**: ${img.dctAnalysis.modifications.suitableCoefficients}
- **Avg Quantization (Y)**: ${img.components[0]?.quantizationTable.avgValue.toFixed(1)}
- **Texture Complexity**: ${img.compressionCharacteristics.textureAnalysis.textureComplexity.toFixed(2)}
- **Subsampling**: ${img.compressionCharacteristics.colorSpaceInfo.subsamplingPattern}
`
  )
  .join('\n')}

## Recommendations

### For Steganography:
1. **Best Candidates**: ${summary.imagesByQuality.high.length > 0 ? summary.imagesByQuality.high.join(', ') : 'None identified'}
2. **Challenging Images**: ${summary.imagesByQuality.low.length > 0 ? summary.imagesByQuality.low.join(', ') : 'None identified'}

### Quality Issues Investigation:
- Check quantization table preservation for grey filter issues
- Verify color space handling (YCbCr vs RGB)
- Analyze subsampling pattern consistency
- Review DCT coefficient modification strategy
`;
}
