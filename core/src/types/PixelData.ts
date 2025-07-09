/**
 * Image pixel data structure for steganography operations
 */
export interface PixelData {
  width: number;
  height: number;
  channels: {
    red: number[];
    green: number[];
    blue: number[];
  };
  totalPixels: number;
}
