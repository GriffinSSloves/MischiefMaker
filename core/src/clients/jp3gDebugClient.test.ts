import { describe, test } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Jp3gDebugClient } from './jp3gDebugClient';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe.skip('JP3G Debug Tests', () => {
  test('should debug table structure for FacebookPFP.jpg', async () => {
    const client = new Jp3gDebugClient();

    // Load the smallest test image for debugging
    const imagePath = join(__dirname, '../../tests/images/FacebookPFP.jpg');
    const buffer = readFileSync(imagePath);
    const imageBuffer = new Uint8Array(buffer);

    await client.debugTableStructure(imageBuffer);
  });
});
