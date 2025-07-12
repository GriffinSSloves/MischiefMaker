import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Jp3gForkClient } from './jp3gForkClient';
import { Buffer } from 'buffer';

describe('Jp3gForkClient', () => {
  const client = new Jp3gForkClient();

  // Get test image
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const testDir = resolve(__dirname, '../../../tests');
  const testImagePath = resolve(testDir, 'images/FacebookPFP.jpg');
  let testImageBuffer: Uint8Array;

  try {
    testImageBuffer = new Uint8Array(readFileSync(testImagePath));
    console.log(`✅ Test image loaded: ${testImageBuffer.length} bytes`);
  } catch (error) {
    console.error('❌ Failed to load test image:', error);
    throw error;
  }

  it('should parse JPEG with internal access', async () => {
    console.log('\n=== Testing jp3g fork internal access ===');

    const result = await client.parseWithInternalAccess(testImageBuffer);

    console.log('Parse result:', {
      success: result.success,
      error: result.error,
      hasJpegStructure: !!result.jpegStructure,
      hasDctCoefficients: !!result.dctCoefficients,
      hasInternalDecoder: !!result.internalDecoder,
    });

    if (result.success && result.dctCoefficients) {
      console.log('DCT Coefficients found:', {
        totalBlocks: result.dctCoefficients.totalBlocks,
        width: result.dctCoefficients.width,
        height: result.dctCoefficients.height,
        firstBlockDC: result.dctCoefficients.blocks[0]?.dc,
        firstBlockACCount: result.dctCoefficients.blocks[0]?.ac.length,
      });

      // Log some sample coefficients
      if (result.dctCoefficients.blocks.length > 0) {
        const firstBlock = result.dctCoefficients.blocks[0];
        console.log('First block sample coefficients:');
        console.log('  DC:', firstBlock.dc);
        console.log('  First 10 AC:', firstBlock.ac.slice(0, 10));
      }
    }

    // New assertion: we must have decoded blocks > 0
    expect(result.success).toBe(true);
    expect(result.dctCoefficients?.totalBlocks ?? 0).toBeGreaterThan(0);
    console.log(result.success ? '✅ INTERNAL ACCESS TEST PASSED' : '❌ INTERNAL ACCESS TEST FAILED');
  });

  it('should debug internal structure', async () => {
    console.log('\n=== Debugging jp3g fork internal structure ===');

    // Expect the debug routine not to throw
    await expect(client.debugInternalStructure(testImageBuffer)).resolves.not.toThrow();

    // Additionally validate that the image can still be parsed afterwards
    const parseCheck = await client.parseWithInternalAccess(testImageBuffer);
    expect(parseCheck.success).toBe(true);
    expect(parseCheck.dctCoefficients?.totalBlocks ?? 0).toBeGreaterThan(0);

    console.log('✅ DEBUG STRUCTURE TEST COMPLETED');
  });

  it('should test coefficient modification', async () => {
    console.log('\n=== Testing DCT coefficient modification ===');

    // This now uses the end-to-end method for a simple modification test
    const message = 'Hello JPEG!';
    const embedResult = await client.embedMessageAndReencode(testImageBuffer, message, 85);

    // --- Assertions ---
    expect(embedResult.success).toBe(true);
    expect(embedResult.coefficientsModified ?? 0).toBeGreaterThan(0);
    expect(embedResult.blocks ?? 0).toBeGreaterThan(0);

    if (!embedResult.modifiedJpeg) {
      throw new Error('Modified JPEG is undefined after coefficient modification');
    }

    // Ensure modified JPEG parses correctly
    const parseModified = await client.parseWithInternalAccess(embedResult.modifiedJpeg);
    expect(parseModified.success).toBe(true);
    expect(parseModified.dctCoefficients?.totalBlocks ?? 0).toBeGreaterThan(0);

    console.log('✅ COEFFICIENT MODIFICATION TEST PASSED');
  });

  it('should perform end-to-end steganography', async () => {
    console.log('\n=== Testing end-to-end steganography workflow ===');

    const message = 'Secret message in JPEG!';
    const embedResult = await client.embedMessageAndReencode(testImageBuffer, message, 85);

    // Assertions for embedding phase
    expect(embedResult.success).toBe(true);
    expect(embedResult.modifiedJpeg).toBeDefined();
    expect(embedResult.coefficientsModified ?? 0).toBeGreaterThan(0);
    expect(embedResult.blocks ?? 0).toBeGreaterThan(0);

    console.log('Embed result:', {
      success: embedResult.success,
      error: embedResult.error,
      modifiedJpegSize: embedResult.modifiedJpeg?.length || 0,
      coefficientsModified: embedResult.coefficientsModified,
      totalBlocks: embedResult.blocks,
    });

    if (embedResult.modifiedJpeg) {
      // --- Additional structural assertions ---
      const jpegBuf = Buffer.from(embedResult.modifiedJpeg);
      // JPEG must start with SOI 0xFFD8 and end with EOI 0xFFD9
      expect(jpegBuf[0]).toBe(0xff);
      expect(jpegBuf[1]).toBe(0xd8);
      expect(jpegBuf[jpegBuf.length - 2]).toBe(0xff);
      expect(jpegBuf[jpegBuf.length - 1]).toBe(0xd9);

      // Size sanity-check: must be > original - this re-encode usually bigger
      expect(embedResult.modifiedJpeg.length).toBeGreaterThan(testImageBuffer.length * 0.8);

      console.log(`✅ End-to-end test completed successfully!`);
      console.log(`   Original JPEG: ${testImageBuffer.length} bytes`);
      console.log(`   Modified JPEG: ${embedResult.modifiedJpeg.length} bytes`);
      console.log(`   Size difference: ${embedResult.modifiedJpeg.length - testImageBuffer.length} bytes`);
      console.log(`   Coefficients modified: ${embedResult.coefficientsModified}`);
      console.log(`   Total blocks processed: ${embedResult.blocks}`);

      // Save the modified JPEG for visual inspection
      const outputPath = resolve(testDir, 'output/steganography_modified.jpg');
      try {
        writeFileSync(outputPath, embedResult.modifiedJpeg);
        console.log(`   ✅ Modified JPEG with embedded message saved to: ${outputPath}`);
      } catch (e) {
        console.error(`   ❌ Failed to save modified JPEG: ${e}`);
      }
    } else {
      console.log('❌ END-TO-END STEGANOGRAPHY TEST FAILED');
    }

    // Now, try to parse the modified jpeg to see if it's valid
    const reparseResult = await client.parseWithInternalAccess(embedResult.modifiedJpeg as Uint8Array);

    if (reparseResult.success) {
      expect(reparseResult.dctCoefficients?.totalBlocks ?? 0).toBeGreaterThan(0);
      // Expected number of luminance blocks = (width/8)*(height/8)
      const expectedBlocks = reparseResult.internalDecoder
        ? (reparseResult.internalDecoder.width / 8) * (reparseResult.internalDecoder.height / 8)
        : 0;
      expect(reparseResult.dctCoefficients?.totalBlocks).toBe(expectedBlocks);
      console.log(`✅ Modified JPEG can be parsed: ${reparseResult.success}`);
      console.log(`   DCT coefficients accessible: ${reparseResult.dctCoefficients ? 'Yes' : 'No'}`);
      console.log(`   Blocks in modified JPEG: ${reparseResult.dctCoefficients?.totalBlocks || 0}`);
    } else {
      console.log(`❌ Failed to verify modified JPEG: ${reparseResult.error}`);
    }
  });

  it('should perform complete round-trip steganography test', async () => {
    console.log('\n=== Testing complete round-trip steganography ===');

    const testMessage = 'Hello world! This is a test.';
    console.log(`Test message: "${testMessage}" (${testMessage.length} bytes)`);

    const roundTripResult = await client.testRoundTripSteganography(testImageBuffer, testMessage, 85);

    // Assertions for round-trip
    expect(roundTripResult.success).toBe(true);
    expect(roundTripResult.messagesMatch).toBe(true);
    expect(roundTripResult.modifiedJpeg).toBeDefined();

    console.log('Round-trip result:', {
      success: roundTripResult.success,
      error: roundTripResult.error,
      messagesMatch: roundTripResult.messagesMatch,
      originalMessage: roundTripResult.originalMessage,
      extractedMessage: roundTripResult.extractedMessage,
      stats: roundTripResult.stats,
    });

    if (roundTripResult.success) {
      console.log('🎉 ROUND-TRIP STEGANOGRAPHY SUCCESS!');
      console.log(`   Messages match: ${roundTripResult.messagesMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`   Original: "${roundTripResult.originalMessage}"`);
      console.log(`   Extracted: "${roundTripResult.extractedMessage}"`);

      if (roundTripResult.stats) {
        console.log(
          `   File size: ${roundTripResult.stats.originalSize} → ${roundTripResult.stats.modifiedSize} bytes`
        );
        console.log(`   Size change: ${roundTripResult.stats.modifiedSize - roundTripResult.stats.originalSize} bytes`);
        console.log(`   Coefficients modified: ${roundTripResult.stats.coefficientsModified}`);
        console.log(`   Coefficients read: ${roundTripResult.stats.coefficientsRead}`);
      }

      // Save the modified JPEG for visual inspection
      if (roundTripResult.modifiedJpeg) {
        const outputPath = resolve(testDir, 'output/modified_with_steganography.jpg');
        try {
          writeFileSync(outputPath, roundTripResult.modifiedJpeg);
          console.log(`   Modified JPEG saved to: ${outputPath}`);
          console.log(`   File size: ${roundTripResult.modifiedJpeg.length} bytes`);
        } catch (error) {
          console.log(`   Could not save modified JPEG: ${error}`);
          console.log(`   Modified JPEG available in memory: ${roundTripResult.modifiedJpeg.length} bytes`);
        }
      }
    } else {
      console.log('❌ ROUND-TRIP STEGANOGRAPHY TEST FAILED');
    }
  });

  it('should compare with original jp3g limitations', async () => {
    console.log('\n=== Comparing fork vs original jp3g ===');

    // Test our fork
    const forkResult = await client.parseWithInternalAccess(testImageBuffer);

    // Assertions on fork parse
    expect(forkResult.success).toBe(true);
    expect(forkResult.dctCoefficients?.totalBlocks ?? 0).toBeGreaterThan(0);

    console.log('Fork Results:');
    console.log('  Success:', forkResult.success);
    console.log('  Has DCT coefficients:', !!forkResult.dctCoefficients);
    console.log('  Total blocks found:', forkResult.dctCoefficients?.totalBlocks || 0);

    // Try to import original jp3g for comparison
    try {
      const jp3g = await import('jp3g');
      const jpegParser = jp3g.default(testImageBuffer);
      const originalResult = (await jpegParser.toObject()) as any;

      console.log('\nOriginal jp3g Results:');
      console.log('  Components:', originalResult.components?.length || 0);
      console.log('  Width:', originalResult.width);
      console.log('  Height:', originalResult.height);
      console.log('  Available properties:', Object.keys(originalResult));

      // Check if original has block access
      const hasOriginalBlocks = originalResult.components?.some((comp: any) => comp.blocks);
      console.log('  Has block data:', hasOriginalBlocks);

      console.log('\n=== COMPARISON SUMMARY ===');
      console.log('Fork has DCT access:', !!forkResult.dctCoefficients);
      console.log('Original has DCT access:', hasOriginalBlocks);

      if (forkResult.dctCoefficients && !hasOriginalBlocks) {
        console.log('🎉 SUCCESS: Fork provides DCT access that original lacks!');
      }
    } catch (originalError) {
      console.log('Original jp3g not available for comparison:', originalError);
      // This is fine - we're focusing on the fork
    }

    console.log('✅ COMPARISON TEST COMPLETED');
  });

  it('should test basic re-encoding without modifications', async () => {
    console.log('\n=== Testing basic re-encoding without modifications ===');

    // Parse original JPEG
    const parseResult = await client.parseWithInternalAccess(testImageBuffer);

    expect(parseResult.success).toBe(true);
    expect(parseResult.internalDecoder).toBeDefined();

    if (!parseResult.internalDecoder) {
      throw new Error('Internal decoder is undefined');
    }

    const decoder = parseResult.internalDecoder;
    console.log(`Parsed JPEG: ${decoder.width}x${decoder.height}, ${decoder.components.length} components`);

    // Try to re-encode WITHOUT any modifications
    const { JPEGEncoder } = await import('../encoder/jp3gEncoder');
    const encoder = new (JPEGEncoder as any)(85);

    // Prepare DCT data exactly as parsed (no modifications)
    const dctData = {
      width: decoder.width,
      height: decoder.height,
      components: decoder.components.map((comp: any) => ({
        dctBlocks: comp.dctBlocks,
        blocksPerLine: comp.blocksPerLine,
        blocksPerColumn: comp.blocksPerColumn,
      })),
    };

    // CRITICAL FIX: Pass the decoder as metadata
    const reEncodedJpeg = encoder.encodeFromDCT(dctData, decoder, 85);

    if (reEncodedJpeg) {
      // Basic assertion that some bytes were produced
      expect(reEncodedJpeg.byteLength).toBeGreaterThan(0);

      console.log(`✅ Re-encoded JPEG (no mods): ${reEncodedJpeg.length} bytes`);
      console.log(`Original: ${testImageBuffer.length} bytes, Re-encoded: ${reEncodedJpeg.length} bytes`);

      // Save the re-encoded JPEG for visual inspection
      const outputPath = resolve(testDir, 'output/re_encoded_unmodified.jpg');
      try {
        writeFileSync(outputPath, reEncodedJpeg);
        console.log(`   ✅ Re-encoded JPEG (unmodified) saved to: ${outputPath}`);
      } catch (e) {
        console.error(`   ❌ Failed to save re-encoded JPEG: ${e}`);
      }

      // Try to parse the re-encoded JPEG
      console.log('Testing if re-encoded JPEG can be parsed...');
      const reParseResult = await client.parseWithInternalAccess(new Uint8Array(reEncodedJpeg));

      expect(reParseResult.success).toBe(true);
      expect(reParseResult.dctCoefficients?.totalBlocks ?? 0).toBeGreaterThan(0);
      const expectedBlocks2 = reParseResult.internalDecoder
        ? (reParseResult.internalDecoder.width / 8) * (reParseResult.internalDecoder.height / 8)
        : 0;
      expect(reParseResult.dctCoefficients?.totalBlocks).toBe(expectedBlocks2);

      console.log('🎉 SUCCESS: Re-encoded JPEG can be parsed!');
      console.log(`Re-parsed: ${reParseResult.internalDecoder?.width}x${reParseResult.internalDecoder?.height}`);
      console.log(`Components: ${reParseResult.internalDecoder?.components.length}`);
      console.log(`DCT blocks: ${reParseResult.dctCoefficients?.totalBlocks}`);
    } else {
      console.log('❌ ENCODING FAILED');
      // Explicitly fail the test
      expect(reEncodedJpeg).toBeDefined();
    }
  });
});
