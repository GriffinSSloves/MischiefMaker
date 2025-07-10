import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Jp3gDirectClient } from './jp3gDirectClient';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe.skip('Jp3gDirectClient Tests', () => {
  const client = new Jp3gDirectClient();

  test('should parse FacebookPFP.jpg successfully', async () => {
    const imagePath = join(__dirname, '../../tests/images/FacebookPFP.jpg');
    const imageBuffer = readFileSync(imagePath);

    console.log(`Testing FacebookPFP.jpg (${imageBuffer.length} bytes)`);

    const result = await client.parseWithDCTCoefficients(imageBuffer);

    expect(result.success).toBe(true);
    expect(result.dctCoefficients).toBeDefined();
    expect(result.huffmanTables).toBeDefined();
    expect(result.quantTables).toBeDefined();

    console.log('Parse result:', {
      success: result.success,
      blocks: result.dctCoefficients?.totalBlocks,
      huffmanTables: Object.keys(result.huffmanTables || {}),
      quantTables: result.quantTables?.length,
    });
  });

  test('should embed message successfully', async () => {
    const imagePath = join(__dirname, '../../tests/images/FacebookPFP.jpg');
    const imageBuffer = readFileSync(imagePath);

    const result = await client.embedMessage(imageBuffer, 'Test message');

    expect(result.success).toBe(true);
    expect(result.coefficientsModified).toBeGreaterThan(0);
    expect(result.blocks).toBeGreaterThan(0);

    console.log('Embed result:', {
      success: result.success,
      coefficientsModified: result.coefficientsModified,
      blocks: result.blocks,
    });
  });
});
