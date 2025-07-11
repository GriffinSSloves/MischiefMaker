/* eslint-disable */
// @ts-nocheck
/*
  Copyright (c) 2008, Adobe Systems Incorporated
  All rights reserved.

  Redistribution and use in source and binary forms, with or without 
  modification, are permitted provided that the following conditions are
  met:

  * Redistributions of source code must retain the above copyright notice, 
    this list of conditions and the following disclaimer.
  
  * Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in the 
    documentation and/or other materials provided with the distribution.
  
  * Neither the name of Adobe Systems Incorporated nor the names of its 
    contributors may be used to endorse or promote products derived from 
    this software without specific prior written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
  IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR 
  CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
/*
JPEG encoder ported to JavaScript and optimized by Andreas Ritter, www.bytestrom.eu, 11/2009

Basic GUI blocking jpeg encoder
*/

import { ZIG_ZAG } from './constants';
import {
  STD_DC_LUMINANCE_NRCODES,
  STD_DC_LUMINANCE_VALUES,
  STD_AC_LUMINANCE_NRCODES,
  STD_AC_LUMINANCE_VALUES,
  STD_DC_CHROMINANCE_NRCODES,
  STD_DC_CHROMINANCE_VALUES,
  STD_AC_CHROMINANCE_NRCODES,
  STD_AC_CHROMINANCE_VALUES,
} from './huffmanConstants';
import { Y_LUMA_QT_BASE, UV_CHROMA_QT_BASE, AA_SF } from './quantTables';
import { computeHuffmanTable, generateHuffmanNrcodesValues } from './huffmanUtils';
import { buildCategoryAndBitcode } from './bitcodeUtils';

var btoa =
  btoa ||
  function (buf) {
    return Buffer.from(buf).toString('base64');
  };

function JPEGEncoder(quality) {
  var self = this;
  var fround = Math.round;
  var ffloor = Math.floor;
  var YTable = new Array(64);
  var UVTable = new Array(64);
  var fdtbl_Y = new Array(64);
  var fdtbl_UV = new Array(64);
  var YDC_HT;
  var UVDC_HT;
  var YAC_HT;
  var UVAC_HT;

  var bitcode = new Array(65535);
  var category = new Array(65535);
  var outputfDCTQuant = new Array(64);
  var DU = new Array(64);
  var byteout = [];
  var bytenew = 0;
  var bytepos = 7;

  var YDU = new Array(64);
  var UDU = new Array(64);
  var VDU = new Array(64);
  var clt = new Array(256);
  var RGB_YUV_TABLE = new Array(2048);
  var currentQuality;

  var ZigZag = ZIG_ZAG;

  var std_dc_luminance_nrcodes = Array.from(STD_DC_LUMINANCE_NRCODES);
  var std_dc_luminance_values = Array.from(STD_DC_LUMINANCE_VALUES);
  var std_ac_luminance_nrcodes = Array.from(STD_AC_LUMINANCE_NRCODES);
  var std_ac_luminance_values = Array.from(STD_AC_LUMINANCE_VALUES);

  var std_dc_chrominance_nrcodes = Array.from(STD_DC_CHROMINANCE_NRCODES);
  var std_dc_chrominance_values = Array.from(STD_DC_CHROMINANCE_VALUES);
  var std_ac_chrominance_nrcodes = Array.from(STD_AC_CHROMINANCE_NRCODES);
  var std_ac_chrominance_values = Array.from(STD_AC_CHROMINANCE_VALUES);

  function initQuantTables(sf) {
    var YQT = Y_LUMA_QT_BASE;
    for (var i = 0; i < 64; i++) {
      var t = ffloor((YQT[i] * sf + 50) / 100);
      if (t < 1) {
        t = 1;
      } else if (t > 255) {
        t = 255;
      }
      YTable[ZigZag[i]] = t;
    }
    var UVQT = UV_CHROMA_QT_BASE;
    for (var j = 0; j < 64; j++) {
      var u = ffloor((UVQT[j] * sf + 50) / 100);
      if (u < 1) {
        u = 1;
      } else if (u > 255) {
        u = 255;
      }
      UVTable[ZigZag[j]] = u;
    }
    var aasf = AA_SF;
    var k = 0;
    for (var row = 0; row < 8; row++) {
      for (var col = 0; col < 8; col++) {
        fdtbl_Y[k] = 1.0 / (YTable[ZigZag[k]] * aasf[row] * aasf[col] * 8.0);
        fdtbl_UV[k] = 1.0 / (UVTable[ZigZag[k]] * aasf[row] * aasf[col] * 8.0);
        k++;
      }
    }
  }

  const computeHuffmanTbl = computeHuffmanTable as any;

  function initHuffmanTbl() {
    YDC_HT = computeHuffmanTbl(std_dc_luminance_nrcodes, std_dc_luminance_values);
    UVDC_HT = computeHuffmanTbl(std_dc_chrominance_nrcodes, std_dc_chrominance_values);
    YAC_HT = computeHuffmanTbl(std_ac_luminance_nrcodes, std_ac_luminance_values);
    UVAC_HT = computeHuffmanTbl(std_ac_chrominance_nrcodes, std_ac_chrominance_values);
  }

  function initCategoryNumber() {
    const { category: catTbl, bitcode: bcTbl } = buildCategoryAndBitcode();
    category = catTbl;
    bitcode = bcTbl as any;
  }

  function initRGBYUVTable() {
    for (var i = 0; i < 256; i++) {
      RGB_YUV_TABLE[i] = 19595 * i;
      RGB_YUV_TABLE[(i + 256) >> 0] = 38470 * i;
      RGB_YUV_TABLE[(i + 512) >> 0] = 7471 * i + 0x8000;
      RGB_YUV_TABLE[(i + 768) >> 0] = -11059 * i;
      RGB_YUV_TABLE[(i + 1024) >> 0] = -21709 * i;
      RGB_YUV_TABLE[(i + 1280) >> 0] = 32768 * i + 0x807fff;
      RGB_YUV_TABLE[(i + 1536) >> 0] = -27439 * i;
      RGB_YUV_TABLE[(i + 1792) >> 0] = -5329 * i;
    }
  }

  // IO functions
  function writeBits(bs) {
    var value = bs[0];
    var posval = bs[1] - 1;
    while (posval >= 0) {
      if (value & (1 << posval)) {
        bytenew |= 1 << bytepos;
      }
      posval--;
      bytepos--;
      if (bytepos < 0) {
        if (bytenew == 0xff) {
          writeByte(0xff);
          writeByte(0);
        } else {
          writeByte(bytenew);
        }
        bytepos = 7;
        bytenew = 0;
      }
    }
  }

  function writeByte(value) {
    //byteout.push(clt[value]); // write char directly instead of converting later
    byteout.push(value);
  }

  function writeWord(value) {
    writeByte((value >> 8) & 0xff);
    writeByte(value & 0xff);
  }

  // DCT & quantization core
  function fDCTQuant(data, fdtbl) {
    var d0, d1, d2, d3, d4, d5, d6, d7;
    /* Pass 1: process rows. */
    var dataOff = 0;
    var i;
    var I8 = 8;
    var I64 = 64;
    for (i = 0; i < I8; ++i) {
      d0 = data[dataOff];
      d1 = data[dataOff + 1];
      d2 = data[dataOff + 2];
      d3 = data[dataOff + 3];
      d4 = data[dataOff + 4];
      d5 = data[dataOff + 5];
      d6 = data[dataOff + 6];
      d7 = data[dataOff + 7];

      var tmp0 = d0 + d7;
      var tmp7 = d0 - d7;
      var tmp1 = d1 + d6;
      var tmp6 = d1 - d6;
      var tmp2 = d2 + d5;
      var tmp5 = d2 - d5;
      var tmp3 = d3 + d4;
      var tmp4 = d3 - d4;

      /* Even part */
      var tmp10 = tmp0 + tmp3; /* phase 2 */
      var tmp13 = tmp0 - tmp3;
      var tmp11 = tmp1 + tmp2;
      var tmp12 = tmp1 - tmp2;

      data[dataOff] = tmp10 + tmp11; /* phase 3 */
      data[dataOff + 4] = tmp10 - tmp11;

      var z1 = (tmp12 + tmp13) * 0.707106781; /* c4 */
      data[dataOff + 2] = tmp13 + z1; /* phase 5 */
      data[dataOff + 6] = tmp13 - z1;

      /* Odd part */
      tmp10 = tmp4 + tmp5; /* phase 2 */
      tmp11 = tmp5 + tmp6;
      tmp12 = tmp6 + tmp7;

      /* The rotator is modified from fig 4-8 to avoid extra negations. */
      var z5 = (tmp10 - tmp12) * 0.382683433; /* c6 */
      var z2 = 0.5411961 * tmp10 + z5; /* c2-c6 */
      var z4 = 1.306562965 * tmp12 + z5; /* c2+c6 */
      var z3 = tmp11 * 0.707106781; /* c4 */

      var z11 = tmp7 + z3; /* phase 5 */
      var z13 = tmp7 - z3;

      data[dataOff + 5] = z13 + z2; /* phase 6 */
      data[dataOff + 3] = z13 - z2;
      data[dataOff + 1] = z11 + z4;
      data[dataOff + 7] = z11 - z4;

      dataOff += 8; /* advance pointer to next row */
    }

    /* Pass 2: process columns. */
    dataOff = 0;
    for (i = 0; i < I8; ++i) {
      d0 = data[dataOff];
      d1 = data[dataOff + 8];
      d2 = data[dataOff + 16];
      d3 = data[dataOff + 24];
      d4 = data[dataOff + 32];
      d5 = data[dataOff + 40];
      d6 = data[dataOff + 48];
      d7 = data[dataOff + 56];

      var tmp0p2 = d0 + d7;
      var tmp7p2 = d0 - d7;
      var tmp1p2 = d1 + d6;
      var tmp6p2 = d1 - d6;
      var tmp2p2 = d2 + d5;
      var tmp5p2 = d2 - d5;
      var tmp3p2 = d3 + d4;
      var tmp4p2 = d3 - d4;

      /* Even part */
      var tmp10p2 = tmp0p2 + tmp3p2; /* phase 2 */
      var tmp13p2 = tmp0p2 - tmp3p2;
      var tmp11p2 = tmp1p2 + tmp2p2;
      var tmp12p2 = tmp1p2 - tmp2p2;

      data[dataOff] = tmp10p2 + tmp11p2; /* phase 3 */
      data[dataOff + 32] = tmp10p2 - tmp11p2;

      var z1p2 = (tmp12p2 + tmp13p2) * 0.707106781; /* c4 */
      data[dataOff + 16] = tmp13p2 + z1p2; /* phase 5 */
      data[dataOff + 48] = tmp13p2 - z1p2;

      /* Odd part */
      tmp10p2 = tmp4p2 + tmp5p2; /* phase 2 */
      tmp11p2 = tmp5p2 + tmp6p2;
      tmp12p2 = tmp6p2 + tmp7p2;

      /* The rotator is modified from fig 4-8 to avoid extra negations. */
      var z5p2 = (tmp10p2 - tmp12p2) * 0.382683433; /* c6 */
      var z2p2 = 0.5411961 * tmp10p2 + z5p2; /* c2-c6 */
      var z4p2 = 1.306562965 * tmp12p2 + z5p2; /* c2+c6 */
      var z3p2 = tmp11p2 * 0.707106781; /* c4 */

      var z11p2 = tmp7p2 + z3p2; /* phase 5 */
      var z13p2 = tmp7p2 - z3p2;

      data[dataOff + 40] = z13p2 + z2p2; /* phase 6 */
      data[dataOff + 24] = z13p2 - z2p2;
      data[dataOff + 8] = z11p2 + z4p2;
      data[dataOff + 56] = z11p2 - z4p2;

      dataOff++; /* advance pointer to next column */
    }

    // Quantize/descale the coefficients
    var fDCTQuant;
    for (i = 0; i < I64; ++i) {
      // Apply the quantization and scaling factor & Round to nearest integer
      fDCTQuant = data[i] * fdtbl[i];
      outputfDCTQuant[i] = fDCTQuant > 0.0 ? (fDCTQuant + 0.5) | 0 : (fDCTQuant - 0.5) | 0;
      //outputfDCTQuant[i] = fround(fDCTQuant);
    }
    return outputfDCTQuant;
  }

  function writeAPP0() {
    writeWord(0xffe0); // marker
    writeWord(16); // length
    writeByte(0x4a); // J
    writeByte(0x46); // F
    writeByte(0x49); // I
    writeByte(0x46); // F
    writeByte(0); // = "JFIF",'\0'
    writeByte(1); // versionhi
    writeByte(1); // versionlo
    writeByte(0); // xyunits
    writeWord(1); // xdensity
    writeWord(1); // ydensity
    writeByte(0); // thumbnwidth
    writeByte(0); // thumbnheight
  }

  function writeAPP1(exifBuffer) {
    if (!exifBuffer) return;

    writeWord(0xffe1); // APP1 marker

    if (exifBuffer[0] === 0x45 && exifBuffer[1] === 0x78 && exifBuffer[2] === 0x69 && exifBuffer[3] === 0x66) {
      // Buffer already starts with EXIF, just use it directly
      writeWord(exifBuffer.length + 2); // length is buffer + length itself!
    } else {
      // Buffer doesn't start with EXIF, write it for them
      writeWord(exifBuffer.length + 5 + 2); // length is buffer + EXIF\0 + length itself!
      writeByte(0x45); // E
      writeByte(0x78); // X
      writeByte(0x69); // I
      writeByte(0x66); // F
      writeByte(0); // = "EXIF",'\0'
    }

    for (var i = 0; i < exifBuffer.length; i++) {
      writeByte(exifBuffer[i]);
    }
  }

  function writeSOF0(width, height) {
    writeWord(0xffc0); // marker
    writeWord(17); // length, truecolor YUV JPG
    writeByte(8); // precision
    writeWord(height);
    writeWord(width);
    writeByte(3); // nrofcomponents
    writeByte(1); // IdY
    writeByte(0x11); // HVY
    writeByte(0); // QTY
    writeByte(2); // IdU
    writeByte(0x11); // HVU
    writeByte(1); // QTU
    writeByte(3); // IdV
    writeByte(0x11); // HVV
    writeByte(1); // QTV
  }

  function writeDQT() {
    writeWord(0xffdb); // marker
    writeWord(132); // length
    writeByte(0);
    for (var i = 0; i < 64; i++) {
      writeByte(YTable[i]);
    }
    writeByte(1);
    for (var j = 0; j < 64; j++) {
      writeByte(UVTable[j]);
    }
  }

  function writeDHT() {
    writeWord(0xffc4); // marker

    // Generate nrcodes and values using shared utility
    const YDC_huff = generateHuffmanNrcodesValues(YDC_HT);
    const UVDC_huff = generateHuffmanNrcodesValues(UVDC_HT);
    const YAC_huff = generateHuffmanNrcodesValues(YAC_HT);
    const UVAC_huff = generateHuffmanNrcodesValues(UVAC_HT);

    var totalLength = 2; // length field itself is counted later
    totalLength += 1 + 16 + YDC_huff.values.length; // Y DC
    totalLength += 1 + 16 + YAC_huff.values.length; // Y AC (class 1? Actually AC follows)
    totalLength += 1 + 16 + UVDC_huff.values.length; // UV DC
    totalLength += 1 + 16 + UVAC_huff.values.length; // UV AC

    writeWord(totalLength);

    writeByte(0); // HTYDCinfo
    for (var i = 0; i < 16; i++) writeByte(YDC_huff.nrcodes[i]);
    for (var i = 0; i < YDC_huff.values.length; i++) writeByte(YDC_huff.values[i]);

    writeByte(0x10); // HTYACinfo
    for (var i = 0; i < 16; i++) writeByte(YAC_huff.nrcodes[i]);
    for (var i = 0; i < YAC_huff.values.length; i++) writeByte(YAC_huff.values[i]);

    writeByte(1); // HTUDCinfo
    for (var i = 0; i < 16; i++) writeByte(UVDC_huff.nrcodes[i]);
    for (var i = 0; i < UVDC_huff.values.length; i++) writeByte(UVDC_huff.values[i]);

    writeByte(0x11); // HTUACinfo
    for (var i = 0; i < 16; i++) writeByte(UVAC_huff.nrcodes[i]);
    for (var i = 0; i < UVAC_huff.values.length; i++) writeByte(UVAC_huff.values[i]);
  }

  function writeCOM(comments) {
    if (typeof comments === 'undefined' || comments.constructor !== Array) return;
    comments.forEach(e => {
      if (typeof e !== 'string') return;
      writeWord(0xfffe); // marker
      var l = e.length;
      writeWord(l + 2); // length itself as well
      var i;
      for (i = 0; i < l; i++) writeByte(e.charCodeAt(i));
    });
  }

  function writeSOS() {
    writeWord(0xffda); // SOS
    writeWord(12); // length
    writeByte(3); // nrofcomponents
    writeByte(1); // IdY
    writeByte(0); // HTY
    writeByte(2); // IdU
    writeByte(0x11); // HTU
    writeByte(3); // IdV
    writeByte(0x11); // HTV
    writeByte(0); // Ss
    writeByte(0x3f); // Se
    writeByte(0); // Bf
  }

  function processDUFromCoefficients(dctCoefficients, DC, HTDC, HTAC) {
    var EOB = HTAC[0x00];
    var M16 = -16;
    var pos;
    var I16 = 16;
    var I63 = 63;

    // The coefficients are already quantized, so we just need to reorder them
    for (var j = 0; j < 64; ++j) {
      DU[ZigZag[j]] = dctCoefficients[j];
    }

    // Calculate DC difference
    var DC_val = DU[0] - DC;
    DC = DU[0];

    // Encode DC
    if (DC_val == 0) {
      writeBits(HTDC[0]);
    } else {
      pos = 32767 + DC_val;
      writeBits(HTDC[category[pos]]);
      writeBits(bitcode[pos]);
    }

    // Encode ACs
    var end0pos = 63;
    for (; end0pos > 0 && DU[end0pos] == 0; end0pos--) {}

    if (end0pos == 0) {
      writeBits(EOB);
      return DC;
    }

    var i = 1;
    var lng;
    while (i <= end0pos) {
      var startpos = i;
      for (; DU[i] == 0 && i <= end0pos; ++i) {}
      var nrzeroes = i - startpos;
      if (nrzeroes >= I16) {
        lng = nrzeroes >> 4;
        for (var nrmarker = 1; nrmarker <= lng; ++nrmarker) writeBits(M16);
        nrzeroes = nrzeroes & 0xf;
      }
      pos = 32767 + DU[i];
      writeBits(HTAC[(nrzeroes << 4) + category[pos]]);
      writeBits(bitcode[pos]);
      i++;
    }

    if (end0pos != I63) {
      writeBits(EOB);
    }
    return DC;
  }

  function processDU(CDU, fdtbl, DC, HTDC, HTAC) {
    var EOB = HTAC[0x00];
    var M16zeroes = HTAC[0xf0];
    var pos;
    var I16 = 16;
    var I63 = 63;
    var I64 = 64;
    var DU_DCT = fDCTQuant(CDU, fdtbl);
    //ZigZag reorder
    for (var j = 0; j < I64; ++j) {
      DU[ZigZag[j]] = DU_DCT[j];
    }
    var Diff = DU[0] - DC;
    DC = DU[0];
    //Encode DC
    if (Diff == 0) {
      writeBits(HTDC[0]); // Diff might be 0
    } else {
      pos = 32767 + Diff;
      writeBits(HTDC[category[pos]]);
      writeBits(bitcode[pos]);
    }
    //Encode ACs
    var end0pos = 63; // was const... which is crazy
    for (; end0pos > 0 && DU[end0pos] == 0; end0pos--) {}
    //end0pos = first element in reverse order !=0
    if (end0pos == 0) {
      writeBits(EOB);
      return DC;
    }
    var i = 1;
    var lng;
    while (i <= end0pos) {
      var startpos = i;
      for (; DU[i] == 0 && i <= end0pos; ++i) {}
      var nrzeroes = i - startpos;
      if (nrzeroes >= I16) {
        lng = nrzeroes >> 4;
        for (var nrmarker = 1; nrmarker <= lng; ++nrmarker) writeBits(M16zeroes);
        nrzeroes = nrzeroes & 0xf;
      }
      pos = 32767 + DU[i];
      writeBits(HTAC[(nrzeroes << 4) + category[pos]]);
      writeBits(bitcode[pos]);
      i++;
    }
    if (end0pos != I63) {
      writeBits(EOB);
    }
    return DC;
  }

  function initCharLookupTable() {
    var sfcc = String.fromCharCode;
    for (var i = 0; i < 256; i++) {
      ///// ACHTUNG // 255
      clt[i] = sfcc(i);
    }
  }

  // All helper functions moved inside the JPEGEncoder constructor scope
  // to ensure they have access to `category`, `bitcode`, etc.
  function getHuffmanFrequencies(quantizedComponents) {
    var Y_DC_freq = new Array(256).fill(0);
    var Y_AC_freq = new Array(256).fill(0);
    var UV_DC_freq = new Array(256).fill(0);
    var UV_AC_freq = new Array(256).fill(0);
    var lastDCY = 0,
      lastDCU = 0,
      lastDCV = 0;

    var component0 = quantizedComponents[0];
    var component1 = quantizedComponents[1];
    var component2 = quantizedComponents[2];

    for (var blockRow = 0; blockRow < component0.length; blockRow++) {
      for (var blockCol = 0; blockCol < component0[0].length; blockCol++) {
        // Y component
        var yBlock = component0[blockRow][blockCol];
        var dc = yBlock[0];
        var diff = dc - lastDCY;
        lastDCY = dc;
        Y_DC_freq[category[32767 + diff]]++;

        var zero_run = 0;
        for (var i = 1; i < 64; i++) {
          if (yBlock[i] === 0) {
            zero_run++;
          } else {
            while (zero_run >= 16) {
              Y_AC_freq[0xf0]++;
              zero_run -= 16;
            }
            Y_AC_freq[(zero_run << 4) | category[32767 + yBlock[i]]]++;
            zero_run = 0;
          }
        }
        if (zero_run > 0) Y_AC_freq[0x00]++;

        // Cb and Cr components (for 4:2:0 subsampling)
        if (blockRow % 2 === 0 && blockCol % 2 === 0) {
          var cbRow = Math.floor(blockRow / 2);
          var cbCol = Math.floor(blockCol / 2);

          var cbBlock = component1[cbRow][cbCol];
          dc = cbBlock[0];
          diff = dc - lastDCU;
          lastDCU = dc;
          UV_DC_freq[category[32767 + diff]]++;
          zero_run = 0;
          for (var i = 1; i < 64; i++) {
            if (cbBlock[i] === 0) zero_run++;
            else {
              while (zero_run >= 16) {
                UV_AC_freq[0xf0]++;
                zero_run -= 16;
              }
              UV_AC_freq[(zero_run << 4) | category[32767 + cbBlock[i]]]++;
              zero_run = 0;
            }
          }
          if (zero_run > 0) UV_AC_freq[0x00]++;

          var crBlock = component2[cbRow][cbCol];
          dc = crBlock[0];
          diff = dc - lastDCV;
          lastDCV = dc;
          UV_DC_freq[category[32767 + diff]]++;
          zero_run = 0;
          for (var i = 1; i < 64; i++) {
            if (crBlock[i] === 0) zero_run++;
            else {
              while (zero_run >= 16) {
                UV_AC_freq[0xf0]++;
                zero_run -= 16;
              }
              UV_AC_freq[(zero_run << 4) | category[32767 + crBlock[i]]]++;
              zero_run = 0;
            }
          }
          if (zero_run > 0) UV_AC_freq[0x00]++;
        }
      }
    }
    return { Y_DC_freq, Y_AC_freq, UV_DC_freq, UV_AC_freq };
  }

  function buildHuffmanTable(frequencies) {
    var nodes = [];
    for (var i = 0; i < frequencies.length; i++) {
      if (frequencies[i] > 0) {
        nodes.push({ value: i, freq: frequencies[i] });
      }
    }
    nodes.sort((a, b) => a.freq - b.freq);

    while (nodes.length > 1) {
      var node1 = nodes.shift();
      var node2 = nodes.shift();
      var combined = {
        freq: node1.freq + node2.freq,
        children: [node1, node2],
      };
      nodes.push(combined);
      nodes.sort((a, b) => a.freq - b.freq);
    }

    var huffmanTable = new Array(256);
    function generateCodes(node, code, codeLength) {
      if (node.children) {
        generateCodes(node.children[0], code, codeLength + 1);
        generateCodes(node.children[1], code | (1 << (15 - codeLength)), codeLength + 1);
      } else {
        huffmanTable[node.value] = [code >> (16 - codeLength), codeLength];
      }
    }

    if (nodes.length > 0) {
      generateCodes(nodes[0], 0, 0);
    }

    return huffmanTable;
  }

  this.encode = function (image, quality) {
    // image data object
    var time_start = new Date().getTime();

    if (quality) setQuality(quality);

    // Initialize bit writer
    byteout = new Array();
    bytenew = 0;
    bytepos = 7;

    // Add JPEG headers
    writeWord(0xffd8); // SOI
    writeAPP0();
    writeCOM(image.comments);
    writeAPP1(image.exifBuffer);
    writeDQT();
    writeSOF0(image.width, image.height);
    writeDHT();
    writeSOS();

    // Encode 8x8 macroblocks
    var DCY = 0;
    var DCU = 0;
    var DCV = 0;

    bytenew = 0;
    bytepos = 7;

    this.encode.displayName = '_encode_';

    var imageData = image.data;
    var width = image.width;
    var height = image.height;

    var quadWidth = width * 4;
    var tripleWidth = width * 3;

    var x,
      y = 0;
    var r, g, b;
    var start, p, col, row, pos;
    while (y < height) {
      x = 0;
      while (x < quadWidth) {
        start = quadWidth * y + x;
        p = start;
        col = -1;
        row = 0;

        for (pos = 0; pos < 64; pos++) {
          row = pos >> 3; // /8
          col = (pos & 7) * 4; // %8
          p = start + row * quadWidth + col;

          if (y + row >= height) {
            // padding bottom
            p -= quadWidth * (y + 1 + row - height);
          }

          if (x + col >= quadWidth) {
            // padding right
            p -= x + col - quadWidth + 4;
          }

          r = imageData[p++];
          g = imageData[p++];
          b = imageData[p++];

          /* // calculate YUV values dynamically
                      YDU[pos]=((( 0.29900)*r+( 0.58700)*g+( 0.11400)*b))-128; //-0x80
                      UDU[pos]=(((-0.16874)*r+(-0.33126)*g+( 0.50000)*b));
                      VDU[pos]=((( 0.50000)*r+(-0.41869)*g+(-0.08131)*b));
                      */

          // use lookup table (slightly faster)
          YDU[pos] = ((RGB_YUV_TABLE[r] + RGB_YUV_TABLE[(g + 256) >> 0] + RGB_YUV_TABLE[(b + 512) >> 0]) >> 16) - 128;
          UDU[pos] =
            ((RGB_YUV_TABLE[(r + 768) >> 0] + RGB_YUV_TABLE[(g + 1024) >> 0] + RGB_YUV_TABLE[(b + 1280) >> 0]) >> 16) -
            128;
          VDU[pos] =
            ((RGB_YUV_TABLE[(r + 1280) >> 0] + RGB_YUV_TABLE[(g + 1536) >> 0] + RGB_YUV_TABLE[(b + 1792) >> 0]) >> 16) -
            128;
        }

        DCY = processDU(YDU, fdtbl_Y, DCY, YDC_HT, YAC_HT);
        DCU = processDU(UDU, fdtbl_UV, DCU, UVDC_HT, UVAC_HT);
        DCV = processDU(VDU, fdtbl_UV, DCV, UVDC_HT, UVAC_HT);
        x += 32;
      }
      y += 8;
    }

    ////////////////////////////////////////////////////////////////

    // Do the bit alignment of the EOI marker
    if (bytepos >= 0) {
      var fillbits = [];
      fillbits[1] = bytepos + 1;
      fillbits[0] = (1 << (bytepos + 1)) - 1;
      writeBits(fillbits);
    }

    writeWord(0xffd9); //EOI

    if (typeof module === 'undefined') return new Uint8Array(byteout);
    return Buffer.from(byteout);

    var jpegDataUri = 'data:image/jpeg;base64,' + btoa(byteout.join(''));

    byteout = [];

    // benchmarking
    var duration = new Date().getTime() - time_start;
    //console.log('Encoding time: '+ duration + 'ms');
    //

    return jpegDataUri;
  };

  // FORK MODIFICATION: Encode from DCT coefficients for steganography
  this.encodeFromDCT = function (dctInput, metadataInput, quality) {
    // Normalize parameters so that the encoder works whether we receive raw
    // coefficient arrays or a full decoder-like object.
    // ------------------------------------------------------------------
    // 1. Detect "decoder style" input (object with .components) and, if
    // provided, extract the 3-dimensional coefficient arrays expected by the
    // original jp3g encoder implementation. Also derive any metadata fields
    // that are required (quantisation tables, sampling ratios, width/height)
    // but were not explicitly supplied by the caller.
    // ------------------------------------------------------------------

    // Helper we will populate below – will become the final arrays we feed
    // into the legacy encoder (shape: [component][blockRow][blockCol][64]).
    let coefficientArrays;

    // The metadata object we ultimately use (may be the caller-supplied one or
    // a derived fallback).
    let metadata = metadataInput || {};

    // If the first argument looks like a decoder (has .components) rather than
    // an array, convert it into the structure the legacy code expects.
    if (!Array.isArray(dctInput) && dctInput && dctInput.components) {
      const decoderObj = dctInput;

      // --- Derive coefficient arrays ------------------------------------------------
      if (!decoderObj.components[0]?.dctBlocks) {
        throw new Error('encodeFromDCT: supplied decoder object is missing dctBlocks');
      }

      // Build a simple [Y, Cb, Cr] array of 2-D block arrays expected by the
      // original algorithm.
      coefficientArrays = [
        decoderObj.components[0].dctBlocks,
        decoderObj.components[1]?.dctBlocks || decoderObj.components[0].dctBlocks,
        decoderObj.components[2]?.dctBlocks || decoderObj.components[0].dctBlocks,
      ];

      // --- Derive metadata -----------------------------------------------------------
      metadata = {
        width: decoderObj.width,
        height: decoderObj.height,
        // Quant tables – fall back to the tables found on each component.
        quantizationTables: [
          decoderObj.components[0]?.quantizationTable,
          decoderObj.components[1]?.quantizationTable || decoderObj.components[0]?.quantizationTable,
        ],
        // Sampling ratios – infer from chroma component scales (assume 4:2:0 if undefined).
        hSampRatio: decoderObj.components[1] ? Math.round(1 / (decoderObj.components[1].scaleX || 1)) : 1,
        vSampRatio: decoderObj.components[1] ? Math.round(1 / (decoderObj.components[1].scaleY || 1)) : 1,
        comments: decoderObj.comments || [],
        exif: decoderObj.exifBuffer || null,
        ...metadataInput, // allow explicit overrides from caller
      };
    } else {
      // Caller passed raw coefficient arrays; use as-is.
      coefficientArrays = dctInput;
      metadata = { ...metadataInput };
    }

    // --- Fallback: derive quant tables from metadataInput components if still missing ---
    if (
      (!metadata.quantizationTables || metadata.quantizationTables.length === 0 || !metadata.quantizationTables[0]) &&
      metadataInput &&
      metadataInput.components
    ) {
      metadata.quantizationTables = [
        metadataInput.components[0]?.quantizationTable,
        metadataInput.components[1]?.quantizationTable || metadataInput.components[0]?.quantizationTable,
      ];
    }

    // ------------------------------------------------------------------
    // Guard-clauses for critical metadata pieces so that we fail loudly
    // with a helpful message instead of cryptic "undefined[0]" errors.
    // ------------------------------------------------------------------
    if (!metadata || typeof metadata.width !== 'number' || typeof metadata.height !== 'number') {
      throw new Error('encodeFromDCT: metadata.width/height are required');
    }
    // NOTE: Quantisation tables are OPTIONAL. If the caller does not supply
    // them we will simply keep using the default tables that were already
    // initialised by setQuality(). This mirrors the behaviour of the original
    // jp3g encoder and prevents unnecessary hard-failures during basic
    // round-trip tests.

    if (!metadata.hSampRatio) metadata.hSampRatio = 2;
    if (!metadata.vSampRatio) metadata.vSampRatio = 2;

    // Ensure we always have three component arrays to avoid crashes in
    // downstream frequency analysis (fallback to luminance blocks if missing).
    if (!coefficientArrays[1]) coefficientArrays[1] = coefficientArrays[0];
    if (!coefficientArrays[2]) coefficientArrays[2] = coefficientArrays[0];

    // If chroma components use 4:2:0 subsampling (i.e., half width/height in
    // blocks), duplicate each block to create a simple 4:4:4 representation so
    // that our non-interleaved encoding loop still produces the expected
    // number of MCUs for the declared sampling factors (1×1 per component).
    function upsampleComponent(comp) {
      var yBlocks = coefficientArrays[0].length;
      var xBlocks = coefficientArrays[0][0].length;
      var cy = comp.length;
      var cx = comp[0].length;
      if (cy === yBlocks && cx === xBlocks) return comp; // already same size

      var factorY = Math.round(yBlocks / cy);
      var factorX = Math.round(xBlocks / cx);
      if (factorY < 1 || factorX < 1) return comp; // unexpected, skip

      var up = new Array(yBlocks);
      for (var y = 0; y < yBlocks; y++) {
        up[y] = new Array(xBlocks);
        var srcRow = Math.floor(y / factorY);
        for (var x = 0; x < xBlocks; x++) {
          var srcCol = Math.floor(x / factorX);
          up[y][x] = comp[srcRow][srcCol];
        }
      }
      return up;
    }

    coefficientArrays[1] = upsampleComponent(coefficientArrays[1]);
    coefficientArrays[2] = upsampleComponent(coefficientArrays[2]);

    //-------------------------------------------------------------------
    // The rest of the original function remains unchanged except that
    // we now reference `coefficientArrays` instead of the old name.
    //-------------------------------------------------------------------
    var time_start = new Date().getTime();

    const qu = quality || 50;
    setQuality(qu);

    // We need to re-initialize headers and tables based on the original image's metadata
    byteout = new Array();
    bytenew = 0;
    bytepos = 7;

    // Header
    writeWord(0xffd8); // SOI
    writeAPP0();
    if (metadata.exif) {
      writeAPP1(metadata.exif);
    }
    if (metadata.comments && metadata.comments.length > 0) {
      writeCOM(metadata.comments);
    }

    // -- Quantisation tables -----------------------------------------------------
    // If the caller provided custom quant tables, copy them into the encoder so
    // they are written out in the DQT marker. Otherwise we stick with the
    // defaults that were populated by setQuality() earlier.
    if (metadata.quantizationTables && metadata.quantizationTables[0]) {
      // Ensure chroma table exists – fall back to luminance when missing.
      if (!metadata.quantizationTables[1]) {
        metadata.quantizationTables[1] = metadata.quantizationTables[0];
      }
      for (let i = 0; i < 64; i++) {
        YTable[i] = metadata.quantizationTables[0][i];
        UVTable[i] = metadata.quantizationTables[1][i];
      }
    }
    // Always write a DQT marker (either caller-supplied or default tables).
    writeDQT();
    // --

    writeSOF0(metadata.width, metadata.height);

    // Write baseline standard Huffman tables (Annex K.3)
    writeStandardDHT();

    writeSOS();

    // ---------------------------------------------------------------------------
    // Encode the provided (already-quantised) DCT coefficient blocks directly.
    // ---------------------------------------------------------------------------
    var YDC = 0;
    var CbDC = 0;
    var CrDC = 0;

    var Yheight = coefficientArrays[0].length;
    var Ywidth = coefficientArrays[0][0].length;

    for (var y = 0; y < Yheight; y++) {
      for (var x = 0; x < Ywidth; x++) {
        // Luminance block
        var ydu = coefficientArrays[0][y][x];
        YDC = processDUFromCoefficients(ydu, YDC, YDC_HT, YAC_HT);

        // Corresponding chroma blocks (thanks to upsampling they are same indices)
        var cbdu = coefficientArrays[1][y][x];
        CbDC = processDUFromCoefficients(cbdu, CbDC, UVDC_HT, UVAC_HT);

        var crdu = coefficientArrays[2][y][x];
        CrDC = processDUFromCoefficients(crdu, CrDC, UVDC_HT, UVAC_HT);
      }
    }

    // ----- Bit alignment before EOI -----
    if (bytepos >= 0) {
      var fillbits = [];
      fillbits[1] = bytepos + 1;
      fillbits[0] = (1 << (bytepos + 1)) - 1;
      writeBits(fillbits);
    }

    writeWord(0xffd9); // EOI

    var jpegData = new Uint8Array(byteout);
    byteout = []; // clear for next encoding

    var duration = new Date().getTime() - time_start;
    // console.log('Encoding time: ' + duration + 'ms');

    return jpegData;
  };

  function setQuality(quality) {
    if (quality <= 0) {
      quality = 1;
    }
    if (quality > 100) {
      quality = 100;
    }

    if (currentQuality == quality) return; // don't recalc if unchanged

    var sf = 0;
    if (quality < 50) {
      sf = Math.floor(5000 / quality);
    } else {
      sf = Math.floor(200 - quality * 2);
    }

    initQuantTables(sf);
    currentQuality = quality;
    //console.log('Quality set to: '+quality +'%');
  }

  function init() {
    var time_start = new Date().getTime();
    if (!quality) quality = 50;
    // Create tables
    initCharLookupTable();
    initHuffmanTbl();
    initCategoryNumber();
    initRGBYUVTable();

    setQuality(quality);
    var duration = new Date().getTime() - time_start;
    //console.log('Initialization '+ duration + 'ms');
  }

  // FORK ADDITION: Write baseline standard Huffman tables (Annex K.3)
  function writeStandardDHT() {
    // Pre-computed length (0x01A2) covers 4 Huffman tables
    writeWord(0xffc4);
    writeWord(0x01a2);

    // Helper to write a single table
    function writeTable(nrcodes, values, tableClass, tableId) {
      writeByte((tableClass << 4) | tableId);
      for (var i = 1; i <= 16; i++) writeByte(nrcodes[i]);
      for (var j = 0; j < values.length; j++) writeByte(values[j]);
    }

    // Luminance DC (class 0, id 0)
    writeTable(std_dc_luminance_nrcodes, std_dc_luminance_values, 0, 0);
    // Luminance AC (class 1, id 0)
    writeTable(std_ac_luminance_nrcodes, std_ac_luminance_values, 1, 0);
    // Chrominance DC (class 0, id 1)
    writeTable(std_dc_chrominance_nrcodes, std_dc_chrominance_values, 0, 1);
    // Chrominance AC (class 1, id 1)
    writeTable(std_ac_chrominance_nrcodes, std_ac_chrominance_values, 1, 1);
  }

  init();
}

if (typeof module !== 'undefined') {
  module.exports = encode;
} else if (typeof window !== 'undefined') {
  window['jpeg-js'] = window['jpeg-js'] || {};
  window['jpeg-js'].encode = encode;
}

function encode(imgData, qu) {
  if (typeof qu === 'undefined') qu = 50;
  var encoder = new JPEGEncoder(qu);
  var data = encoder.encode(imgData, qu);
  return {
    data: data,
    width: imgData.width,
    height: imgData.height,
  };
}

// helper function to get the imageData of an existing image on the current page.
function getImageDataFromImage(idOrElement) {
  var theImg = typeof idOrElement == 'string' ? document.getElementById(idOrElement) : idOrElement;
  var cvs = document.createElement('canvas');
  cvs.width = theImg.width;
  cvs.height = theImg.height;
  var ctx = cvs.getContext('2d');
  ctx.drawImage(theImg, 0, 0);

  return ctx.getImageData(0, 0, cvs.width, cvs.height);
}

// FORK MODIFICATION: Export the encoder for use in our steganography client
export { JPEGEncoder };
