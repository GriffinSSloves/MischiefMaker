import { describe, test } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Jp3gEnhancedClient } from './jp3gEnhancedClient';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe.skip('JPEG Rebuilding Debug Analysis', () => {
  const client = new Jp3gEnhancedClient();

  test('should analyze segment preservation during rebuilding', async () => {
    const imagePath = join(__dirname, '../../tests/images/FacebookPFP.jpg');
    const imageBuffer = new Uint8Array(readFileSync(imagePath));

    console.log(`\n🔍 DEBUGGING SEGMENT PRESERVATION FOR FacebookPFP.jpg`);
    console.log(`📏 Original image size: ${imageBuffer.length} bytes`);

    // Step 1: Parse and analyze original structure
    const parseResult = await client.parseWithDCTCoefficients(imageBuffer);

    if (!parseResult.success || !parseResult.jpegStructure) {
      throw new Error('Failed to parse JPEG structure');
    }

    console.log(`\n📋 ORIGINAL JPEG STRUCTURE ANALYSIS:`);

    let totalOriginalSegmentSize = 0;
    const segmentAnalysis: Array<{
      type: string;
      size: number;
      hasData: boolean;
      preservable: boolean;
      error?: string;
    }> = [];

    for (const segment of parseResult.jpegStructure) {
      const segmentSize = segment.data ? segment.data.length : 0;
      totalOriginalSegmentSize += segmentSize;

      let preservable = false;
      let error: string | undefined;

      // Test if we can serialize this segment
      try {
        const testBytes = (client as any).segmentToBytes(segment);
        preservable = !!testBytes;
        if (!testBytes) {
          error = 'segmentToBytes returned null';
        }
      } catch (e) {
        preservable = false;
        error = e instanceof Error ? e.message : 'Unknown error';
      }

      segmentAnalysis.push({
        type: segment.type,
        size: segmentSize,
        hasData: !!segment.data,
        preservable,
        error,
      });

      console.log(
        `  ${segment.type}: ${segmentSize} bytes, data=${!!segment.data}, preservable=${preservable}${error ? ` (${error})` : ''}`
      );
    }

    console.log(`\n📊 SEGMENT PRESERVATION SUMMARY:`);
    const preservableSegments = segmentAnalysis.filter(s => s.preservable);
    const lostSegments = segmentAnalysis.filter(s => !s.preservable);
    const preservableSize = preservableSegments.reduce((sum, s) => sum + s.size, 0);
    const lostSize = lostSegments.reduce((sum, s) => sum + s.size, 0);

    console.log(`✅ Preservable: ${preservableSegments.length} segments, ${preservableSize} bytes`);
    console.log(`❌ Lost: ${lostSegments.length} segments, ${lostSize} bytes`);
    console.log(`📉 Data loss: ${((lostSize / totalOriginalSegmentSize) * 100).toFixed(2)}%`);

    console.log(`\n🔍 LOST SEGMENTS DETAILS:`);
    for (const segment of lostSegments) {
      console.log(`  ❌ ${segment.type}: ${segment.size} bytes - ${segment.error}`);
    }

    // Step 2: Test message embedding to see the actual rebuilding
    console.log(`\n🔧 TESTING MESSAGE EMBEDDING AND REBUILDING:`);

    const embedResult = await client.embedMessage(imageBuffer, 'Test message');

    if (!embedResult.success || !embedResult.modifiedJpeg) {
      console.log(`❌ Embedding failed: ${embedResult.error}`);
      return;
    }

    const originalSize = imageBuffer.length;
    const modifiedSize = embedResult.modifiedJpeg.length;
    const sizeReduction = ((originalSize - modifiedSize) / originalSize) * 100;

    console.log(`📏 Size comparison:`);
    console.log(`  Original: ${originalSize} bytes`);
    console.log(`  Modified: ${modifiedSize} bytes`);
    console.log(`  Reduction: ${sizeReduction.toFixed(2)}%`);

    // Step 3: Try to parse the modified JPEG
    console.log(`\n🔄 TESTING MODIFIED JPEG VALIDITY:`);

    try {
      const modifiedParseResult = await client.parseWithDCTCoefficients(embedResult.modifiedJpeg);
      console.log(`✅ Modified JPEG parseable: ${modifiedParseResult.success}`);
      if (!modifiedParseResult.success) {
        console.log(`❌ Parse error: ${modifiedParseResult.error}`);
      }
    } catch (error) {
      console.log(`❌ Modified JPEG completely invalid: ${error}`);
    }

    // Step 4: Analyze what a proper JPEG should contain
    console.log(`\n📋 WHAT A PROPER JPEG NEEDS:`);
    console.log(`  ✅ SOI (Start of Image) - 2 bytes`);
    console.log(
      `  📋 APP segments (EXIF, metadata) - ${segmentAnalysis.filter(s => s.type.startsWith('APP')).reduce((sum, s) => sum + s.size, 0)} bytes`
    );
    console.log(
      `  📊 DQT (Quantization Tables) - ${segmentAnalysis.filter(s => s.type === 'DQT').reduce((sum, s) => sum + s.size, 0)} bytes`
    );
    console.log(
      `  🔑 DHT (Huffman Tables) - ${segmentAnalysis.filter(s => s.type === 'DHT').reduce((sum, s) => sum + s.size, 0)} bytes`
    );
    console.log(
      `  🖼️ SOF (Start of Frame) - ${segmentAnalysis.filter(s => s.type === 'SOF').reduce((sum, s) => sum + s.size, 0)} bytes`
    );
    console.log(
      `  🎯 SOS (Start of Scan) + data - ${segmentAnalysis.filter(s => s.type === 'SOS').reduce((sum, s) => sum + s.size, 0)} bytes`
    );
    console.log(`  ✅ EOI (End of Image) - 2 bytes`);

    const essentialSegments = ['SOI', 'DQT', 'DHT', 'SOF', 'SOS', 'EOI'];
    const missingEssential = essentialSegments.filter(
      type => !segmentAnalysis.find(s => s.type === type && s.preservable)
    );

    if (missingEssential.length > 0) {
      console.log(`\n🚨 CRITICAL: Missing essential segments: ${missingEssential.join(', ')}`);
    }
  }, 30000);
});
