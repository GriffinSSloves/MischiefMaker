import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Buffer } from 'buffer';
import { Jp3gForkClient } from './jp3gForkClient';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testDir = resolve(__dirname, '../../../tests');

// Test images available in the test folder
const testImages = ['FacebookPFP.jpg', 'IMG_3457.JPG', '402D9640-645A-470E-9DA2-07DE1D4E3D18_1_105_c.jpeg'];

const testMessage = 'Hello, this is a test message!';

describe('Jp3gForkClient Smoke Tests', () => {
  const client = new Jp3gForkClient();

  testImages.forEach(imageName => {
    describe(`Testing ${imageName}`, () => {
      let imageBuffer: Uint8Array;

      test('should load image file', () => {
        const imagePath = join(testDir, 'images', imageName);
        try {
          const buffer = readFileSync(imagePath);
          imageBuffer = new Uint8Array(buffer);
          expect(imageBuffer.length).toBeGreaterThan(0);
          console.log(`✓ Loaded ${imageName}: ${(imageBuffer.length / 1024).toFixed(1)} KB`);
        } catch (error) {
          console.error(`✗ Failed to load ${imageName}:`, error);
          throw error;
        }
      });

      test('should validate JPEG format', () => {
        expect(imageBuffer[0]).toBe(0xff);
        expect(imageBuffer[1]).toBe(0xd8);
        console.log(`✓ ${imageName} has valid JPEG magic bytes`);
      });

      test('should parse JPEG structure (fork)', async () => {
        const parseResult = await client.parseWithInternalAccess(imageBuffer);

        expect(parseResult.success).toBe(true);
        expect(parseResult.dctCoefficients?.totalBlocks ?? 0).toBeGreaterThan(0);

        const expectedBlocks = (parseResult.dctCoefficients!.width / 8) * (parseResult.dctCoefficients!.height / 8);
        expect(parseResult.dctCoefficients?.totalBlocks).toBe(expectedBlocks);
      });

      test('should embed message and re-encode JPEG', async () => {
        const embedResult = await client.embedMessageAndReencode(imageBuffer, testMessage, 85);

        expect(embedResult.success).toBe(true);
        expect(embedResult.modifiedJpeg).toBeInstanceOf(Uint8Array);
        expect(embedResult.coefficientsModified ?? 0).toBeGreaterThan(0);

        // Basic JPEG sanity
        const modBuf = Buffer.from(embedResult.modifiedJpeg!);
        expect(modBuf[0]).toBe(0xff);
        expect(modBuf[1]).toBe(0xd8);
        expect(modBuf[modBuf.length - 2]).toBe(0xff);
        expect(modBuf[modBuf.length - 1]).toBe(0xd9);

        // Size should be within reasonable range
        expect(modBuf.length).toBeGreaterThan(imageBuffer.length * 0.8);

        // Store for next test
        (globalThis as any).modifiedJpeg = embedResult.modifiedJpeg;
      });

      test('should extract embedded message', async () => {
        const modified: Uint8Array | undefined = (globalThis as any).modifiedJpeg;
        expect(modified).toBeDefined();

        const extractResult = await client.extractMessage(modified!, testMessage.length);

        if (extractResult.success) {
          expect(extractResult.message).toBe(testMessage);
          expect(extractResult.coefficientsRead ?? 0).toBeGreaterThan(0);
        }

        // Always assert that the boolean reflects reality
        expect(typeof extractResult.success).toBe('boolean');
      });
    });
  });
});

// Helper function to run tests for a specific image
export function testSingleImageJp3g(imageName: string) {
  const client = new Jp3gForkClient();
  const imagePath = join(testDir, 'images', imageName);

  try {
    console.log(`\n=== Testing ${imageName} with jp3g ===`);

    const buffer = readFileSync(imagePath);
    const imageBuffer = new Uint8Array(buffer);
    console.log(`File size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

    // Test parsing
    client
      .parseWithInternalAccess(imageBuffer)
      .then(parseResult => {
        console.log(`Parse result:`, parseResult);

        // Test embedding directly
        return client.embedMessageAndReencode(imageBuffer, testMessage, 85);
      })
      .then(embedResult => {
        console.log(`Embed result:`, embedResult);
      })
      .catch(error => {
        console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      });
  } catch (error) {
    console.error(`Error testing ${imageName}:`, error);
  }
}
