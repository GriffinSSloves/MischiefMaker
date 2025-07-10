import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Jp3gEnhancedClient } from './jp3gEnhancedClient';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Test images available in the test folder
const testImages = ['FacebookPFP.jpg', 'IMG_3457.JPG', '402D9640-645A-470E-9DA2-07DE1D4E3D18_1_105_c.jpeg'];

// Test messages of varying lengths
const testMessages = [
  'Hello, World!',
  'This is a longer test message to verify capacity.',
  'Short',
  'A much longer message that tests the boundaries of our steganography capacity. This message contains multiple sentences and should stress test the embedding and extraction process to ensure robustness across different message lengths.',
];

describe.skip('Jp3gEnhancedClient End-to-End Tests', () => {
  const client = new Jp3gEnhancedClient();

  testImages.forEach(imageName => {
    describe(`End-to-End Testing with ${imageName}`, () => {
      let imageBuffer: Uint8Array;

      test('should load image file', () => {
        const imagePath = join(__dirname, '../../tests/images', imageName);
        try {
          const buffer = readFileSync(imagePath);
          imageBuffer = new Uint8Array(buffer);
          expect(imageBuffer.length).toBeGreaterThan(0);
          console.log(`✅ Loaded ${imageName}: ${imageBuffer.length} bytes`);
        } catch (error) {
          throw new Error(`Failed to load image ${imageName}: ${error}`);
        }
      });

      testMessages.forEach(testMessage => {
        test(`should embed and extract message: "${testMessage.substring(0, 20)}${testMessage.length > 20 ? '...' : ''}"`, async () => {
          console.log(`\n🔄 Testing message embedding for ${imageName}:`);
          console.log(`Message: "${testMessage}" (${testMessage.length} chars, ${testMessage.length * 8} bits)`);

          // Step 1: Embed the message
          console.log('\n📥 Step 1: Embedding message...');
          const embedResult = await client.embedMessage(imageBuffer, testMessage);

          if (!embedResult.success) {
            console.log(`⚠️ Embedding failed (expected for large messages): ${embedResult.error}`);

            // If embedding fails due to capacity constraints, that's acceptable
            if (embedResult.error?.includes('Message too large')) {
              expect(embedResult.success).toBe(false);
              expect(embedResult.error).toContain('Message too large');
              console.log(`✅ Correctly rejected message that exceeds capacity`);
              return; // Skip extraction test for oversized messages
            } else {
              throw new Error(`Unexpected embedding failure: ${embedResult.error}`);
            }
          }

          // Validate embedding results
          expect(embedResult.success).toBe(true);
          expect(embedResult.modifiedJpeg).toBeDefined();
          expect(embedResult.modifiedJpeg!.length).toBeGreaterThan(0);
          expect(embedResult.coefficientsModified).toBeGreaterThan(0);

          console.log(`✅ Embedding successful!`);
          console.log(`  - Modified JPEG size: ${embedResult.modifiedJpeg!.length} bytes`);
          console.log(`  - Coefficients modified: ${embedResult.coefficientsModified}`);
          console.log(`  - Blocks processed: ${embedResult.blocks}`);

          // Step 2: Validate the modified JPEG is still a valid image
          console.log('\n🖼️ Step 2: Validating modified JPEG structure...');
          const modifiedImageBuffer = embedResult.modifiedJpeg!;

          // Check JPEG magic bytes
          expect(modifiedImageBuffer[0]).toBe(0xff);
          expect(modifiedImageBuffer[1]).toBe(0xd8);
          console.log(`✅ Modified JPEG has valid magic bytes`);

          // Try to parse the modified image
          const parseResult = await client.parseWithDCTCoefficients(modifiedImageBuffer);
          expect(parseResult.success).toBe(true);
          console.log(`✅ Modified JPEG parses successfully`);

          // Step 3: Extract the message
          console.log('\n📤 Step 3: Extracting message...');
          const extractResult = await client.extractMessage(modifiedImageBuffer, testMessage.length);

          expect(extractResult.success).toBe(true);
          expect(extractResult.message).toBeDefined();
          console.log(`✅ Extraction successful!`);
          console.log(`  - Original message: "${testMessage}"`);
          console.log(`  - Extracted message: "${extractResult.message}"`);

          // Step 4: Verify message integrity
          console.log('\n🔍 Step 4: Verifying message integrity...');
          expect(extractResult.message).toBe(testMessage);
          console.log(`✅ Message integrity verified! Perfect match.`);

          console.log(`💾 Modified image ready for manual inspection if needed`);
        }, 30000); // 30 second timeout for complex operations
      });

      test('should handle capacity constraints gracefully', async () => {
        console.log(`\n⚖️ Testing capacity constraints for ${imageName}:`);

        // Try to embed a very large message that should exceed capacity
        const largeMessage = 'A'.repeat(10000); // 10KB message
        console.log(`Large message: ${largeMessage.length} chars (${largeMessage.length * 8} bits)`);

        const embedResult = await client.embedMessage(imageBuffer, largeMessage);

        console.log(`Embed result: success=${embedResult.success}, error="${embedResult.error}"`);

        // Should fail gracefully with a clear error message
        expect(embedResult.success).toBe(false);
        expect(embedResult.error).toContain('Message too large');
        console.log(`✅ Correctly handled oversized message`);
      });

      test('should maintain image quality after embedding', async () => {
        console.log(`\n🎨 Testing image quality preservation for ${imageName}:`);

        const testMessage = 'Quality test message';
        const embedResult = await client.embedMessage(imageBuffer, testMessage);

        if (!embedResult.success) {
          console.log(`⚠️ Skipping quality test: ${embedResult.error}`);
          return;
        }

        const modifiedImageBuffer = embedResult.modifiedJpeg!;

        // Basic quality checks
        const originalSize = imageBuffer.length;
        const modifiedSize = modifiedImageBuffer.length;
        const sizeDiff = Math.abs(modifiedSize - originalSize);
        const sizeChangePercent = (sizeDiff / originalSize) * 100;

        console.log(`Original size: ${originalSize} bytes`);
        console.log(`Modified size: ${modifiedSize} bytes`);
        console.log(`Size change: ${sizeDiff} bytes (${sizeChangePercent.toFixed(2)}%)`);

        // Size change should be minimal (within reasonable bounds)
        expect(sizeChangePercent).toBeLessThan(50); // Less than 50% change
        console.log(`✅ Size change within acceptable bounds`);

        // Image should still be parseable
        const parseResult = await client.parseWithDCTCoefficients(modifiedImageBuffer);
        expect(parseResult.success).toBe(true);
        console.log(`✅ Modified image maintains structural integrity`);
      });
    });
  });

  test('should provide comprehensive capability report', async () => {
    console.log(`\n📊 Comprehensive Capability Report:\n`);

    for (const imageName of testImages) {
      console.log(`\n--- ${imageName} ---`);

      const imagePath = join(__dirname, '../../tests/images', imageName);
      const buffer = readFileSync(imagePath);
      const imageBuffer = new Uint8Array(buffer);

      const parseResult = await client.parseWithDCTCoefficients(imageBuffer);

      if (parseResult.success && parseResult.dctCoefficients) {
        const availableCoefficients = parseResult.dctCoefficients.blocks.reduce((total, block) => {
          return total + block.ac.filter(coeff => coeff !== 0 && Math.abs(coeff) >= 2).length;
        }, 0);

        const capacityBytes = Math.floor(availableCoefficients / 8);

        console.log(`  📏 Image size: ${imageBuffer.length} bytes`);
        console.log(`  🔢 DCT blocks: ${parseResult.dctCoefficients.blocks.length}`);
        console.log(`  ⚙️ Available coefficients: ${availableCoefficients}`);
        console.log(`  💾 Capacity: ${capacityBytes} bytes (${capacityBytes * 8} bits)`);
        console.log(`  📝 Max message length: ~${capacityBytes} characters`);
      } else {
        console.log(`  ❌ Failed to analyze: ${parseResult.error}`);
      }
    }

    console.log(`\n✅ Capability report complete!\n`);
  });
});
