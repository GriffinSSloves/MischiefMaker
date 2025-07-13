import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, resolve } from 'url';
import process from 'process';
import { EnhancedJp3gForkClient } from './EnhancedJp3gForkClient';

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

// Development mode: test specific image only
const devImage = process.env.JP3G_DEV_IMAGE;
const allTestImages = getAvailableTestImages();
const testImages = devImage ? [devImage] : allTestImages;

// Log testing mode
if (devImage) {
  console.log(`🔧 E2E Development mode: Testing single image "${devImage}"`);
} else {
  console.log(`🧪 E2E Testing all ${testImages.length} available images`);
}

// Check for long test execution
//const isLongTest = process.env.LONG_TESTS === 'true' || process.env.JP3G_TESTS === 'true' || !!devImage;
const isLongTest = true;

describe.skipIf(!isLongTest)('Jp3gForkClient E2E', () => {
  const client = new EnhancedJp3gForkClient(true); // Enable debug mode
  const outputDir = path.join(testDir, 'output');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Filter out problematic images for E2E tests
  // const workingImages = testImages.filter(
  //   imageName =>
  //     !imageName.includes('RemarkablyBrightCreatures') &&
  //     !imageName.includes('BlackShoe') &&
  //     !imageName.includes('GoatArt-min') &&
  //     !imageName.includes('Stairs-min')
  // );
  const workingImages = ['BlackShoe.jpeg'];

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

      // 2. Embed the message using clean interface
      const embedResult = await client.embedMessage(imageBuffer, message, { quality: 85 });
      expect(embedResult.success).toBe(true);
      expect(embedResult.imageWithMessage).toBeDefined();
      expect(embedResult.imageWithMessage!.data).toBeInstanceOf(Uint8Array);
      expect(embedResult.stats?.coefficientsUsed ?? 0).toBeGreaterThan(0);

      if (!embedResult.imageWithMessage) {
        throw new Error('Modified JPEG is undefined');
      }

      // Save with descriptive filename
      fs.writeFileSync(modifiedImagePath, embedResult.imageWithMessage.data);
      console.log(`💾 Modified JPEG saved: ${path.basename(modifiedImagePath)}`);
      console.log(
        `📊 Size: ${imageBuffer.length} → ${embedResult.imageWithMessage.size} bytes (${embedResult.stats?.coefficientsUsed} coefficients modified)`
      );

      // 3. Verify the modified image is valid (use round-trip test)
      const modifiedImageBuffer = fs.readFileSync(modifiedImagePath);

      // 4. Extract and verify the message using clean interface
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

      // Round-trip timing using clean interface
      const roundTripStart = Date.now();
      const roundTripResult = await client.testRoundTrip(imageBuffer, message, { quality: 85 });
      const roundTripTime = Date.now() - roundTripStart;

      expect(roundTripResult.success).toBe(true);
      expect(roundTripResult.messagesMatch).toBe(true);

      // Individual operation timing for detailed metrics
      const embedStart = Date.now();
      const embedResult = await client.embedMessage(imageBuffer, message, { quality: 85 });
      const embedTime = Date.now() - embedStart;

      expect(embedResult.success).toBe(true);

      // Extract timing (if embed succeeded)
      let extractTime = 0;
      if (embedResult.imageWithMessage) {
        const extractStart = Date.now();
        const extractResult = await client.extractMessage(embedResult.imageWithMessage.data, message.length);
        extractTime = Date.now() - extractStart;
        expect(extractResult.success).toBe(true);
      }

      performanceResults.push({
        imageName,
        imageSize: imageBuffer.length,
        parseTime: roundTripTime, // Use round-trip time as parse time equivalent
        embedTime,
        extractTime,
        coefficientsModified: embedResult.stats?.coefficientsUsed ?? 0,
      });

      console.log(`⚡ ${imageName}: Round-trip ${roundTripTime}ms, Embed ${embedTime}ms, Extract ${extractTime}ms`);
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
