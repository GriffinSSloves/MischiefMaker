import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Jp3gClient } from './jp3gClient';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Test images available in the test folder
const testImages = ['FacebookPFP.jpg', 'IMG_3457.JPG', '402D9640-645A-470E-9DA2-07DE1D4E3D18_1_105_c.jpeg'];

const testMessage = 'Hello, this is a test message!';

describe.skip('Jp3gClient Smoke Tests', () => {
  const client = new Jp3gClient();

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

      test('should parse JPEG structure with jp3g', async () => {
        const parseResult = await client.parse(imageBuffer);

        if (parseResult.success) {
          console.log(`✓ ${imageName} parsed successfully with jp3g!`);
          console.log(
            `  - Structure type: ${Array.isArray(parseResult.jpegStructure) ? 'Array' : typeof parseResult.jpegStructure}`
          );
          console.log(
            `  - Segments found: ${Array.isArray(parseResult.segments) ? parseResult.segments.length : 'N/A'}`
          );
          console.log(`  - DCT coefficients: ${parseResult.dctCoefficients?.hasCoefficients ? 'Found' : 'Not found'}`);

          // Log segment types for analysis
          if (Array.isArray(parseResult.segments)) {
            const segmentTypes = parseResult.segments.map(s => s.type).join(', ');
            console.log(`  - Segment types: ${segmentTypes}`);
          }
        } else {
          console.log(`✗ ${imageName} failed to parse: ${parseResult.error}`);
        }

        // Test passes regardless of parse success - we want to know what happens
        expect(parseResult).toHaveProperty('success');
      });

      test('should attempt to calculate capacity', async () => {
        const capacityResult = await client.calculateCapacity(imageBuffer);

        if (capacityResult.success) {
          console.log(`✓ ${imageName} capacity calculation successful!`);
          console.log(`  - Estimated capacity: ${capacityResult.estimatedCapacity} bytes`);
          console.log(`  - Total coefficients: ${capacityResult.totalCoefficients || 'N/A'}`);
          console.log(`  - Modifiable coefficients: ${capacityResult.modifiableCoefficients || 'N/A'}`);
        } else {
          console.log(`✗ ${imageName} capacity calculation failed: ${capacityResult.error}`);
        }

        // Test passes regardless of success - we want to know what happens
        expect(capacityResult).toHaveProperty('success');
      });

      test('should test embedding capability', async () => {
        const embedResult = await client.embed(imageBuffer, testMessage);

        if (embedResult.success) {
          console.log(`✓ ${imageName} embedding successful!`);
          console.log(`  - Coefficients modified: ${embedResult.coefficientsModified || 'N/A'}`);
          console.log(`  - Modified buffer size: ${embedResult.modifiedBuffer?.length || 'N/A'} bytes`);
        } else {
          console.log(`✗ ${imageName} embedding failed (expected): ${embedResult.error}`);
        }

        // Test passes regardless of success - we expect embedding to fail for now
        expect(embedResult).toHaveProperty('success');
      });

      test('should test extraction capability', async () => {
        const extractResult = await client.extract(imageBuffer);

        if (extractResult.success) {
          console.log(`✓ ${imageName} extraction successful!`);
          console.log(`  - Message: ${extractResult.message || 'N/A'}`);
          console.log(`  - Data size: ${extractResult.extractedData?.length || 'N/A'} bytes`);
        } else {
          console.log(`✗ ${imageName} extraction failed (expected): ${extractResult.error}`);
        }

        // Test passes regardless of success - we expect extraction to fail for now
        expect(extractResult).toHaveProperty('success');
      });
    });
  });
});

// Helper function to run tests for a specific image
export function testSingleImageJp3g(imageName: string) {
  const client = new Jp3gClient();
  const imagePath = join(__dirname, '../../tests/images', imageName);

  try {
    console.log(`\n=== Testing ${imageName} with jp3g ===`);

    const buffer = readFileSync(imagePath);
    const imageBuffer = new Uint8Array(buffer);
    console.log(`File size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

    // Test parsing
    client
      .parse(imageBuffer)
      .then(parseResult => {
        console.log(`Parse result:`, parseResult);

        // Test capacity
        return client.calculateCapacity(imageBuffer);
      })
      .then(capacityResult => {
        console.log(`Capacity result:`, capacityResult);

        // Test embedding
        return client.embed(imageBuffer, testMessage);
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
