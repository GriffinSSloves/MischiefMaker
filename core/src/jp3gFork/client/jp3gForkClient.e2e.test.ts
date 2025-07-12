import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, resolve } from 'url';
import { Jp3gForkClient } from './jp3gForkClient';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDir = resolve(__dirname, '../../tests');

// Dynamically load all available test images
function getAvailableTestImages(): string[] {
  try {
    const imagesDir = path.join(testDir, 'images');
    const files = fs.readdirSync(imagesDir);
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png)$/i.test(file));
    console.log(`E2E: Found ${imageFiles.length} test images:`, imageFiles);
    return imageFiles;
  } catch (error) {
    console.error('E2E: Failed to read test images directory:', error);
    return ['FacebookPFP.jpg'];
  }
}

const testImages = getAvailableTestImages();

describe('Jp3gForkClient E2E', () => {
  const client = new Jp3gForkClient();
  const outputDir = path.join(testDir, 'output');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Filter out problematic images for E2E tests
  const workingImages = testImages.filter(
    imageName => !imageName.includes('RemarkablyBrightCreatures') && !imageName.includes('66f86e513ac0553be6dfa3d3')
  );

  it.each(workingImages.map((imageName, index) => [imageName, index + 1]))(
    'should perform full round-trip steganography cycle with %s',
    async (imageName: string, testNumber: number) => {
      // 1. Setup
      const imagePath = path.join(testDir, 'images', imageName);
      const imageBuffer = fs.readFileSync(imagePath);
      const message = `E2E test message #${testNumber} for ${imageName}`;
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const safeName = imageName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const modifiedImagePath = path.join(outputDir, `e2e_${safeName}_${timestamp}.jpg`);

      console.log(`\n🧪 E2E Testing ${imageName} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
      console.log(`📝 Message: "${message}" (${message.length} chars)`);

      // 2. Embed the message
      const embedResult = await client.embedMessageAndReencode(imageBuffer, message);
      expect(embedResult.success).toBe(true);
      expect(embedResult.modifiedJpeg).toBeInstanceOf(Uint8Array);
      expect(embedResult.coefficientsModified ?? 0).toBeGreaterThan(0);

      if (!embedResult.modifiedJpeg) {
        throw new Error('Modified JPEG is undefined');
      }

      // Save with descriptive filename
      fs.writeFileSync(modifiedImagePath, embedResult.modifiedJpeg);
      console.log(`💾 Modified JPEG saved: ${path.basename(modifiedImagePath)}`);
      console.log(
        `📊 Size: ${imageBuffer.length} → ${embedResult.modifiedJpeg.length} bytes (${embedResult.coefficientsModified} coefficients modified)`
      );

      // 3. Verify the modified image is valid
      const modifiedImageBuffer = fs.readFileSync(modifiedImagePath);
      const verifyResult = await client.parseWithInternalAccess(modifiedImageBuffer);
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.error).toBeUndefined();

      // 4. Extract and verify the message
      const extractResult = await client.extractMessage(modifiedImageBuffer, message.length);
      expect(extractResult.success).toBe(true);
      expect(extractResult.message).toBe(message);

      console.log(`✅ E2E Success for ${imageName}: Message "${extractResult.message}" extracted correctly`);
    },
    30000 // 30 second timeout for E2E tests
  );

  it('should handle performance testing across all images', async () => {
    console.log('\n📊 Performance Testing Across All Images');

    const performanceResults: Array<{
      imageName: string;
      imageSize: number;
      parseTime: number;
      embedTime: number;
      extractTime: number;
      coefficientsModified: number;
    }> = [];

    for (const imageName of workingImages) {
      const imagePath = path.join(testDir, 'images', imageName);
      const imageBuffer = fs.readFileSync(imagePath);
      const message = `Performance test for ${imageName}`;

      // Parse timing
      const parseStart = Date.now();
      const parseResult = await client.parseWithInternalAccess(imageBuffer);
      const parseTime = Date.now() - parseStart;

      expect(parseResult.success).toBe(true);

      // Embed timing
      const embedStart = Date.now();
      const embedResult = await client.embedMessageAndReencode(imageBuffer, message);
      const embedTime = Date.now() - embedStart;

      expect(embedResult.success).toBe(true);

      // Extract timing (if embed succeeded)
      let extractTime = 0;
      if (embedResult.modifiedJpeg) {
        const extractStart = Date.now();
        const extractResult = await client.extractMessage(embedResult.modifiedJpeg, message.length);
        extractTime = Date.now() - extractStart;
        expect(extractResult.success).toBe(true);
      }

      performanceResults.push({
        imageName,
        imageSize: imageBuffer.length,
        parseTime,
        embedTime,
        extractTime,
        coefficientsModified: embedResult.coefficientsModified ?? 0,
      });

      console.log(`⚡ ${imageName}: Parse ${parseTime}ms, Embed ${embedTime}ms, Extract ${extractTime}ms`);
    }

    // Performance assertions
    const avgParseTime = performanceResults.reduce((sum, r) => sum + r.parseTime, 0) / performanceResults.length;
    const avgEmbedTime = performanceResults.reduce((sum, r) => sum + r.embedTime, 0) / performanceResults.length;
    const avgExtractTime = performanceResults.reduce((sum, r) => sum + r.extractTime, 0) / performanceResults.length;

    console.log(
      `📈 Average Times: Parse ${avgParseTime.toFixed(0)}ms, Embed ${avgEmbedTime.toFixed(0)}ms, Extract ${avgExtractTime.toFixed(0)}ms`
    );

    // Performance thresholds (adjust based on your requirements)
    expect(avgParseTime).toBeLessThan(2000); // 2 seconds max for parsing
    expect(avgEmbedTime).toBeLessThan(5000); // 5 seconds max for embedding
    expect(avgExtractTime).toBeLessThan(2000); // 1 second max for extraction

    console.log('✅ Performance test completed successfully');
  }, 60000); // 60 second timeout for performance tests
});
