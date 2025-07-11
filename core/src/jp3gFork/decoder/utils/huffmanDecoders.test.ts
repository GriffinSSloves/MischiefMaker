import { describe, test, expect } from 'vitest';
import { createHuffmanDecoders, IHuffmanContext, IScanComponent } from './huffmanDecoders';
import type { HuffmanDecodeTree } from './huffmanTable';

/**
 * Simple stub that returns predefined values from an array each time it is called.
 */
function makeStubDecoder(sequence: number[]): (tree: HuffmanDecodeTree) => number {
  let index = 0;
  return () => {
    if (index >= sequence.length) {
      throw new Error('decodeHuffman called more than expected');
    }
    return sequence[index++];
  };
}

describe('huffmanDecoders', () => {
  test('decodeBaseline sets DC coefficient and leaves AC zeros', () => {
    // Arrange: first call (DC) returns 3 (length 3 bits) so diff=0, second call (AC) returns 0 (EOB)
    const decodeSeq = [0 /* t=0 so diff 0 */, 0 /* EOB */];
    const ctx: IHuffmanContext = {
      decodeHuffman: makeStubDecoder(decodeSeq),
      readBit: () => 0,
      receive: () => 0,
      receiveAndExtend: () => 0,
      spectralStart: 0,
      spectralEnd: 63,
      successive: 0,
    } as any;

    const { decodeBaseline } = createHuffmanDecoders(ctx);

    const zz = new Int32Array(64);
    const dummyTree = {} as HuffmanDecodeTree;
    const component: IScanComponent = {
      huffmanTableDC: dummyTree,
      huffmanTableAC: dummyTree,
      pred: 0,
    };

    // Act
    decodeBaseline(component, zz);

    // Assert
    expect(zz[0]).toBe(0);
    for (let i = 1; i < 64; i++) {
      expect(zz[i]).toBe(0);
    }
  });

  test('decodeDCFirst updates predictor with left shift', () => {
    // DC code length 2, diff raw 1 -> receiveAndExtend stub returns 1
    const decodeSeq = [2 /* length */];
    const ctx: IHuffmanContext = {
      decodeHuffman: makeStubDecoder(decodeSeq),
      readBit: () => 0,
      receive: () => 1,
      receiveAndExtend: () => 1,
      spectralStart: 0,
      spectralEnd: 0,
      successive: 2,
    } as any;

    const { decodeDCFirst } = createHuffmanDecoders(ctx);

    const zz = new Int32Array(64);
    const dummyTree = {} as HuffmanDecodeTree;
    const component: IScanComponent = {
      huffmanTableDC: dummyTree,
      huffmanTableAC: dummyTree,
      pred: 0,
    };

    decodeDCFirst(component, zz);
    expect(zz[0]).toBe(4); // 1 << successive(2)
    expect(component.pred).toBe(4);
  });
});
