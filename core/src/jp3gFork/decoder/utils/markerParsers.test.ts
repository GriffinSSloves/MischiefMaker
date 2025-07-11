import { describe, it, expect } from 'vitest';
import {
  parseAPP0,
  parseAPP1,
  parseAPP14,
  parseSOF,
  parseDRI,
  parseDNL,
  parseSOSHeader,
  parseComment,
  readUint16,
  readDataBlock,
  type MarkerParseContext,
  type JfifData,
  type AdobeData,
} from './markerParsers';

describe('decoder/utils/markerParsers', () => {
  describe('readUint16', () => {
    it('should read a 16-bit value and advance offset', () => {
      const ctx: MarkerParseContext = {
        data: new Uint8Array([0x12, 0x34, 0x56, 0x78]),
        offset: 0,
        maxResolutionInPixels: 1000000,
      };

      const value = readUint16(ctx);
      expect(value).toBe(0x1234);
      expect(ctx.offset).toBe(2);

      const value2 = readUint16(ctx);
      expect(value2).toBe(0x5678);
      expect(ctx.offset).toBe(4);
    });
  });

  describe('readDataBlock', () => {
    it('should read a data block with length prefix', () => {
      const ctx: MarkerParseContext = {
        data: new Uint8Array([0x00, 0x06, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]),
        offset: 0,
        maxResolutionInPixels: 1000000,
      };

      const block = readDataBlock(ctx);
      expect(block).toEqual(new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd])); // length 6 - 2 = 4 bytes
      expect(ctx.offset).toBe(6);
    });
  });

  describe('parseAPP0', () => {
    it('should parse valid JPEG File Interchange Format data', () => {
      const jpegData = new Uint8Array([
        0x4a,
        0x46,
        0x49,
        0x46,
        0x00, // 'JPEG File Interchange Format header'
        0x01,
        0x02, // version 1.2
        0x01, // density units
        0x00,
        0x48, // x density 72
        0x00,
        0x48, // y density 72
        0x00, // thumb width 0
        0x00, // thumb height 0
      ]);

      const result = parseAPP0(jpegData);
      expect(result).toEqual({
        version: { major: 1, minor: 2 },
        densityUnits: 1,
        xDensity: 72,
        yDensity: 72,
        thumbWidth: 0,
        thumbHeight: 0,
        thumbData: new Uint8Array([]),
      } as JfifData);
    });

    it('should return null for non-JPEG File Interchange Format data', () => {
      const nonJpegData = new Uint8Array([0x41, 0x42, 0x43, 0x44, 0x00]);
      const result = parseAPP0(nonJpegData);
      expect(result).toBeNull();
    });
  });

  describe('parseAPP1', () => {
    it('should parse valid Exchangeable Image File Format data', () => {
      const exchangeableData = new Uint8Array([
        0x45,
        0x78,
        0x69,
        0x66,
        0x00, // 'Exchangeable Image File Format header'
        0x01,
        0x02,
        0x03,
        0x04, // some metadata
      ]);

      const result = parseAPP1(exchangeableData);
      expect(result).toEqual(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
    });

    it('should return null for non-Exchangeable Image File Format data', () => {
      const nonExchangeableData = new Uint8Array([0x41, 0x42, 0x43, 0x44, 0x00]);
      const result = parseAPP1(nonExchangeableData);
      expect(result).toBeNull();
    });
  });

  describe('parseAPP14', () => {
    it('should parse valid Adobe data', () => {
      const adobeData = new Uint8Array([
        0x41,
        0x64,
        0x6f,
        0x62,
        0x65,
        0x00, // 'Adobe\x00'
        0x64, // version
        0x00,
        0x01, // flags0
        0x00,
        0x02, // flags1
        0x01, // transform code
      ]);

      const result = parseAPP14(adobeData);
      expect(result).toEqual({
        version: 0x64,
        flags0: 0x0001,
        flags1: 0x0002,
        transformCode: 0x01,
      } as AdobeData);
    });

    it('should return null for non-Adobe data', () => {
      const nonAdobeData = new Uint8Array([0x41, 0x42, 0x43, 0x44, 0x45, 0x00]);
      const result = parseAPP14(nonAdobeData);
      expect(result).toBeNull();
    });
  });

  describe('parseSOF', () => {
    it('should parse a basic SOF0 frame header', () => {
      const ctx: MarkerParseContext = {
        data: new Uint8Array([
          0x00,
          0x11, // length 17
          0x08, // precision 8
          0x01,
          0x00, // scan lines 256
          0x01,
          0x00, // samples per line 256
          0x03, // 3 components
          // Component 1 (Y)
          0x01,
          0x22,
          0x00, // id=1, h=2, v=2, q=0
          // Component 2 (Cb)
          0x02,
          0x11,
          0x01, // id=2, h=1, v=1, q=1
          // Component 3 (Cr)
          0x03,
          0x11,
          0x01, // id=3, h=1, v=1, q=1
        ]),
        offset: 0,
        maxResolutionInPixels: 1000000,
      };

      const result = parseSOF(ctx, 0xffc0);
      expect(result.data.extended).toBe(false);
      expect(result.data.progressive).toBe(false);
      expect(result.data.precision).toBe(8);
      expect(result.data.scanLines).toBe(256);
      expect(result.data.samplesPerLine).toBe(256);
      expect(result.data.componentsOrder).toEqual([1, 2, 3]);
      expect(result.data.components[1]).toEqual({
        h: 2,
        v: 2,
        quantizationIdx: 0,
      });
      expect(result.data.components[2]).toEqual({
        h: 1,
        v: 1,
        quantizationIdx: 1,
      });
    });

    it('should detect progressive JPEG (SOF2)', () => {
      const ctx: MarkerParseContext = {
        data: new Uint8Array([
          0x00,
          0x08, // length 8
          0x08, // precision 8
          0x00,
          0x10, // scan lines 16
          0x00,
          0x10, // samples per line 16
          0x01, // 1 component
          0x01,
          0x11,
          0x00, // id=1, h=1, v=1, q=0
        ]),
        offset: 0,
        maxResolutionInPixels: 1000000,
      };

      const result = parseSOF(ctx, 0xffc2);
      expect(result.data.progressive).toBe(true);
    });

    it('should throw error when resolution limit exceeded', () => {
      const ctx: MarkerParseContext = {
        data: new Uint8Array([
          0x00,
          0x08, // length 8
          0x08, // precision 8
          0x10,
          0x00, // scan lines 4096
          0x10,
          0x00, // samples per line 4096 (total 16M pixels)
          0x01, // 1 component
          0x01,
          0x11,
          0x00, // id=1, h=1, v=1, q=0
        ]),
        offset: 0,
        maxResolutionInPixels: 1000000, // 1MP limit
      };

      expect(() => parseSOF(ctx, 0xffc0)).toThrow('maxResolutionInMP limit exceeded by 16MP');
    });
  });

  describe('parseDRI', () => {
    it('should parse restart interval', () => {
      const ctx: MarkerParseContext = {
        data: new Uint8Array([
          0x00,
          0x04, // length 4
          0x00,
          0x10, // restart interval 16
        ]),
        offset: 0,
        maxResolutionInPixels: 1000000,
      };

      const result = parseDRI(ctx);
      expect(result.data).toBe(16);
      expect(result.newOffset).toBe(4);
    });
  });

  describe('parseDNL', () => {
    it('should parse number of lines', () => {
      const ctx: MarkerParseContext = {
        data: new Uint8Array([
          0x00,
          0x04, // length 4
          0x01,
          0x00, // number of lines 256
        ]),
        offset: 0,
        maxResolutionInPixels: 1000000,
      };

      const result = parseDNL(ctx);
      expect(result.data).toBe(256);
      expect(result.newOffset).toBe(4);
    });
  });

  describe('parseSOSHeader', () => {
    it('should parse start of scan header', () => {
      const ctx: MarkerParseContext = {
        data: new Uint8Array([
          0x00,
          0x0c, // length 12
          0x03, // 3 components
          0x01,
          0x00, // component 1, table spec 0x00
          0x02,
          0x11, // component 2, table spec 0x11
          0x03,
          0x11, // component 3, table spec 0x11
          0x00, // spectral start
          0x3f, // spectral end
          0x00, // successive approximation
        ]),
        offset: 0,
        maxResolutionInPixels: 1000000,
      };

      const result = parseSOSHeader(ctx);
      expect(result.data.selectorsCount).toBe(3);
      expect(result.data.componentSelectors).toEqual([1, 0x00, 2, 0x11, 3, 0x11]);
      expect(result.data.spectralStart).toBe(0);
      expect(result.data.spectralEnd).toBe(0x3f);
      expect(result.data.successiveApproximation).toBe(0);
    });
  });

  describe('parseComment', () => {
    it('should parse comment text', () => {
      const commentData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // 'Hello'
      const result = parseComment(commentData);
      expect(result).toBe('Hello');
    });
  });
});
