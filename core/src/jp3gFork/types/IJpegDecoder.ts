export interface IJpegDecoderComponent {
  /**
   * 3-D array rows × cols × 64 holding 8×8 DCT coefficient blocks preserved by our fork.
   */
  dctBlocks?: number[][][];
  /**
   * Original jp3g internal blocks array (if fork didn't preserve `dctBlocks`).
   */
  blocks?: number[][][];
  /** Number of horizontal blocks in the component */
  blocksPerLine?: number;
  /** Number of vertical blocks in the component */
  blocksPerColumn?: number;
  /** Quantization table for this component */
  quantizationTable?: Int32Array | number[];
  /** Component scale factors */
  scaleX?: number;
  scaleY?: number;
}

export interface IJpegInternalDecoder {
  width: number;
  height: number;
  components: IJpegDecoderComponent[];
  /** JPEG comments */
  comments?: string[];
  /** EXIF data buffer */
  exifBuffer?: Uint8Array | null;
}
