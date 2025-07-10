declare module 'f5stegojs' {
  export interface F5StegoAnalysis {
    capacity: number[];
    coeff_total: number;
    coeff_large: number;
  }

  export interface F5StegoEmbedResult {
    k: number;
    examined: number;
    changed: number;
    thrown: number;
    efficiency: string;
  }

  export default class F5Stego {
    constructor(key: number[]);
    parse(jpegBytes: Uint8Array): void;
    analyze(): F5StegoAnalysis;
    f5put(messageBytes: Uint8Array): F5StegoEmbedResult;
    f5get(): Uint8Array;
    pack(): Uint8Array;
  }
}
