/* eslint-disable */
import { readFileSync } from 'fs';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { describe, it } from 'vitest';
import jp3gFork from '../decoder/jp3gDecoder';
import { nodeBufferAdapter } from '../../utils/NodeBufferAdapter';
import type { IJpegInternalDecoder, IJpegDecoderComponent } from '../types/IJpegDecoder';

interface JpegMetadata {
  filename: string;
  timestamp: string;
  fileSize: number;
  dimensions: { width: number; height: number };
  components: ComponentMetadata[];
  quantizationAnalysis: QuantizationData;
  dctAnalysis: DCTData;
  qualityEstimate: number;
  colorSpaceInfo: ColorSpaceData;
}

interface ComponentMetadata {
  componentIndex: number;
  blocksPerLine: number;
  blocksPerColumn: number;
  totalBlocks: number;
  scaleX: number;
  scaleY: number;
  quantizationStats: {
    avgValue: number;
    maxValue: number;
    minValue: number;
    distribution: Record<string, number>;
  };
}

interface QuantizationData {
  luminanceTable: number[];
  chrominanceUTable?: number[];
  chrominanceVTable?: number[];
  qualityEstimate: number;
  standardDeviation: number;
}

interface DCTData {
  coefficientStats: {
    totalCoefficients: number;
    zeroCoefficients: number;
    nonZeroCoefficients: number;
    positiveCoefficients: number;
    negativeCoefficients: number;
  };
  frequencyDistribution: number[];
  energyDistribution: {
    dcEnergy: number;
    lowFreqEnergy: number;
    midFreqEnergy: number;
    highFreqEnergy: number;
  };
  suitabilityForSteganography: {
    suitableCoefficients: number;
    totalCapacity: number;
    capacityPercentage: number;
  };
}

interface ColorSpaceData {
  componentCount: number;
  chromaSubsampling: string;
  estimatedColorSpace: 'YCbCr' | 'RGB' | 'Grayscale' | 'Unknown';
  chromaChannelActivity: {
    cbActivity: number;
    crActivity: number;
  };
}

/**
 * JPEG metadata analysis for debugging format variations and steganography suitability
 */
describe.skip('JPEG Metadata Analysis for Format Debugging', () => {
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

  it('should analyze JPEG metadata and identify format variations', () => {
    const metadataResults: JpegMetadata[] = [];

    console.log('\n🔍 Starting JPEG metadata analysis...');

    for (const filename of testImages) {
      const filePath = join(testImagesDir, filename);

      try {
        const imageBuffer = readFileSync(filePath);
        const decodedResult = jp3gFork(imageBuffer, nodeBufferAdapter);
        const decoded = decodedResult.toObject();
        const metadata = analyzeJpegMetadata(filename, imageBuffer, decoded);
        metadataResults.push(metadata);

        console.log(`\n📋 ${filename}:`);
        console.log(
          `   Size: ${(metadata.fileSize / 1024).toFixed(1)}KB, ${metadata.dimensions.width}x${metadata.dimensions.height}`
        );
        console.log(`   Quality: ${metadata.qualityEstimate}%, Components: ${metadata.components.length}`);
        console.log(`   Chroma Subsampling: ${metadata.colorSpaceInfo.chromaSubsampling}`);
        console.log(
          `   Steganography Capacity: ${metadata.dctAnalysis.suitabilityForSteganography.suitableCoefficients} coefficients`
        );
      } catch (error) {
        console.error(`❌ Failed to analyze ${filename}:`, error);
      }
    }

    // Write comprehensive metadata log
    const metadataLogPath = join(logsDir, `jpeg-metadata-${Date.now()}.json`);
    writeFileSync(
      metadataLogPath,
      JSON.stringify(
        {
          analysisTimestamp: new Date().toISOString(),
          totalImages: metadataResults.length,
          images: metadataResults,
          summary: generateMetadataSummary(metadataResults),
        },
        null,
        2
      )
    );

    console.log(`\n📊 Metadata analysis saved to: ${metadataLogPath}`);

    // Generate format comparison report
    const reportPath = join(logsDir, `jpeg-format-report-${Date.now()}.md`);
    writeFileSync(reportPath, generateFormatReport(metadataResults));
    console.log(`📄 Format report saved to: ${reportPath}`);
  });

  it('should identify potential causes of grey filter issues', () => {
    console.log('\n🎨 Analyzing potential grey filter causes...');

    const greyFilterAnalysis: any[] = [];

    // Focus on images mentioned in the optimization doc
    const problematicImages = ['Selfie.jpg', 'Engagement.jpeg'];
    const workingImages = ['BlackShoe.jpeg', 'Stairs.JPG'];

    const analyzeImageSet = (imageSet: string[], label: string) => {
      console.log(`\n--- Analyzing ${label} ---`);

      for (const filename of imageSet) {
        const filePath = join(testImagesDir, filename);

        try {
          const imageBuffer = readFileSync(filePath);
          const decodedResult = jp3gFork(imageBuffer, nodeBufferAdapter);
          const decoded = decodedResult.toObject();
          const analysis = analyzeGreyFilterRisk(filename, decoded);
          greyFilterAnalysis.push({ ...analysis, category: label });

          console.log(`📊 ${filename}:`);
          console.log(`   Grey Filter Risk: ${analysis.riskLevel}`);
          console.log(`   Key Factors: ${analysis.riskFactors.join(', ')}`);
        } catch (error) {
          console.error(`❌ Failed to analyze ${filename}:`, error);
        }
      }
    };

    analyzeImageSet(problematicImages, 'Problematic');
    analyzeImageSet(workingImages, 'Working');

    // Log grey filter analysis
    const greyFilterLogPath = join(logsDir, `grey-filter-analysis-${Date.now()}.json`);
    writeFileSync(
      greyFilterLogPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          analysis: greyFilterAnalysis,
          recommendations: generateGreyFilterRecommendations(greyFilterAnalysis),
        },
        null,
        2
      )
    );

    console.log(`\n🎨 Grey filter analysis saved to: ${greyFilterLogPath}`);
  });
});

function analyzeJpegMetadata(filename: string, buffer: Buffer, decoded: IJpegInternalDecoder): JpegMetadata {
  return {
    filename,
    timestamp: new Date().toISOString(),
    fileSize: buffer.length,
    dimensions: {
      width: decoded.width,
      height: decoded.height,
    },
    components: decoded.components.map((comp, idx) => analyzeComponent(comp, idx)),
    quantizationAnalysis: analyzeQuantizationTables(decoded),
    dctAnalysis: analyzeDCTCoefficients(decoded),
    qualityEstimate: estimateJpegQuality(decoded),
    colorSpaceInfo: analyzeColorSpace(decoded),
  };
}

function analyzeComponent(component: IJpegDecoderComponent, index: number): ComponentMetadata {
  const quantTable = Array.from(component.quantizationTable || []);
  const distribution: Record<string, number> = {};

  // Create distribution buckets
  quantTable.forEach(val => {
    const bucket = Math.floor(val / 10) * 10;
    const key = `${bucket}-${bucket + 9}`;
    distribution[key] = (distribution[key] || 0) + 1;
  });

  return {
    componentIndex: index,
    blocksPerLine: component.blocksPerLine || 0,
    blocksPerColumn: component.blocksPerColumn || 0,
    totalBlocks: (component.blocksPerLine || 0) * (component.blocksPerColumn || 0),
    scaleX: component.scaleX || 1,
    scaleY: component.scaleY || 1,
    quantizationStats: {
      avgValue: quantTable.length > 0 ? quantTable.reduce((sum, val) => sum + val, 0) / quantTable.length : 0,
      maxValue: quantTable.length > 0 ? Math.max(...quantTable) : 0,
      minValue: quantTable.length > 0 ? Math.min(...quantTable) : 0,
      distribution,
    },
  };
}

function analyzeQuantizationTables(decoded: IJpegInternalDecoder): QuantizationData {
  const luminanceTable = Array.from(decoded.components[0]?.quantizationTable || []);
  const chrominanceUTable = decoded.components[1]
    ? Array.from(decoded.components[1].quantizationTable || [])
    : undefined;
  const chrominanceVTable = decoded.components[2]
    ? Array.from(decoded.components[2].quantizationTable || [])
    : undefined;

  const qualityEstimate = estimateQualityFromQuantTable(luminanceTable);
  const standardDeviation = calculateStandardDeviation(luminanceTable);

  return {
    luminanceTable,
    chrominanceUTable,
    chrominanceVTable,
    qualityEstimate,
    standardDeviation,
  };
}

function analyzeDCTCoefficients(decoded: IJpegInternalDecoder): DCTData {
  let totalCoefficients = 0;
  let zeroCoefficients = 0;
  let nonZeroCoefficients = 0;
  let positiveCoefficients = 0;
  let negativeCoefficients = 0;
  let suitableCoefficients = 0;

  const frequencyDistribution = new Array(64).fill(0);
  let dcEnergy = 0;
  let lowFreqEnergy = 0;
  let midFreqEnergy = 0;
  let highFreqEnergy = 0;

  // Analyze luminance component
  const component = decoded.components[0];
  const dctBlocks = component.dctBlocks || component.blocks || [];

  for (const block of dctBlocks.slice(0, 100)) {
    // Sample first 100 blocks
    for (const row of block) {
      for (let i = 0; i < row.length && i < 64; i++) {
        const coeff = row[i];
        totalCoefficients++;

        if (coeff === 0) {
          zeroCoefficients++;
        } else {
          nonZeroCoefficients++;
          if (coeff > 0) positiveCoefficients++;
          else negativeCoefficients++;

          // Track frequency distribution
          frequencyDistribution[i] += Math.abs(coeff);

          // Energy distribution
          const energy = coeff * coeff;
          if (i === 0) dcEnergy += energy;
          else if (i < 16) lowFreqEnergy += energy;
          else if (i < 32) midFreqEnergy += energy;
          else highFreqEnergy += energy;

          // Suitability for steganography
          if (Math.abs(coeff) >= 2 && i > 15) {
            // Skip DC and low frequencies
            suitableCoefficients++;
          }
        }
      }
    }
  }

  const totalCapacity = suitableCoefficients; // 1 bit per suitable coefficient
  const capacityPercentage = totalCoefficients > 0 ? (suitableCoefficients / totalCoefficients) * 100 : 0;

  return {
    coefficientStats: {
      totalCoefficients,
      zeroCoefficients,
      nonZeroCoefficients,
      positiveCoefficients,
      negativeCoefficients,
    },
    frequencyDistribution,
    energyDistribution: {
      dcEnergy,
      lowFreqEnergy,
      midFreqEnergy,
      highFreqEnergy,
    },
    suitabilityForSteganography: {
      suitableCoefficients,
      totalCapacity,
      capacityPercentage,
    },
  };
}

function analyzeColorSpace(decoded: IJpegInternalDecoder): ColorSpaceData {
  const componentCount = decoded.components.length;
  let chromaSubsampling = 'none';
  let estimatedColorSpace: 'YCbCr' | 'RGB' | 'Grayscale' | 'Unknown' = 'Unknown';

  if (componentCount === 1) {
    estimatedColorSpace = 'Grayscale';
  } else if (componentCount === 3) {
    estimatedColorSpace = 'YCbCr';
    chromaSubsampling = determineSubsampling(decoded);
  }

  // Calculate chroma channel activity
  let cbActivity = 0;
  let crActivity = 0;

  if (componentCount >= 3) {
    cbActivity = calculateChannelActivity(decoded.components[1]);
    crActivity = calculateChannelActivity(decoded.components[2]);
  }

  return {
    componentCount,
    chromaSubsampling,
    estimatedColorSpace,
    chromaChannelActivity: {
      cbActivity,
      crActivity,
    },
  };
}

function analyzeGreyFilterRisk(filename: string, decoded: IJpegInternalDecoder) {
  const riskFactors: string[] = [];
  let riskScore = 0;

  // Check quantization table characteristics
  const lumaQuant = decoded.components[0]?.quantizationTable;
  const cbQuant = decoded.components[1]?.quantizationTable;
  const crQuant = decoded.components[2]?.quantizationTable;

  if (lumaQuant && cbQuant && crQuant) {
    const lumaArray = Array.from(lumaQuant);
    const cbArray = Array.from(cbQuant);
    const crArray = Array.from(crQuant);

    const lumaAvg = lumaArray.reduce((sum, val) => sum + val, 0) / lumaArray.length;
    const cbAvg = cbArray.reduce((sum, val) => sum + val, 0) / cbArray.length;
    const crAvg = crArray.reduce((sum, val) => sum + val, 0) / crArray.length;

    // Check for extreme quantization differences
    const chromaRatio = (cbAvg + crAvg) / (2 * lumaAvg);
    if (chromaRatio > 2) {
      riskFactors.push('High chroma quantization ratio');
      riskScore += 2;
    }

    // Check for very high chroma quantization values
    if (cbAvg > 50 || crAvg > 50) {
      riskFactors.push('Aggressive chroma quantization');
      riskScore += 2;
    }

    // Check for imbalanced chroma tables
    const chromaImbalance = Math.abs(cbAvg - crAvg) / Math.max(cbAvg, crAvg);
    if (chromaImbalance > 0.5) {
      riskFactors.push('Imbalanced Cb/Cr quantization');
      riskScore += 1;
    }
  }

  // Check subsampling pattern
  const subsampling = determineSubsampling(decoded);
  if (subsampling === '4:2:0') {
    riskFactors.push('Aggressive 4:2:0 subsampling');
    riskScore += 1;
  }

  // Check overall quality
  const quality = estimateJpegQuality(decoded);
  if (quality < 60) {
    riskFactors.push('Low estimated quality');
    riskScore += 1;
  }

  let riskLevel: 'Low' | 'Medium' | 'High';
  if (riskScore >= 4) riskLevel = 'High';
  else if (riskScore >= 2) riskLevel = 'Medium';
  else riskLevel = 'Low';

  return {
    filename,
    riskLevel,
    riskScore,
    riskFactors,
    metadata: {
      estimatedQuality: quality,
      subsampling,
      componentCount: decoded.components.length,
    },
  };
}

function estimateJpegQuality(decoded: IJpegInternalDecoder): number {
  const quantTable = decoded.components[0]?.quantizationTable;
  if (!quantTable || quantTable.length === 0) return 50;

  const quantArray = Array.from(quantTable);
  const avgQuant = quantArray.reduce((sum, val) => sum + val, 0) / quantArray.length;

  // Simple quality estimation
  if (avgQuant <= 2) return 95;
  if (avgQuant <= 4) return 90;
  if (avgQuant <= 8) return 85;
  if (avgQuant <= 16) return 75;
  if (avgQuant <= 32) return 60;
  if (avgQuant <= 64) return 40;
  return Math.max(10, 100 - avgQuant);
}

function estimateQualityFromQuantTable(quantTable: number[]): number {
  if (quantTable.length === 0) return 50;

  const avgValue = quantTable.reduce((sum, val) => sum + val, 0) / quantTable.length;
  return Math.max(10, Math.min(100, 100 - avgValue));
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

function determineSubsampling(decoded: IJpegInternalDecoder): string {
  if (decoded.components.length !== 3) return 'none';

  const y = decoded.components[0];
  const cb = decoded.components[1];
  const cr = decoded.components[2];

  if (y.scaleX === cb.scaleX && y.scaleY === cb.scaleY) return '4:4:4';
  if (y.scaleX === 2 && cb.scaleX === 1 && y.scaleY === cb.scaleY) return '4:2:2';
  if (y.scaleX === 2 && y.scaleY === 2 && cb.scaleX === 1 && cb.scaleY === 1) return '4:2:0';

  return `custom:${y.scaleX}:${cb.scaleX}:${cr.scaleX}`;
}

function calculateChannelActivity(component: IJpegDecoderComponent): number {
  const blocks = component.dctBlocks || component.blocks || [];
  if (blocks.length === 0) return 0;

  let totalActivity = 0;
  let sampleCount = 0;

  for (const block of blocks.slice(0, 50)) {
    // Sample first 50 blocks
    for (const row of block) {
      for (const coeff of row) {
        totalActivity += Math.abs(coeff);
        sampleCount++;
      }
    }
  }

  return sampleCount > 0 ? totalActivity / sampleCount : 0;
}

function generateMetadataSummary(results: JpegMetadata[]) {
  return {
    totalImages: results.length,
    averageQuality: results.reduce((sum, r) => sum + r.qualityEstimate, 0) / results.length,
    qualityDistribution: {
      high: results.filter(r => r.qualityEstimate > 80).length,
      medium: results.filter(r => r.qualityEstimate >= 60 && r.qualityEstimate <= 80).length,
      low: results.filter(r => r.qualityEstimate < 60).length,
    },
    subsamplingPatterns: results.reduce((acc: Record<string, number>, r) => {
      acc[r.colorSpaceInfo.chromaSubsampling] = (acc[r.colorSpaceInfo.chromaSubsampling] || 0) + 1;
      return acc;
    }, {}),
    averageCapacity:
      results.reduce((sum, r) => sum + r.dctAnalysis.suitabilityForSteganography.suitableCoefficients, 0) /
      results.length,
  };
}

function generateGreyFilterRecommendations(analysis: any[]) {
  const problematic = analysis.filter(a => a.category === 'Problematic');
  const working = analysis.filter(a => a.category === 'Working');

  return {
    commonProblematicFactors: findCommonFactors(problematic),
    commonWorkingCharacteristics: findCommonFactors(working),
    recommendations: [
      'Preserve original chroma quantization tables when re-encoding',
      'Avoid aggressive quality reduction for images with faces',
      'Test with 4:4:4 chroma subsampling for problematic images',
      'Implement quality-aware encoding strategies',
    ],
  };
}

function findCommonFactors(analysisSet: any[]): string[] {
  const factorCounts: Record<string, number> = {};

  analysisSet.forEach(analysis => {
    analysis.riskFactors.forEach((factor: string) => {
      factorCounts[factor] = (factorCounts[factor] || 0) + 1;
    });
  });

  return Object.entries(factorCounts)
    .filter(([_, count]) => count > analysisSet.length / 2)
    .map(([factor, _]) => factor);
}

function generateFormatReport(results: JpegMetadata[]): string {
  const summary = generateMetadataSummary(results);

  return `# JPEG Format Analysis Report

Generated: ${new Date().toISOString()}

## Summary

- **Total Images Analyzed**: ${summary.totalImages}
- **Average Quality**: ${summary.averageQuality.toFixed(1)}%
- **Average Steganography Capacity**: ${summary.averageCapacity.toFixed(0)} coefficients

## Quality Distribution

- **High Quality (>80%)**: ${summary.qualityDistribution.high} images
- **Medium Quality (60-80%)**: ${summary.qualityDistribution.medium} images  
- **Low Quality (<60%)**: ${summary.qualityDistribution.low} images

## Chroma Subsampling Patterns

${Object.entries(summary.subsamplingPatterns)
  .map(([pattern, count]) => `- **${pattern}**: ${count} images`)
  .join('\n')}

## Detailed Image Analysis

${results
  .map(
    img => `
### ${img.filename}

- **File Size**: ${(img.fileSize / 1024).toFixed(1)} KB
- **Dimensions**: ${img.dimensions.width}x${img.dimensions.height}
- **Estimated Quality**: ${img.qualityEstimate}%
- **Color Space**: ${img.colorSpaceInfo.estimatedColorSpace}
- **Chroma Subsampling**: ${img.colorSpaceInfo.chromaSubsampling}
- **Components**: ${img.components.length}
- **Steganography Capacity**: ${img.dctAnalysis.suitabilityForSteganography.suitableCoefficients} coefficients (${img.dctAnalysis.suitabilityForSteganography.capacityPercentage.toFixed(1)}%)

**Quantization Stats**:
- Luminance Avg: ${img.components[0]?.quantizationStats.avgValue.toFixed(1)}
- Luminance Range: ${img.components[0]?.quantizationStats.minValue}-${img.components[0]?.quantizationStats.maxValue}
- Standard Deviation: ${img.quantizationAnalysis.standardDeviation.toFixed(2)}

**DCT Energy Distribution**:
- DC Energy: ${img.dctAnalysis.energyDistribution.dcEnergy.toFixed(0)}
- Low Frequency: ${img.dctAnalysis.energyDistribution.lowFreqEnergy.toFixed(0)}
- Mid Frequency: ${img.dctAnalysis.energyDistribution.midFreqEnergy.toFixed(0)}
- High Frequency: ${img.dctAnalysis.energyDistribution.highFreqEnergy.toFixed(0)}
`
  )
  .join('\n')}

## Recommendations for Grey Filter Issue Investigation

1. **High Priority**: Focus on images with aggressive chroma quantization
2. **Medium Priority**: Test quantization table preservation strategies  
3. **Low Priority**: Investigate correlation between subsampling and quality loss

## Technical Notes

- Analysis limited to first 100 DCT blocks per image for performance
- Steganography capacity calculated for coefficients >2 in mid/high frequencies
- Quality estimation based on average luminance quantization values
`;
}
