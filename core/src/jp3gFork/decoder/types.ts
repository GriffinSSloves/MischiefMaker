import { HuffmanDecodeTree } from './utils/huffmanTable';

export interface IComponent {
  /** Decoded pixel lines after IDCT (8-bit) */
  lines: Uint8Array[];
  /** Horizontal sampling factor ratio (relative to frame maxH) */
  scaleX: number;
  /** Vertical sampling factor ratio (relative to frame maxV) */
  scaleY: number;
  /** Original quantised DCT blocks preserved by our fork */
  dctBlocks?: Int32Array[][];
  blocksPerLine: number;
  blocksPerColumn: number;
  quantizationTable?: Int32Array;
  /** Huffman decode tables attached during scan parsing */
  huffmanTableDC?: HuffmanDecodeTree;
  huffmanTableAC?: HuffmanDecodeTree;
  /** Running DC predictor used during progressive decoding */
  pred?: number;
}

export interface IJpegFrame {
  precision: number;
  samplesPerLine: number;
  scanLines: number;
  maxH: number;
  maxV: number;
  mcusPerLine: number;
  mcusPerColumn: number;
  components: Record<number, IComponent>;
  componentsOrder: number[];
  progressive: boolean;
  extended: boolean;
}

export type { HuffmanDecodeTree };
