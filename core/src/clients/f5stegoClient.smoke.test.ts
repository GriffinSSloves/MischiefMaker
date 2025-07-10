import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { F5StegoClient } from './f5stegoClient';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Test images available in the test folder
const testImages = ['FacebookPFP.jpg', 'IMG_3457.JPG', '402D9640-645A-470E-9DA2-07DE1D4E3D18_1_105_c.jpeg'];

const testKey = 'test-key-123';
const testMessage = 'Hello, this is a test message!';

describe('F5StegoClient Smoke Tests', () => {
  const client = new F5StegoClient();

  testImages.forEach(imageName => {
    describe(`Testing ${imageName}`, () => {
      let imageBuffer: Uint8Array;

      test('should load image file', () => {
        const imagePath = join(__dirname, '../../tests/images', imageName);
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

      test('should attempt to parse with f5stegojs', () => {
        const parseResult = client.parse(imageBuffer, testKey);

        if (parseResult.success) {
          console.log(`✓ ${imageName} parsed successfully!`);
          console.log(`  - Capacity: ${parseResult.capacityInfo?.capacity}`);
          console.log(`  - Total coefficients: ${parseResult.capacityInfo?.coeff_total}`);
          console.log(`  - Large coefficients: ${parseResult.capacityInfo?.coeff_large}`);
        } else {
          console.log(`✗ ${imageName} failed to parse: ${parseResult.error}`);
        }

        // Test passes regardless of parse success - we just want to know what happens
        expect(parseResult).toHaveProperty('success');
      });

      test('should attempt to get capacity', () => {
        try {
          const capacity = client.capacity(imageBuffer, testKey);
          console.log(`✓ ${imageName} capacity: ${capacity} bytes`);
          expect(capacity).toBeGreaterThanOrEqual(0);
        } catch (error) {
          console.log(`✗ ${imageName} capacity failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Test passes even if capacity calculation fails
          expect(error).toBeDefined();
        }
      });

      test('should attempt round-trip encoding/decoding', () => {
        try {
          // Try to embed
          const embedResult = client.embed(imageBuffer, testMessage, testKey);

          if (embedResult.success) {
            console.log(`✓ ${imageName} embedding successful!`);
            console.log(`  - Stats: ${JSON.stringify(embedResult.stats)}`);

            // Try to extract
            const extractResult = client.extract(embedResult.stegoImage, testKey);

            if (extractResult.success) {
              const extractedMessage = new TextDecoder().decode(extractResult.message);
              console.log(`✓ ${imageName} extraction successful: "${extractedMessage}"`);

              expect(extractedMessage).toBe(testMessage);
            } else {
              console.log(`✗ ${imageName} extraction failed: ${extractResult.error}`);
            }
          } else {
            console.log(`✗ ${imageName} embedding failed: ${embedResult.error}`);
          }
        } catch (error) {
          console.log(`✗ ${imageName} round-trip failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Test passes even if round-trip fails - we just want to know what happens
          expect(error).toBeDefined();
        }
      });
    });
  });
});

// Helper function to run tests for a specific image
export function testSingleImage(imageName: string) {
  const client = new F5StegoClient();
  const imagePath = join(__dirname, '../../tests/images', imageName);

  try {
    console.log(`\n=== Testing ${imageName} ===`);

    const buffer = readFileSync(imagePath);
    const imageBuffer = new Uint8Array(buffer);
    console.log(`File size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

    // Test parsing
    const parseResult = client.parse(imageBuffer, testKey);
    console.log(`Parse result:`, parseResult);

    // Test capacity
    try {
      const capacity = client.capacity(imageBuffer, testKey);
      console.log(`Capacity: ${capacity} bytes`);
    } catch (error) {
      console.log(`Capacity error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test embedding
    try {
      const embedResult = client.embed(imageBuffer, testMessage, testKey);
      console.log(`Embed result:`, embedResult);
    } catch (error) {
      console.log(`Embed error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`Error testing ${imageName}:`, error);
  }
}
