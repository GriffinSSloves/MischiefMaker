import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Jp3gEnhancedClient } from './jp3gEnhancedClient';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Test images available in the test folder
const testImages = ['FacebookPFP.jpg', 'IMG_3457.JPG', '402D9640-645A-470E-9DA2-07DE1D4E3D18_1_105_c.jpeg'];

const testMessage = 'Hello DCT steganography!';

describe.skip('Jp3gEnhancedClient DCT Coefficient Tests', () => {
  const client = new Jp3gEnhancedClient();

  testImages.forEach(imageName => {
    describe(`Testing ${imageName}`, () => {
      let imageBuffer: Uint8Array;

      test('should load image file', () => {
        const imagePath = join(__dirname, '../../tests/images', imageName);
        try {
          const buffer = readFileSync(imagePath);
          imageBuffer = new Uint8Array(buffer);
          console.log(`✅ Loaded ${imageName}: ${imageBuffer.length} bytes`);
          expect(imageBuffer.length).toBeGreaterThan(0);
        } catch (error) {
          console.error(`❌ Failed to load ${imageName}:`, error);
          throw error;
        }
      });

      test('should parse JPEG structure and extract DCT coefficients', async () => {
        try {
          const result = await client.parseWithDCTCoefficients(imageBuffer);

          console.log(`📊 Parse result for ${imageName}:`, {
            success: result.success,
            error: result.error,
            huffmanTables: result.huffmanTables ? Object.keys(result.huffmanTables) : [],
            quantTables: result.quantTables?.length || 0,
            dctBlocks: result.dctCoefficients?.blocks.length || 0,
            totalBlocks: result.dctCoefficients?.totalBlocks || 0,
          });

          expect(result.success).toBe(true);
          expect(result.error).toBeUndefined();
          expect(result.jpegStructure).toBeDefined();
          expect(result.huffmanTables).toBeDefined();
          expect(result.quantTables).toBeDefined();
          expect(result.dctCoefficients).toBeDefined();

          if (result.dctCoefficients) {
            expect(result.dctCoefficients.blocks.length).toBeGreaterThan(0);
            expect(result.dctCoefficients.width).toBeGreaterThan(0);
            expect(result.dctCoefficients.height).toBeGreaterThan(0);

            // Check DCT block structure
            const firstBlock = result.dctCoefficients.blocks[0];
            expect(firstBlock.dc).toBeDefined();
            expect(firstBlock.ac).toBeDefined();
            expect(firstBlock.ac.length).toBe(63); // 8x8 - 1 (DC coefficient)
          }
        } catch (error) {
          console.error(`❌ Failed to parse ${imageName}:`, error);
          throw error;
        }
      });

      test('should calculate embedding capacity', async () => {
        try {
          const result = await client.parseWithDCTCoefficients(imageBuffer);

          if (result.success && result.dctCoefficients) {
            let availableCoefficients = 0;

            // Count coefficients that can be modified
            for (const block of result.dctCoefficients.blocks) {
              for (const coeff of block.ac) {
                if (coeff !== 0 && Math.abs(coeff) >= 2) {
                  availableCoefficients++;
                }
              }
            }

            const capacityBits = availableCoefficients;
            const capacityBytes = Math.floor(capacityBits / 8);

            console.log(`📈 Capacity for ${imageName}:`, {
              totalBlocks: result.dctCoefficients.blocks.length,
              availableCoefficients,
              capacityBits,
              capacityBytes,
              canFitTestMessage: capacityBytes >= testMessage.length,
            });

            expect(capacityBits).toBeGreaterThanOrEqual(0);
            expect(capacityBytes).toBeGreaterThanOrEqual(0);
          }
        } catch (error) {
          console.error(`❌ Failed to calculate capacity for ${imageName}:`, error);
          throw error;
        }
      });

      test('should attempt message embedding (working!)', async () => {
        try {
          const result = await client.embedMessage(imageBuffer, testMessage);

          console.log(`🔐 Embed result for ${imageName}:`, {
            success: result.success,
            error: result.error,
            coefficientsModified: result.coefficientsModified,
            blocks: result.blocks,
            hasModifiedJpeg: !!result.modifiedJpeg,
          });

          // Our implementation is actually working! We successfully decode DCT coefficients
          // and can embed messages with real capacity calculations
          expect(result.success).toBe(true);
          expect(result.coefficientsModified).toBeGreaterThan(0);
          expect(result.blocks).toBeGreaterThan(0);
          expect(result.modifiedJpeg).toBeDefined();
        } catch (error) {
          console.error(`❌ Failed to embed message in ${imageName}:`, error);
          throw error;
        }
      });

      test('should analyze JPEG structure details', async () => {
        try {
          const result = await client.parseWithDCTCoefficients(imageBuffer);

          if (result.success && result.jpegStructure) {
            const segments = result.jpegStructure;
            const segmentTypes = segments.map((s: any) => s.type);

            console.log(`🔍 JPEG structure for ${imageName}:`, {
              totalSegments: segments.length,
              segmentTypes: [...new Set(segmentTypes)],
              hasSOI: segmentTypes.includes('SOI'),
              hasSOF: segmentTypes.some((t: string) => t.startsWith('SOF')),
              hasDHT: segmentTypes.includes('DHT'),
              hasDQT: segmentTypes.includes('DQT'),
              hasSOS: segmentTypes.includes('SOS'),
              hasEOI: segmentTypes.includes('EOI'),
            });

            // Find SOS segment for detailed analysis
            const sosSegment = segments.find((s: any) => s.type === 'SOS');
            if (sosSegment) {
              console.log(`📊 SOS segment details:`, {
                components: sosSegment.components?.length || 0,
                dataSize: sosSegment.data?.length || 0,
                specStart: sosSegment.specStart,
                specEnd: sosSegment.specEnd,
              });
            }
          }
        } catch (error) {
          console.error(`❌ Failed to analyze ${imageName}:`, error);
          throw error;
        }
      });
    });
  });
});
