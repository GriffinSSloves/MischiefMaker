import { DCT_ZIG_ZAG as dctZigZag } from '../../constants/decoderConstants';
import type { HuffmanDecodeTree } from './huffmanTable';

export interface IHuffmanContext {
  decodeHuffman: (tree: HuffmanDecodeTree) => number;
  receive: (length: number) => number | undefined;
  receiveAndExtend: (length: number) => number;
  readBit: () => number | null;
  spectralStart: number;
  spectralEnd: number;
  successive: number;
}

export interface IScanComponent {
  huffmanTableDC: HuffmanDecodeTree;
  huffmanTableAC: HuffmanDecodeTree;
  pred?: number;
}

/**
 * Factory that returns the five MCU/Block Huffman decoders used by jp3g.
 * State (eobrun & successive-AC bookkeeping) is captured in the closure so
 * each scan gets its own independent instance.
 */
export function createHuffmanDecoders(ctx: IHuffmanContext) {
  const { decodeHuffman, receive, receiveAndExtend, readBit, spectralStart, spectralEnd, successive } = ctx;

  // Progressive AC state shared across calls
  let eobrun = 0;
  let successiveACState = 0;
  let successiveACNextValue = 0;

  function decodeBaseline(component: IScanComponent, zz: Int32Array): void {
    const t = decodeHuffman(component.huffmanTableDC);
    const diff = t === 0 ? 0 : receiveAndExtend(t);
    zz[0] = component.pred = (component.pred ?? 0) + diff;

    let k = 1;
    while (k < 64) {
      const rs = decodeHuffman(component.huffmanTableAC);
      const s = rs & 15;
      const r = rs >> 4;
      if (s === 0) {
        if (r < 15) {
          break;
        }
        k += 16;
        continue;
      }
      k += r;
      const z = dctZigZag[k];
      zz[z] = receiveAndExtend(s);
      k++;
    }
  }

  function decodeDCFirst(component: IScanComponent, zz: Int32Array): void {
    const t = decodeHuffman(component.huffmanTableDC);
    const diff = t === 0 ? 0 : receiveAndExtend(t) << successive;
    zz[0] = component.pred = (component.pred ?? 0) + diff;
  }

  function decodeDCSuccessive(component: IScanComponent, zz: Int32Array): void {
    const bit = readBit();
    if (bit !== null) {
      zz[0] |= bit << successive;
    }
  }

  function decodeACFirst(component: IScanComponent, zz: Int32Array): void {
    if (eobrun > 0) {
      eobrun--;
      return;
    }
    let k = spectralStart;
    const e = spectralEnd;
    while (k <= e) {
      const rs = decodeHuffman(component.huffmanTableAC);
      const s = rs & 15;
      const r = rs >> 4;
      if (s === 0) {
        if (r < 15) {
          eobrun = (receive(r) ?? 0) + (1 << r) - 1;
          break;
        }
        k += 16;
        continue;
      }
      k += r;
      const z = dctZigZag[k];
      zz[z] = receiveAndExtend(s) * (1 << successive);
      k++;
    }
  }

  function decodeACSuccessive(component: IScanComponent, zz: Int32Array): void {
    let k = spectralStart;
    const e = spectralEnd;
    let r = 0;
    while (k <= e) {
      const z = dctZigZag[k];
      const direction = zz[z] < 0 ? -1 : 1;
      switch (successiveACState) {
        case 0: {
          const rs = decodeHuffman(component.huffmanTableAC);
          const s = rs & 15;
          r = rs >> 4;
          if (s === 0) {
            if (r < 15) {
              eobrun = (receive(r) ?? 0) + (1 << r);
              successiveACState = 4;
            } else {
              r = 16;
              successiveACState = 1;
            }
          } else {
            if (s !== 1) {
              throw new Error('invalid ACn encoding');
            }
            successiveACNextValue = receiveAndExtend(s);
            successiveACState = r ? 2 : 3;
          }
          continue;
        }
        case 1: // skipping r zero items
        case 2:
          if (zz[z]) {
            const bit = readBit();
            if (bit !== null) {
              zz[z] += bit << (successive * direction);
            }
          } else {
            r--;
            if (r === 0) {
              successiveACState = successiveACState === 2 ? 3 : 0;
            }
          }
          break;
        case 3: // set value for a zero item
          if (zz[z]) {
            const bit = readBit();
            if (bit !== null) {
              zz[z] += bit << (successive * direction);
            }
          } else {
            zz[z] = successiveACNextValue << successive;
            successiveACState = 0;
          }
          break;
        case 4: // eob
          if (zz[z]) {
            const bit = readBit();
            if (bit !== null) {
              zz[z] += bit << (successive * direction);
            }
          }
          break;
      }
      k++;
    }
    if (successiveACState === 4) {
      eobrun--;
      if (eobrun === 0) {
        successiveACState = 0;
      }
    }
  }

  return {
    decodeBaseline,
    decodeDCFirst,
    decodeDCSuccessive,
    decodeACFirst,
    decodeACSuccessive,
  } as const;
}
