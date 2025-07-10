/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import jp3g from 'jp3g';

export class Jp3gDebugClient {
  /**
   * Debug jp3g table structure to understand the exact format
   */
  async debugTableStructure(imageBuffer: Uint8Array): Promise<void> {
    try {
      console.log('=== JP3G DEBUG: Parsing JPEG structure ===');
      const jpegStructure = await jp3g(imageBuffer).toObject();

      console.log(`Total segments: ${jpegStructure.length}`);

      for (let i = 0; i < jpegStructure.length; i++) {
        const segment = jpegStructure[i];
        console.log(`\nSegment ${i}: ${segment.type}`);

        if (segment.type === 'DHT') {
          console.log('=== DHT SEGMENT DEBUG ===');
          console.log('All properties:', Object.keys(segment));
          console.log('Raw segment:', JSON.stringify(segment, null, 2));
        }

        if (segment.type === 'DQT') {
          console.log('=== DQT SEGMENT DEBUG ===');
          console.log('All properties:', Object.keys(segment));
          console.log('Raw segment:', JSON.stringify(segment, null, 2));
        }

        if (segment.type === 'SOS') {
          console.log('=== SOS SEGMENT DEBUG ===');
          console.log('All properties:', Object.keys(segment));
          console.log('Data size:', segment.data?.length || 0);
          console.log('Components:', segment.components?.length || 0);
          if (segment.components) {
            console.log('Component details:', segment.components);
          }
        }
      }
    } catch (error) {
      console.error('Debug failed:', error);
    }
  }

  /**
   * Deep inspection of jp3g Huffman tree structure
   */
  inspectHuffmanTree(tree: any, tableName: string, maxDepth = 3): void {
    console.log(`\n🔍 DETAILED HUFFMAN TREE INSPECTION FOR ${tableName}:`);

    const inspectNode = (node: any, path: string, depth: number) => {
      if (depth > maxDepth) {
        console.log(`${path}: ... (truncated at depth ${maxDepth})`);
        return;
      }

      console.log(
        `${path}: ${typeof node} = ${Array.isArray(node) ? `[Array length ${node.length}]` : JSON.stringify(node)}`
      );

      if (Array.isArray(node)) {
        node.forEach((child, index) => {
          inspectNode(child, `${path}[${index}]`, depth + 1);
        });
      }
    };

    inspectNode(tree, 'root', 0);
  }
}
