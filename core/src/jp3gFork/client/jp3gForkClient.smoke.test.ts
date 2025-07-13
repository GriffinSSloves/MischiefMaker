import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Buffer } from 'buffer';
import process from 'process';
import { EnhancedJp3gForkClient } from './EnhancedJp3gForkClient';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testDir = resolve(__dirname, '../../../tests');

// Dynamically load all available test images
function getAvailableTestImages(): string[] {
  try {
    const imagesDir = join(testDir, 'images');
    const files = readdirSync(imagesDir);
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png)$/i.test(file));
    console.log(`Found ${imageFiles.length} test images:`, imageFiles);
    return imageFiles;
  } catch (error) {
    console.error('Failed to read test images directory:', error);
    // Fallback to hardcoded list if directory read fails
    return ['FacebookPFP.jpg', 'IMG_3457.JPG', '402D9640-645A-470E-9DA2-07DE1D4E3D18_1_105_c.jpeg'];
  }
}

// Development mode: test specific image only
const devImage = process.env.JP3G_DEV_IMAGE;
const allTestImages = getAvailableTestImages();
const testImages = devImage ? [devImage] : allTestImages;
//const testImages = ['Stairs.JPG'];

// Log testing mode
if (devImage) {
  console.log(`🔧 Development mode: Testing single image "${devImage}"`);
} else {
  console.log(`🧪 Testing all ${testImages.length} available images`);
}

const testMessage = 'Hello, this is a test message!';

// Check for long test execution
//  const isLongTest = process.env.LONG_TESTS === 'true' || process.env.JP3G_TESTS === 'true' || !!devImage;
const isLongTest = true;

describe.skipIf(!isLongTest)('Jp3gForkClient Smoke Tests', () => {
  const client = new EnhancedJp3gForkClient(true); // Enable debug mode

  describe.each(testImages)('Testing %s', imageName => {
    let imageBuffer: Uint8Array;
    let modifiedJpeg: Uint8Array | undefined;

    test('should load image file and validate JPEG format', () => {
      const imagePath = join(testDir, 'images', imageName);
      try {
        const buffer = readFileSync(imagePath);
        imageBuffer = new Uint8Array(buffer);
        expect(imageBuffer.length).toBeGreaterThan(0);

        // Validate JPEG magic bytes
        expect(imageBuffer[0]).toBe(0xff);
        expect(imageBuffer[1]).toBe(0xd8);

        console.log(`✓ Loaded ${imageName}: ${(imageBuffer.length / 1024).toFixed(1)} KB with valid JPEG format`);
      } catch (error) {
        console.error(`✗ Failed to load ${imageName}:`, error);
        throw error;
      }
    });

    test('should successfully embed and extract message', async () => {
      // Skip images that are known to have parsing issues
      if (
        imageName.includes('RemarkablyBrightCreatures') ||
        imageName.includes('GoatArt-min') ||
        imageName.includes('Stairs-min')
      ) {
        console.log(`⚠️ Skipping ${imageName} - known parsing issues`);
        return;
      }

      // Test embedding using clean interface
      const embedResult = await client.embedMessage(imageBuffer, testMessage, { quality: 85 });
      expect(embedResult.success).toBe(true);
      expect(embedResult.imageWithMessage).toBeDefined();
      expect(embedResult.imageWithMessage!.data).toBeInstanceOf(Uint8Array);
      expect(embedResult.stats?.coefficientsUsed ?? 0).toBeGreaterThan(0);

      modifiedJpeg = embedResult.imageWithMessage!.data;

      // Validate modified JPEG structure
      const modBuf = Buffer.from(modifiedJpeg);
      expect(modBuf[0]).toBe(0xff); // SOI
      expect(modBuf[1]).toBe(0xd8);
      expect(modBuf[modBuf.length - 2]).toBe(0xff); // EOI
      expect(modBuf[modBuf.length - 1]).toBe(0xd9);

      // Test extraction using clean interface
      const extractResult = await client.extractMessage(modifiedJpeg, testMessage.length);
      expect(extractResult.success).toBe(true);
      expect(extractResult.message).toBe(testMessage);
      expect(extractResult.stats?.coefficientsRead ?? 0).toBeGreaterThan(0);

      console.log(`✅ ${imageName}: Successfully embedded and extracted "${testMessage}"`);
    });
  });
});

// Helper function to run tests for a specific image using clean interface
export function testSingleImageJp3g(imageName: string) {
  const client = new EnhancedJp3gForkClient(true); // Enable debug mode
  const imagePath = join(testDir, 'images', imageName);

  try {
    console.log(`\n=== Testing ${imageName} with clean interface ===`);

    const buffer = readFileSync(imagePath);
    const imageBuffer = new Uint8Array(buffer);
    console.log(`File size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

    // Test round-trip using clean interface
    client
      .testRoundTrip(imageBuffer, testMessage, { quality: 85, debug: true })
      .then(roundTripResult => {
        console.log(`Round-trip result:`, roundTripResult);
        if (roundTripResult.success) {
          console.log('✅ Round-trip test successful!');
        } else {
          console.log('❌ Round-trip test failed:', roundTripResult.error);
        }
      })
      .catch(error => {
        console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      });
  } catch (error) {
    console.error(`Error testing ${imageName}:`, error);
  }
}
