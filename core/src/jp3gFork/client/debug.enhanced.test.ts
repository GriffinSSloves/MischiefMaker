import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { EnhancedJp3gForkClient } from './EnhancedJp3gForkClient';
import { nodeBufferAdapter } from '../../utils/NodeBufferAdapter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testDir = resolve(__dirname, '../../../tests');

describe.skip('Enhanced Client Debug', () => {
  const enhancedClient = new EnhancedJp3gForkClient({ bufferAdapter: nodeBufferAdapter, debugMode: true });

  it('should debug enhanced client with BlackShoe.jpeg', async () => {
    const imagePath = join(testDir, 'images', 'BlackShoe.jpeg');
    const imageBuffer = new Uint8Array(readFileSync(imagePath));
    const message = 'Test message';

    console.log('\n=== DEBUGGING ENHANCED CLIENT ===');
    console.log(`Image: BlackShoe.jpeg, Message: "${message}"`);

    const result = await enhancedClient.testRoundTrip(imageBuffer, message);

    console.log('\n=== RESULT ===');
    console.log('Success:', result.success);
    console.log('Messages match:', result.messagesMatch);
    console.log('Original:', result.originalMessage);
    console.log('Extracted:', result.extractedMessage);

    // TODO: Fix this test, if it should actually be there.
    // if (result.embedStats) {
    //   console.log('\n=== EMBED STATS ===');
    //   console.log('Coefficients modified:', result.embedStats.coefficientsModified);
    //   console.log('Coefficients skipped:', result.embedStats.coefficientsSkipped);
    //   console.log('Embedding efficiency:', result.embedStats.embeddingEfficiency.toFixed(2) + '%');
    //   console.log('Perceptual weight:', result.embedStats.averagePerceptualWeight.toFixed(2));
    // }

    expect(result.success).toBe(true);
    expect(result.messagesMatch).toBe(true);
  });
});
