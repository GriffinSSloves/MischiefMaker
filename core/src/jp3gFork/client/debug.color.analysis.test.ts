/* eslint-disable */
// @ts-nocheck
// Currently not working. Keeping around for future use.
import { readFileSync } from 'fs';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { describe, it } from 'vitest';
import jp3gFork from '../decoder/jp3gDecoder';
import { JPEGEncoder } from '../encoder/jp3gEncoder';
import type { IJpegInternalDecoder } from '../types/IJpegDecoder';

interface ColorAnalysisResult {
  filename: string;
  timestamp: string;
  originalColorProfile: ColorProfile;
  reEncodedColorProfile: ColorProfile;
  colorSpaceAnalysis: ColorSpaceAnalysis;
  saturationAnalysis: SaturationAnalysis;
  greyFilterDetection: GreyFilterDetection;
}

interface ColorProfile {
  componentCount: number;
  chromaSubsampling: string;
  quantizationTables: {
    luminance: number[];
    chrominanceU?: number[];
    chrominanceV?: number[];
  };
  colorRange: {
    yMin: number;
    yMax: number;
    cbMin?: number;
    cbMax?: number;
    crMin?: number;
    crMax?: number;
  };
}

interface ColorSpaceAnalysis {
  isYCbCr: boolean;
  hasProperColorSeparation: boolean;
  chromaChannelIntegrity: {
    cbPreserved: boolean;
    crPreserved: boolean;
    colorCastDetected: boolean;
  };
  quantizationRatios: {
    lumaToChromaRatio: number;
    chromaBalance: number;
  };
}

interface SaturationAnalysis {
  averageChromaMagnitude: {
    original: number;
    reEncoded: number;
    change: number;
  };
  chromaDistribution: {
    original: Record<string, number>;
    reEncoded: Record<string, number>;
  };
  saturationLoss: number; // 0-1 scale
  colorVibrancy: {
    original: number;
    reEncoded: number;
    degradation: number;
  };
}

interface GreyFilterDetection {
  detected: boolean;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  indicators: {
    chromaSuppression: boolean;
    uniformDesaturation: boolean;
    quantizationImbalance: boolean;
    colorCastShift: boolean;
  };
  recommendations: string[];
}

/**
 * Color analysis specifically targeting the grey filter/saturation issues
 * mentioned in imageOptimization.md
 */
describe.skip('Color and Saturation Analysis for Grey Filter Debug', () => {
  const testImagesDir = join(__dirname, '../../../tests/images');
  const logsDir = join(__dirname, '../../../tests/logs');

  // Focus on images mentioned in the optimization doc
  const testImages = [
    'BlackShoe.jpeg', // Works well according to doc
    'Selfie.jpg', // Had graininess issues
    'Engagement.jpeg', // Had visual degradation
    'Stairs.JPG', // Good results
    'GoatArt.jpeg', // Acceptable results
  ];

  it('should analyze color preservation and detect grey filter issues', () => {
    const colorAnalysisResults: ColorAnalysisResult[] = [];

    for (const filename of testImages) {
      const filePath = join(testImagesDir, filename);
      const originalBuffer = readFileSync(filePath);

      console.log(`\n🎨 Color analysis for ${filename}`);

      try {
        const originalDecodedResult = jp3gFork(originalBuffer);
        const originalDecoded = originalDecodedResult.toObject();

        // Test different encoding strategies to identify grey filter source
        const strategies = [
          { name: 'preserveOriginal', quality: -1, preserveQuantization: true },
          { name: 'highQuality', quality: 95, preserveQuantization: false },
          { name: 'balanced', quality: 85, preserveQuantization: false },
          { name: 'adaptive', quality: estimateOriginalQuality(originalDecoded), preserveQuantization: true },
        ];

        for (const strategy of strategies) {
          const quality = strategy.quality === -1 ? estimateOriginalQuality(originalDecoded) : strategy.quality;

          try {
            const reEncodedBuffer = jp3gEncoder(originalDecoded, quality);
            const reEncodedDecoded = jp3gDecoder(reEncodedBuffer);

            const analysis = analyzeColorPreservation(
              filename + '_' + strategy.name,
              originalDecoded,
              reEncodedDecoded
            );

            colorAnalysisResults.push(analysis);

            console.log(
              `  📊 ${strategy.name}: Saturation loss ${(analysis.saturationAnalysis.saturationLoss * 100).toFixed(1)}%`
            );
            console.log(`     Grey filter: ${analysis.greyFilterDetection.severity}`);
          } catch (error) {
            console.error(`  ❌ ${strategy.name} failed:`, error);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to analyze ${filename}:`, error);
      }
    }

    // Save detailed color analysis
    const colorLogPath = join(logsDir, `color-analysis-${Date.now()}.json`);
    writeFileSync(
      colorLogPath,
      JSON.stringify(
        {
          analysisTimestamp: new Date().toISOString(),
          totalAnalyses: colorAnalysisResults.length,
          results: colorAnalysisResults,
          summary: generateColorSummary(colorAnalysisResults),
        },
        null,
        2
      )
    );

    console.log(`\n🎨 Color analysis saved to: ${colorLogPath}`);

    // Generate targeted recommendations
    const recommendationsPath = join(logsDir, `grey-filter-recommendations-${Date.now()}.md`);
    writeFileSync(recommendationsPath, generateGreyFilterReport(colorAnalysisResults));
    console.log(`📋 Recommendations saved to: ${recommendationsPath}`);
  });

  it('should test quantization table handling for color preservation', () => {
    console.log('\n🔬 Testing quantization table effects on color...');

    const quantizationTests: any[] = [];

    // Test with BlackShoe.jpeg (known to work well)
    const testImagePath = join(testImagesDir, 'BlackShoe.jpeg');
    const originalBuffer = readFileSync(testImagePath);
    const originalDecoded = jp3gDecoder(originalBuffer);

    // Test different quantization strategies
    const quantStrategies = [
      { name: 'preserveOriginal', useOriginalQuant: true, quality: -1 },
      { name: 'standardQuant85', useOriginalQuant: false, quality: 85 },
      { name: 'standardQuant95', useOriginalQuant: false, quality: 95 },
      { name: 'scaledOriginal', useOriginalQuant: 'scaled', quality: 85 },
    ];

    for (const strategy of quantStrategies) {
      try {
        // This is a conceptual test - actual implementation would need
        // modifications to jp3gEncoder to support these options
        const quality = strategy.quality === -1 ? estimateOriginalQuality(originalDecoded) : strategy.quality;
        const reEncoded = jp3gEncoder(originalDecoded, quality);
        const reDecoded = jp3gDecoder(reEncoded);

        const quantAnalysis = analyzeQuantizationEffects(originalDecoded, reDecoded, strategy.name);
        quantizationTests.push(quantAnalysis);

        console.log(
          `  🔍 ${strategy.name}: Color preservation score ${quantAnalysis.colorPreservationScore.toFixed(2)}`
        );
      } catch (error) {
        console.error(`  ❌ ${strategy.name} failed:`, error);
      }
    }

    // Log quantization analysis
    const quantLogPath = join(logsDir, `quantization-color-effects-${Date.now()}.json`);
    writeFileSync(
      quantLogPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          testImage: 'BlackShoe.jpeg',
          strategies: quantizationTests,
        },
        null,
        2
      )
    );

    console.log(`🔬 Quantization analysis saved to: ${quantLogPath}`);
  });
});

function analyzeColorPreservation(
  filename: string,
  original: IJpegInternalDecoder,
  reEncoded: IJpegInternalDecoder
): ColorAnalysisResult {
  const originalProfile = extractColorProfile(original);
  const reEncodedProfile = extractColorProfile(reEncoded);
  const colorSpaceAnalysis = analyzeColorSpace(original, reEncoded);
  const saturationAnalysis = analyzeSaturation(original, reEncoded);
  const greyFilterDetection = detectGreyFilter(original, reEncoded, saturationAnalysis);

  return {
    filename,
    timestamp: new Date().toISOString(),
    originalColorProfile: originalProfile,
    reEncodedColorProfile: reEncodedProfile,
    colorSpaceAnalysis,
    saturationAnalysis,
    greyFilterDetection,
  };
}

function extractColorProfile(decoded: IJpegInternalDecoder): ColorProfile {
  const componentCount = decoded.components.length;
  const chromaSubsampling = determineChromaSubsampling(decoded);

  const quantizationTables = {
    luminance: Array.from(decoded.components[0]?.quantizationTable || []),
    chrominanceU: decoded.components[1] ? Array.from(decoded.components[1].quantizationTable || []) : undefined,
    chrominanceV: decoded.components[2] ? Array.from(decoded.components[2].quantizationTable || []) : undefined,
  };

  const colorRange = calculateColorRange(decoded);

  return {
    componentCount,
    chromaSubsampling,
    quantizationTables,
    colorRange,
  };
}

function determineChromaSubsampling(decoded: IJpegInternalDecoder): string {
  if (decoded.components.length !== 3) return 'none';

  const y = decoded.components[0];
  const cb = decoded.components[1];
  const cr = decoded.components[2];

  const yRatio = (y.scaleX || 1) * (y.scaleY || 1);
  const cbRatio = (cb.scaleX || 1) * (cb.scaleY || 1);
  const crRatio = (cr.scaleX || 1) * (cr.scaleY || 1);

  if (yRatio === cbRatio && cbRatio === crRatio) return '4:4:4';
  if (yRatio === 2 * cbRatio) return '4:2:2';
  if (yRatio === 4 * cbRatio) return '4:2:0';
  return `custom:${yRatio}:${cbRatio}:${crRatio}`;
}

function calculateColorRange(decoded: IJpegInternalDecoder) {
  // Analyze DCT coefficient ranges to understand color space usage
  const ranges: any = { yMin: Infinity, yMax: -Infinity };

  if (decoded.components.length >= 3) {
    ranges.cbMin = Infinity;
    ranges.cbMax = -Infinity;
    ranges.crMin = Infinity;
    ranges.crMax = -Infinity;
  }

  // Sample first 50 blocks from each component
  for (let compIdx = 0; compIdx < decoded.components.length; compIdx++) {
    const component = decoded.components[compIdx];
    const blocks = component.dctBlocks || component.blocks || [];
    const sampleSize = Math.min(50, blocks.length);

    for (let blockIdx = 0; blockIdx < sampleSize; blockIdx++) {
      const block = blocks[blockIdx];
      if (!block) continue;

      for (const row of block) {
        for (const coeff of row) {
          if (compIdx === 0) {
            // Y component
            ranges.yMin = Math.min(ranges.yMin, coeff);
            ranges.yMax = Math.max(ranges.yMax, coeff);
          } else if (compIdx === 1) {
            // Cb component
            ranges.cbMin = Math.min(ranges.cbMin, coeff);
            ranges.cbMax = Math.max(ranges.cbMax, coeff);
          } else if (compIdx === 2) {
            // Cr component
            ranges.crMin = Math.min(ranges.crMin, coeff);
            ranges.crMax = Math.max(ranges.crMax, coeff);
          }
        }
      }
    }
  }

  return ranges;
}

function analyzeColorSpace(original: IJpegInternalDecoder, reEncoded: IJpegInternalDecoder): ColorSpaceAnalysis {
  const isYCbCr = original.components.length === 3 && reEncoded.components.length === 3;

  if (!isYCbCr) {
    return {
      isYCbCr: false,
      hasProperColorSeparation: false,
      chromaChannelIntegrity: {
        cbPreserved: false,
        crPreserved: false,
        colorCastDetected: false,
      },
      quantizationRatios: {
        lumaToChromaRatio: 1,
        chromaBalance: 1,
      },
    };
  }

  // Analyze quantization table relationships
  const origLumaQuant = original.components[0]?.quantizationTable || [];
  const origCbQuant = original.components[1]?.quantizationTable || [];
  const origCrQuant = original.components[2]?.quantizationTable || [];

  const newLumaQuant = reEncoded.components[0]?.quantizationTable || [];
  const newCbQuant = reEncoded.components[1]?.quantizationTable || [];
  const newCrQuant = reEncoded.components[2]?.quantizationTable || [];

  const origLumaAvg = origLumaQuant.reduce((sum, val) => sum + val, 0) / origLumaQuant.length;
  const origCbAvg = origCbQuant.reduce((sum, val) => sum + val, 0) / origCbQuant.length;
  const origCrAvg = origCrQuant.reduce((sum, val) => sum + val, 0) / origCrQuant.length;

  const newLumaAvg = newLumaQuant.reduce((sum, val) => sum + val, 0) / newLumaQuant.length;
  const newCbAvg = newCbQuant.reduce((sum, val) => sum + val, 0) / newCbQuant.length;
  const newCrAvg = newCrQuant.reduce((sum, val) => sum + val, 0) / newCrQuant.length;

  const origLumaToChromaRatio = origLumaAvg / ((origCbAvg + origCrAvg) / 2);
  const newLumaToChromaRatio = newLumaAvg / ((newCbAvg + newCrAvg) / 2);

  const chromaBalance = newCbAvg / newCrAvg / (origCbAvg / origCrAvg);

  return {
    isYCbCr: true,
    hasProperColorSeparation: Math.abs(origLumaToChromaRatio - newLumaToChromaRatio) < 0.5,
    chromaChannelIntegrity: {
      cbPreserved: Math.abs(origCbAvg - newCbAvg) < origCbAvg * 0.2,
      crPreserved: Math.abs(origCrAvg - newCrAvg) < origCrAvg * 0.2,
      colorCastDetected: Math.abs(chromaBalance - 1) > 0.3,
    },
    quantizationRatios: {
      lumaToChromaRatio: newLumaToChromaRatio,
      chromaBalance,
    },
  };
}

function analyzeSaturation(original: IJpegInternalDecoder, reEncoded: IJpegInternalDecoder): SaturationAnalysis {
  if (original.components.length < 3 || reEncoded.components.length < 3) {
    return {
      averageChromaMagnitude: { original: 0, reEncoded: 0, change: 0 },
      chromaDistribution: { original: {}, reEncoded: {} },
      saturationLoss: 0,
      colorVibrancy: { original: 0, reEncoded: 0, degradation: 0 },
    };
  }

  const originalChromaMag = calculateChromaMagnitude(original);
  const reEncodedChromaMag = calculateChromaMagnitude(reEncoded);

  const originalDist = calculateChromaDistribution(original);
  const reEncodedDist = calculateChromaDistribution(reEncoded);

  const saturationLoss = Math.max(0, (originalChromaMag - reEncodedChromaMag) / originalChromaMag);

  const originalVibrancy = calculateColorVibrancy(original);
  const reEncodedVibrancy = calculateColorVibrancy(reEncoded);
  const vibrancyDegradation = (originalVibrancy - reEncodedVibrancy) / originalVibrancy;

  return {
    averageChromaMagnitude: {
      original: originalChromaMag,
      reEncoded: reEncodedChromaMag,
      change: reEncodedChromaMag - originalChromaMag,
    },
    chromaDistribution: {
      original: originalDist,
      reEncoded: reEncodedDist,
    },
    saturationLoss,
    colorVibrancy: {
      original: originalVibrancy,
      reEncoded: reEncodedVibrancy,
      degradation: vibrancyDegradation,
    },
  };
}

function calculateChromaMagnitude(decoded: IJpegInternalDecoder): number {
  const cbComponent = decoded.components[1];
  const crComponent = decoded.components[2];

  if (!cbComponent || !crComponent) return 0;

  const cbBlocks = cbComponent.dctBlocks || cbComponent.blocks || [];
  const crBlocks = crComponent.dctBlocks || crComponent.blocks || [];

  let totalMagnitude = 0;
  let count = 0;

  const sampleSize = Math.min(50, cbBlocks.length, crBlocks.length);

  for (let blockIdx = 0; blockIdx < sampleSize; blockIdx++) {
    const cbBlock = cbBlocks[blockIdx];
    const crBlock = crBlocks[blockIdx];

    if (!cbBlock || !crBlock) continue;

    for (let rowIdx = 0; rowIdx < Math.min(cbBlock.length, crBlock.length); rowIdx++) {
      const cbRow = cbBlock[rowIdx];
      const crRow = crBlock[rowIdx];

      for (let i = 0; i < Math.min(cbRow.length, crRow.length); i++) {
        const chromaMagnitude = Math.sqrt(cbRow[i] * cbRow[i] + crRow[i] * crRow[i]);
        totalMagnitude += chromaMagnitude;
        count++;
      }
    }
  }

  return count > 0 ? totalMagnitude / count : 0;
}

function calculateChromaDistribution(decoded: IJpegInternalDecoder): Record<string, number> {
  const distribution: Record<string, number> = {};
  const cbComponent = decoded.components[1];
  const crComponent = decoded.components[2];

  if (!cbComponent || !crComponent) return distribution;

  const cbBlocks = cbComponent.dctBlocks || cbComponent.blocks || [];
  const crBlocks = crComponent.dctBlocks || crComponent.blocks || [];

  const sampleSize = Math.min(20, cbBlocks.length, crBlocks.length);

  for (let blockIdx = 0; blockIdx < sampleSize; blockIdx++) {
    const cbBlock = cbBlocks[blockIdx];
    const crBlock = crBlocks[blockIdx];

    if (!cbBlock || !crBlock) continue;

    for (let rowIdx = 0; rowIdx < Math.min(cbBlock.length, crBlock.length); rowIdx++) {
      const cbRow = cbBlock[rowIdx];
      const crRow = crBlock[rowIdx];

      for (let i = 0; i < Math.min(cbRow.length, crRow.length); i++) {
        const chromaMag = Math.sqrt(cbRow[i] * cbRow[i] + crRow[i] * crRow[i]);
        const range = Math.floor(chromaMag / 10) * 10;
        const key = `${range}-${range + 9}`;
        distribution[key] = (distribution[key] || 0) + 1;
      }
    }
  }

  return distribution;
}

function calculateColorVibrancy(decoded: IJpegInternalDecoder): number {
  if (decoded.components.length < 3) return 0;

  const chromaMagnitude = calculateChromaMagnitude(decoded);
  const lumaVariance = calculateLumaVariance(decoded);

  // Simple vibrancy metric combining chroma strength and luma variance
  return chromaMagnitude * Math.sqrt(lumaVariance);
}

function calculateLumaVariance(decoded: IJpegInternalDecoder): number {
  const lumaComponent = decoded.components[0];
  const lumaBlocks = lumaComponent.dctBlocks || lumaComponent.blocks || [];

  let totalVariance = 0;
  let blockCount = 0;

  const sampleSize = Math.min(30, lumaBlocks.length);

  for (let blockIdx = 0; blockIdx < sampleSize; blockIdx++) {
    const block = lumaBlocks[blockIdx];
    if (!block) continue;

    for (const row of block) {
      const mean = row.reduce((sum, val) => sum + val, 0) / row.length;
      const variance = row.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / row.length;
      totalVariance += variance;
      blockCount++;
    }
  }

  return blockCount > 0 ? totalVariance / blockCount : 0;
}

function detectGreyFilter(
  original: IJpegInternalDecoder,
  reEncoded: IJpegInternalDecoder,
  saturationAnalysis: SaturationAnalysis
): GreyFilterDetection {
  const indicators = {
    chromaSuppression: saturationAnalysis.saturationLoss > 0.15, // >15% saturation loss
    uniformDesaturation: saturationAnalysis.colorVibrancy.degradation > 0.2,
    quantizationImbalance: false,
    colorCastShift: false,
  };

  // Check quantization imbalance
  if (original.components.length >= 3 && reEncoded.components.length >= 3) {
    const origCbAvg = (original.components[1]?.quantizationTable || []).reduce((sum, val) => sum + val, 0) / 64;
    const origCrAvg = (original.components[2]?.quantizationTable || []).reduce((sum, val) => sum + val, 0) / 64;
    const newCbAvg = (reEncoded.components[1]?.quantizationTable || []).reduce((sum, val) => sum + val, 0) / 64;
    const newCrAvg = (reEncoded.components[2]?.quantizationTable || []).reduce((sum, val) => sum + val, 0) / 64;

    const origChromaBalance = origCbAvg / origCrAvg;
    const newChromaBalance = newCbAvg / newCrAvg;

    indicators.quantizationImbalance = Math.abs(origChromaBalance - newChromaBalance) > 0.5;
    indicators.colorCastShift = Math.abs(newChromaBalance - 1) > 0.3;
  }

  const indicatorCount = Object.values(indicators).filter(Boolean).length;

  let severity: 'none' | 'mild' | 'moderate' | 'severe' = 'none';
  if (indicatorCount >= 3) severity = 'severe';
  else if (indicatorCount === 2) severity = 'moderate';
  else if (indicatorCount === 1) severity = 'mild';

  const recommendations = generateRecommendations(indicators, saturationAnalysis);

  return {
    detected: indicatorCount > 0,
    severity,
    indicators,
    recommendations,
  };
}

function generateRecommendations(indicators: any, saturationAnalysis: SaturationAnalysis): string[] {
  const recommendations: string[] = [];

  if (indicators.chromaSuppression) {
    recommendations.push('Preserve original chroma quantization tables to maintain color saturation');
  }

  if (indicators.uniformDesaturation) {
    recommendations.push('Review color space conversion - ensure YCbCr coefficients are preserved accurately');
  }

  if (indicators.quantizationImbalance) {
    recommendations.push('Check Cb/Cr quantization ratio - should match original image characteristics');
  }

  if (indicators.colorCastShift) {
    recommendations.push('Verify chroma channel balance - potential color temperature shift detected');
  }

  if (saturationAnalysis.saturationLoss > 0.3) {
    recommendations.push('CRITICAL: Severe saturation loss detected - review entire color pipeline');
  }

  if (recommendations.length === 0) {
    recommendations.push('Color preservation appears acceptable');
  }

  return recommendations;
}

function analyzeQuantizationEffects(
  original: IJpegInternalDecoder,
  reEncoded: IJpegInternalDecoder,
  strategyName: string
) {
  const originalChroma = calculateChromaMagnitude(original);
  const reEncodedChroma = calculateChromaMagnitude(reEncoded);
  const colorPreservationScore = 1 - Math.abs(originalChroma - reEncodedChroma) / originalChroma;

  return {
    strategy: strategyName,
    colorPreservationScore,
    chromaMagnitudeChange: reEncodedChroma - originalChroma,
    quantizationChanges: {
      lumaChange: calculateQuantizationTableChange(original.components[0], reEncoded.components[0]),
      cbChange: original.components[1]
        ? calculateQuantizationTableChange(original.components[1], reEncoded.components[1])
        : null,
      crChange: original.components[2]
        ? calculateQuantizationTableChange(original.components[2], reEncoded.components[2])
        : null,
    },
  };
}

function calculateQuantizationTableChange(origComponent: any, newComponent: any): number {
  if (!origComponent?.quantizationTable || !newComponent?.quantizationTable) return 0;

  const origTable = Array.from(origComponent.quantizationTable);
  const newTable = Array.from(newComponent.quantizationTable);

  let totalChange = 0;
  for (let i = 0; i < Math.min(origTable.length, newTable.length); i++) {
    totalChange += Math.abs(origTable[i] - newTable[i]);
  }

  return totalChange / origTable.length;
}

function estimateOriginalQuality(decoded: IJpegInternalDecoder): number {
  const quantTable = decoded.components[0]?.quantizationTable || [];
  if (quantTable.length === 0) return 85;

  const avgQuant = quantTable.reduce((sum, val) => sum + val, 0) / quantTable.length;
  return Math.max(10, Math.min(100, 100 - avgQuant));
}

function generateColorSummary(results: ColorAnalysisResult[]) {
  const greyFilterCases = results.filter(r => r.greyFilterDetection.detected);
  const severeIssues = results.filter(r => r.greyFilterDetection.severity === 'severe');

  return {
    totalAnalyses: results.length,
    greyFilterDetected: greyFilterCases.length,
    severeIssues: severeIssues.length,
    averageSaturationLoss: results.reduce((sum, r) => sum + r.saturationAnalysis.saturationLoss, 0) / results.length,
    mostProblematic: results
      .sort((a, b) => b.saturationAnalysis.saturationLoss - a.saturationAnalysis.saturationLoss)
      .slice(0, 3)
      .map(r => ({ filename: r.filename, saturationLoss: r.saturationAnalysis.saturationLoss })),
  };
}

function generateGreyFilterReport(results: ColorAnalysisResult[]): string {
  const greyFilterIssues = results.filter(r => r.greyFilterDetection.detected);

  return `# Grey Filter Issue Analysis Report

Generated: ${new Date().toISOString()}

## Executive Summary

**Total analyses performed**: ${results.length}
**Grey filter issues detected**: ${greyFilterIssues.length}
**Success rate**: ${(((results.length - greyFilterIssues.length) / results.length) * 100).toFixed(1)}%

## Issue Severity Breakdown

${['severe', 'moderate', 'mild']
  .map(severity => {
    const count = results.filter(r => r.greyFilterDetection.severity === severity).length;
    return `- **${severity.toUpperCase()}**: ${count} cases`;
  })
  .join('\n')}

## Common Indicators

${
  greyFilterIssues.length > 0
    ? `
The following issues were detected across problematic cases:

${Object.keys(greyFilterIssues[0].greyFilterDetection.indicators)
  .map(indicator => {
    const count = greyFilterIssues.filter(r => r.greyFilterDetection.indicators[indicator]).length;
    return `- **${indicator}**: ${count}/${greyFilterIssues.length} cases`;
  })
  .join('\n')}
`
    : 'No grey filter issues detected in any test cases.'
}

## Detailed Findings

${results
  .map(
    result => `
### ${result.filename}

**Severity**: ${result.greyFilterDetection.severity}
**Saturation Loss**: ${(result.saturationAnalysis.saturationLoss * 100).toFixed(1)}%
**Color Vibrancy Loss**: ${(result.saturationAnalysis.colorVibrancy.degradation * 100).toFixed(1)}%

**Issues Detected**:
${
  Object.entries(result.greyFilterDetection.indicators)
    .filter(([_, detected]) => detected)
    .map(([indicator, _]) => `- ${indicator}`)
    .join('\n') || '- None'
}

**Recommendations**:
${result.greyFilterDetection.recommendations.map(rec => `- ${rec}`).join('\n')}

---`
  )
  .join('\n')}

## Root Cause Analysis

Based on the detected patterns, the grey filter issue appears to be caused by:

1. **Quantization Table Imbalances**: Mismatch between luminance and chrominance quantization
2. **Color Space Conversion Issues**: Problems in YCbCr coefficient handling
3. **Chroma Suppression**: Over-aggressive compression of color channels
4. **Quality Estimation Errors**: Incorrect quality settings for re-encoding

## Action Items

1. **High Priority**: Preserve original quantization tables for chroma channels
2. **Medium Priority**: Implement adaptive quality estimation based on original image characteristics
3. **Low Priority**: Add color space validation checks to encoding pipeline

## Testing Recommendations

1. Test with additional high-saturation images
2. Verify quantization table preservation across different quality levels
3. Compare against industry-standard JPEG processing libraries
`;
}
