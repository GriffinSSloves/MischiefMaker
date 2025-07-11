import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Jp3gForkClient } from './jp3gForkClient';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Jp3gForkClient E2E', () => {
  it('should perform a full round-trip steganography cycle', async () => {
    // 1. Setup
    const client = new Jp3gForkClient();
    const imagePath = path.join(__dirname, '../../tests/images/FacebookPFP.jpg');
    const imageBuffer = fs.readFileSync(imagePath);
    const message = 'This is a secret message for the E2E test!';
    const outputDir = path.join(__dirname, '../../tests/output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const modifiedImagePath = path.join(outputDir, `e2e_modified_${timestamp}.jpg`);

    // 2. Embed the message
    const embedResult = await client.embedMessageAndReencode(imageBuffer, message);
    expect(embedResult.success).toBe(true);
    expect(embedResult.modifiedJpeg).toBeInstanceOf(Uint8Array);
    expect(embedResult.coefficientsModified ?? 0).toBeGreaterThan(0);

    if (!embedResult.modifiedJpeg) {
      throw new Error('Modified JPEG is undefined');
    }

    fs.writeFileSync(modifiedImagePath, embedResult.modifiedJpeg);
    console.log(`✅ E2E: Message embedded and saved to ${modifiedImagePath}`);

    // 3. Verify the modified image
    const modifiedImageBuffer = fs.readFileSync(modifiedImagePath);
    const verifyResult = await client.parseWithInternalAccess(modifiedImageBuffer);
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.error).toBeUndefined();
    console.log('✅ E2E: Modified JPEG is valid and parsable');

    // 4. Extract the message
    const extractResult = await client.extractMessage(modifiedImageBuffer, message.length);
    expect(extractResult.success).toBe(true);
    expect(extractResult.message).toBe(message);
    console.log(`✅ E2E: Message extracted successfully: "${extractResult.message}"`);
  });
});
