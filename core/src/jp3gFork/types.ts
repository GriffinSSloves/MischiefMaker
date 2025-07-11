// Shared type definitions for jp3gFork encoder / decoder layer
import { Buffer } from 'buffer';
// ---------------------------------------------------------------------------

/** Raw RGBA image buffer expected by `JPEGEncoder.encode()`. */
export interface IRgbaImage {
  width: number;
  height: number;
  /** Flat RGBA byte array – length === width * height * 4. */
  data: Uint8Array;
  /** Optional JPEG comment strings to embed (one COM segment per entry). */
  comments?: string[];
  /** Optional EXIF payload (already includes the "Exif\0" leader if present). */
  exifBuffer?: Uint8Array | null;
}

/** Optional metadata object accepted by `JPEGEncoder.encodeFromDCT()`. */
export interface IEncodeMetadata {
  width: number;
  height: number;
  /** Luma and (optionally) Chroma quant tables, 64 entries each. */
  quantizationTables?: [number[] /* Y */, number[] /* Cb/Cr */?];
  /** Horizontal sampling factor for Cb/Cr relative to Y (e.g. 2 for 4:2:0). */
  hSampRatio?: number;
  /** Vertical sampling factor for Cb/Cr relative to Y. */
  vSampRatio?: number;
  comments?: string[];
  exif?: Uint8Array | null;
}

/** A single 8×8 quantised DCT block (length-64 array). */
export type QuantBlock = number[] & { length: 64 };

/** 2-D matrix of blocks for one component (rows × columns). */
export type ComponentBlocks = QuantBlock[][];

/** Tuple in Y, Cb, Cr order used by encodeFromDCT(). */
export type QuantizedComponents = [ComponentBlocks, ComponentBlocks, ComponentBlocks];

/** Minimal public API contract for the encoder. */
export interface IJpegEncoder {
  encode(image: IRgbaImage, quality?: number): Uint8Array | Buffer;
  encodeFromDCT(
    blocks: QuantizedComponents | { components: unknown[] },
    metadata?: Partial<IEncodeMetadata>,
    quality?: number
  ): Uint8Array | Buffer;
}
