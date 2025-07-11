import { idctBlock } from './idct';
import { requestMemoryAllocation } from './memoryManager';

interface IInternalComponent {
  blocksPerLine: number;
  blocksPerColumn: number;
  blocks: Int32Array[][];
  quantizationTable: Int32Array;
}

/**
 * Convert a component's quantised DCT blocks into 8×8 pixel lines (after IDCT).
 * Extracted from jp3gDecoder for reuse and unit-testing.
 */
export function buildComponentData(component: IInternalComponent): Uint8Array[] {
  const lines: Uint8Array[] = [];
  const { blocksPerLine, blocksPerColumn } = component;
  const samplesPerLine = blocksPerLine << 3; // ×8

  // Working buffer reused for every block
  const r = new Uint8Array(64);

  // Allocate memory guard (each sample is 1 byte)
  requestMemoryAllocation(samplesPerLine * blocksPerColumn * 8);

  for (let blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
    const scanLine = blockRow << 3; // ×8

    // Prepare space for 8 new output rows
    for (let i = 0; i < 8; i++) {
      lines.push(new Uint8Array(samplesPerLine));
    }

    for (let blockCol = 0; blockCol < blocksPerLine; blockCol++) {
      // Perform IDCT → r[64]
      idctBlock(component.blocks[blockRow][blockCol], component.quantizationTable, r);

      // Copy 8×8 block into target rows
      let offset = 0;
      const sample = blockCol << 3;
      for (let j = 0; j < 8; j++) {
        const line = lines[scanLine + j];
        for (let i = 0; i < 8; i++) {
          line[sample + i] = r[offset++];
        }
      }
    }
  }

  return lines;
}
