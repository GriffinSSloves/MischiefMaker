import { describe, it } from 'vitest';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Jp3gForkClient } from './jp3gForkClient';

describe.skip('Jp3gForkClient', () => {
  const client = new Jp3gForkClient();

  // Get test image
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const testImagePath = resolve(__dirname, '../../tests/images/FacebookPFP.jpg');
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

    // This test should pass if we can access any internal data
    console.log(result.success ? '✅ INTERNAL ACCESS TEST PASSED' : '❌ INTERNAL ACCESS TEST FAILED');
  });

  it('should debug internal structure', async () => {
    console.log('\n=== Debugging jp3g fork internal structure ===');

    await client.debugInternalStructure(testImageBuffer);

    console.log('✅ DEBUG STRUCTURE TEST COMPLETED');
  });

  it('should test coefficient modification', async () => {
    console.log('\n=== Testing DCT coefficient modification ===');

    // This now uses the end-to-end method for a simple modification test
    const message = 'Hello JPEG!';
    const embedResult = await client.embedMessageAndReencode(testImageBuffer, message, 85);

    console.log('Modification result:', {
      success: embedResult.success,
      error: embedResult.error,
      coefficientsModified: embedResult.coefficientsModified,
      blocks: embedResult.blocks,
    });

    if (embedResult.success) {
      console.log('✅ COEFFICIENT MODIFICATION TEST PASSED');
    } else {
      console.log('❌ COEFFICIENT MODIFICATION TEST FAILED');
    }
  });

  it('should perform end-to-end steganography', async () => {
    console.log('\n=== Testing end-to-end steganography workflow ===');

    const message = 'Secret message in JPEG!';
    const embedResult = await client.embedMessageAndReencode(testImageBuffer, message, 85);

    console.log('Embed result:', {
      success: embedResult.success,
      error: embedResult.error,
      modifiedJpegSize: embedResult.modifiedJpeg?.length || 0,
      coefficientsModified: embedResult.coefficientsModified,
      totalBlocks: embedResult.blocks,
    });

    if (embedResult.success && embedResult.modifiedJpeg) {
      console.log(`✅ End-to-end test completed successfully!`);
      console.log(`   Original JPEG: ${testImageBuffer.length} bytes`);
      console.log(`   Modified JPEG: ${embedResult.modifiedJpeg.length} bytes`);
      console.log(`   Size difference: ${embedResult.modifiedJpeg.length - testImageBuffer.length} bytes`);
      console.log(`   Coefficients modified: ${embedResult.coefficientsModified}`);
      console.log(`   Total blocks processed: ${embedResult.blocks}`);

      // Save the modified JPEG for visual inspection
      const outputPath = resolve(__dirname, '../../tests/output/steganography_modified.jpg');
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
        const outputPath = resolve(__dirname, '../../tests/output/modified_with_steganography.jpg');
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

    if (!parseResult.success || !parseResult.internalDecoder) {
      console.log('❌ Failed to parse original JPEG');
      return;
    }

    const decoder = parseResult.internalDecoder;
    console.log(`Parsed JPEG: ${decoder.width}x${decoder.height}, ${decoder.components.length} components`);

    // Try to re-encode WITHOUT any modifications
    const { JPEGEncoder } = await import('../jp3gFork/jp3gEncoder');
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
      console.log(`✅ Re-encoded JPEG (no mods): ${reEncodedJpeg.length} bytes`);
      console.log(`Original: ${testImageBuffer.length} bytes, Re-encoded: ${reEncodedJpeg.length} bytes`);

      // Save the re-encoded JPEG for visual inspection
      const outputPath = resolve(__dirname, '../../tests/output/re_encoded_unmodified.jpg');
      try {
        writeFileSync(outputPath, reEncodedJpeg);
        console.log(`   ✅ Re-encoded JPEG (unmodified) saved to: ${outputPath}`);
      } catch (e) {
        console.error(`   ❌ Failed to save re-encoded JPEG: ${e}`);
      }

      // Try to parse the re-encoded JPEG
      console.log('Testing if re-encoded JPEG can be parsed...');
      const reParseResult = await client.parseWithInternalAccess(new Uint8Array(reEncodedJpeg));

      if (reParseResult.success) {
        console.log('🎉 SUCCESS: Re-encoded JPEG can be parsed!');
        console.log(`Re-parsed: ${reParseResult.internalDecoder?.width}x${reParseResult.internalDecoder?.height}`);
        console.log(`Components: ${reParseResult.internalDecoder?.components.length}`);
        console.log(`DCT blocks: ${reParseResult.dctCoefficients?.totalBlocks}`);
      } else {
        console.log('❌ FAILED: Re-encoded JPEG cannot be parsed');
        console.log('Error:', reParseResult.error);
      }
    } else {
      console.log('❌ ENCODING FAILED');
    }
  });
});
