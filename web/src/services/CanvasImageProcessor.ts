/* eslint-disable no-console */
import type { IImageProcessor, IImageData, CompressionOptions, PixelData } from '@mischiefmaker/core';

/**
 * Canvas-based image processor for web applications
 * Uses HTML5 Canvas API for image manipulation and compression
 */
export class CanvasImageProcessor implements IImageProcessor {
  /**
   * Convert any image format to JPEG with compression options
   */
  async preprocessImageToJPEG(buffer: ArrayBuffer, options: CompressionOptions): Promise<ArrayBuffer> {
    console.log('🖼️ [CanvasImageProcessor] preprocessImageToJPEG started');
    console.log('📊 Input buffer size:', (buffer.byteLength / 1024).toFixed(2), 'KB');
    console.log('⚙️ Compression options:', options);

    // Load image from buffer
    const startTime = performance.now();
    const imageData = await this.loadImageFromBuffer(buffer);
    const loadTime = performance.now() - startTime;

    console.log('📐 Original image dimensions:', `${imageData.width}x${imageData.height}`);
    console.log('⏱️ Image loading time:', loadTime.toFixed(2), 'ms');

    // Resize if needed
    const resizeStartTime = performance.now();
    const resizedImageData = await this.resizeImage(imageData, options);
    const resizeTime = performance.now() - resizeStartTime;

    if (resizedImageData.width !== imageData.width || resizedImageData.height !== imageData.height) {
      console.log('📏 Resized to:', `${resizedImageData.width}x${resizedImageData.height}`);
      console.log('⏱️ Resize time:', resizeTime.toFixed(2), 'ms');
    } else {
      console.log('✅ No resizing needed');
    }

    // Convert to JPEG with quality
    const compressStartTime = performance.now();
    const jpegBuffer = await this.compressToJPEG(resizedImageData, options.quality);
    const compressTime = performance.now() - compressStartTime;

    console.log('🗜️ JPEG compression completed');
    console.log('📊 Output buffer size:', (jpegBuffer.byteLength / 1024).toFixed(2), 'KB');
    console.log('📉 Compression ratio:', ((1 - jpegBuffer.byteLength / buffer.byteLength) * 100).toFixed(1) + '%');
    console.log('⏱️ Compression time:', compressTime.toFixed(2), 'ms');
    console.log('🎯 Target: Under 1MB?', jpegBuffer.byteLength < 1024 * 1024 ? '✅ Yes' : '❌ No');

    const totalTime = performance.now() - startTime;
    console.log('⏱️ Total preprocessing time:', totalTime.toFixed(2), 'ms');
    console.log('🖼️ [CanvasImageProcessor] preprocessImageToJPEG completed\n');

    return jpegBuffer;
  }

  /**
   * Decompress JPEG to ImageData format
   */
  async decompressJPEG(jpegBuffer: ArrayBuffer): Promise<IImageData> {
    console.log('📂 [CanvasImageProcessor] decompressJPEG started');
    console.log('📊 Input JPEG buffer size:', (jpegBuffer.byteLength / 1024).toFixed(2), 'KB');

    const startTime = performance.now();
    const imageData = await this.loadImageFromBuffer(jpegBuffer);
    const loadTime = performance.now() - startTime;

    console.log('📐 Decompressed image dimensions:', `${imageData.width}x${imageData.height}`);
    console.log('📊 Raw image data size:', (imageData.data.length / 1024).toFixed(2), 'KB');
    console.log('⏱️ Decompression time:', loadTime.toFixed(2), 'ms');
    console.log('📂 [CanvasImageProcessor] decompressJPEG completed\n');

    return imageData;
  }

  /**
   * Convert ImageData to PixelData format for LSB manipulation
   */
  async convertToPixelData(imageData: IImageData): Promise<PixelData> {
    console.log('🔄 [CanvasImageProcessor] convertToPixelData started');
    console.log('📐 Image dimensions:', `${imageData.width}x${imageData.height}`);

    const startTime = performance.now();
    const { width, height, data } = imageData;
    const totalPixels = width * height;

    console.log('🎨 Total pixels:', totalPixels.toLocaleString());
    console.log('📊 Raw RGBA data length:', data.length.toLocaleString(), 'bytes');

    // Convert from RGBA array to separate channel arrays
    const red: number[] = [];
    const green: number[] = [];
    const blue: number[] = [];

    for (let i = 0; i < data.length; i += 4) {
      red.push(data[i]);
      green.push(data[i + 1]);
      blue.push(data[i + 2]);
      // Skip alpha channel (i + 3)
    }

    const conversionTime = performance.now() - startTime;
    console.log('🔢 Channel arrays created - Red:', red.length, 'Green:', green.length, 'Blue:', blue.length);
    console.log('💾 Total usable bits for steganography:', (totalPixels * 3).toLocaleString(), 'bits');
    console.log('💾 Theoretical capacity:', Math.floor((totalPixels * 3) / 8).toLocaleString(), 'bytes');
    console.log('⏱️ Conversion time:', conversionTime.toFixed(2), 'ms');
    console.log('🔄 [CanvasImageProcessor] convertToPixelData completed\n');

    return {
      width,
      height,
      channels: { red, green, blue },
      totalPixels,
    };
  }

  /**
   * Apply modified pixel data back to ImageData
   */
  async applyPixelData(_imageData: IImageData, pixelData: PixelData): Promise<IImageData> {
    console.log('🔄 [CanvasImageProcessor] applyPixelData started');
    console.log('📐 Pixel data dimensions:', `${pixelData.width}x${pixelData.height}`);
    console.log('🎨 Total pixels to process:', pixelData.totalPixels.toLocaleString());

    const startTime = performance.now();
    const { width, height, channels } = pixelData;
    const data = new Uint8ClampedArray(width * height * 4);

    // Convert from separate channel arrays back to RGBA array
    for (let i = 0; i < channels.red.length; i++) {
      const pixelIndex = i * 4;
      data[pixelIndex] = channels.red[i];
      data[pixelIndex + 1] = channels.green[i];
      data[pixelIndex + 2] = channels.blue[i];
      data[pixelIndex + 3] = 255; // Full opacity
    }

    const conversionTime = performance.now() - startTime;
    console.log('🔢 Channel arrays converted back to RGBA');
    console.log('📊 Final RGBA data length:', data.length.toLocaleString(), 'bytes');
    console.log('⏱️ Conversion time:', conversionTime.toFixed(2), 'ms');
    console.log('🔄 [CanvasImageProcessor] applyPixelData completed\n');

    return {
      width,
      height,
      data,
    };
  }

  /**
   * Compress ImageData to JPEG format
   */
  async compressToJPEG(imageData: IImageData, quality: number): Promise<ArrayBuffer> {
    console.log('🗜️ [CanvasImageProcessor] compressToJPEG started');
    console.log('📐 Image dimensions:', `${imageData.width}x${imageData.height}`);
    console.log('🎚️ Quality setting:', quality + '%');
    console.log('📊 Input data size:', (imageData.data.length / 1024).toFixed(2), 'KB');

    const startTime = performance.now();
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Create ImageData object and put it on canvas
    const canvasImageData = new ImageData(imageData.data, imageData.width, imageData.height);
    ctx.putImageData(canvasImageData, 0, 0);

    const canvasTime = performance.now() - startTime;
    console.log('🖼️ Image data applied to canvas');
    console.log('⏱️ Canvas setup time:', canvasTime.toFixed(2), 'ms');

    // Convert to JPEG blob
    return new Promise((resolve, reject) => {
      const blobStartTime = performance.now();
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error('Failed to create JPEG blob'));
            return;
          }

          const blobTime = performance.now() - blobStartTime;
          console.log('💾 JPEG blob created');
          console.log('📊 Blob size:', (blob.size / 1024).toFixed(2), 'KB');
          console.log('⏱️ Blob creation time:', blobTime.toFixed(2), 'ms');

          // Convert blob to ArrayBuffer
          const readerStartTime = performance.now();
          const reader = new FileReader();
          reader.onload = () => {
            const readerTime = performance.now() - readerStartTime;
            const result = reader.result as ArrayBuffer;
            console.log('🔄 Blob converted to ArrayBuffer');
            console.log('📊 Final buffer size:', (result.byteLength / 1024).toFixed(2), 'KB');
            console.log('⏱️ Reader time:', readerTime.toFixed(2), 'ms');

            const totalTime = performance.now() - startTime;
            console.log('⏱️ Total compression time:', totalTime.toFixed(2), 'ms');
            console.log('🗜️ [CanvasImageProcessor] compressToJPEG completed\n');

            resolve(result);
          };
          reader.onerror = () => reject(new Error('Failed to read blob'));
          reader.readAsArrayBuffer(blob);
        },
        'image/jpeg',
        quality / 100 // Canvas expects quality as 0-1
      );
    });
  }

  /**
   * Get image dimensions without full loading
   */
  async getImageDimensions(buffer: ArrayBuffer): Promise<{ width: number; height: number }> {
    console.log('📏 [CanvasImageProcessor] getImageDimensions started');
    console.log('📊 Buffer size:', (buffer.byteLength / 1024).toFixed(2), 'KB');

    const startTime = performance.now();
    const imageData = await this.loadImageFromBuffer(buffer);
    const loadTime = performance.now() - startTime;

    console.log('📐 Image dimensions:', `${imageData.width}x${imageData.height}`);
    console.log('⏱️ Dimension check time:', loadTime.toFixed(2), 'ms');
    console.log('📏 [CanvasImageProcessor] getImageDimensions completed\n');

    return {
      width: imageData.width,
      height: imageData.height,
    };
  }

  /**
   * Load image from ArrayBuffer and return ImageData
   */
  private async loadImageFromBuffer(buffer: ArrayBuffer): Promise<IImageData> {
    console.log('📂 [CanvasImageProcessor] loadImageFromBuffer started');
    console.log('📊 Loading buffer size:', (buffer.byteLength / 1024).toFixed(2), 'KB');

    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);
      const img = new window.Image();

      img.onload = () => {
        const loadTime = performance.now() - startTime;
        console.log('🖼️ Image loaded successfully');
        console.log('📐 Natural dimensions:', `${img.naturalWidth}x${img.naturalHeight}`);
        console.log('⏱️ Image load time:', loadTime.toFixed(2), 'ms');

        try {
          const canvasStartTime = performance.now();
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);

          const canvasTime = performance.now() - canvasStartTime;
          console.log('🖼️ Image drawn to canvas and data extracted');
          console.log('📊 ImageData size:', (imageData.data.length / 1024).toFixed(2), 'KB');
          console.log('⏱️ Canvas processing time:', canvasTime.toFixed(2), 'ms');

          const totalTime = performance.now() - startTime;
          console.log('⏱️ Total load time:', totalTime.toFixed(2), 'ms');
          console.log('📂 [CanvasImageProcessor] loadImageFromBuffer completed\n');

          resolve({
            width: imageData.width,
            height: imageData.height,
            data: imageData.data,
          });
        } catch (error) {
          console.error('❌ Error processing image:', error);
          reject(error);
        } finally {
          URL.revokeObjectURL(url);
          console.log('🧹 Object URL revoked');
        }
      };

      img.onerror = () => {
        console.error('❌ Failed to load image');
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
      console.log('🔗 Object URL created and assigned to image');
    });
  }

  /**
   * Resize image if it exceeds max dimensions
   */
  private async resizeImage(imageData: IImageData, options: CompressionOptions): Promise<IImageData> {
    console.log('📏 [CanvasImageProcessor] resizeImage started');
    const { width, height } = imageData;
    const { maxDimensions, maintainAspectRatio } = options;

    console.log('📐 Original dimensions:', `${width}x${height}`);
    console.log('🎯 Max dimensions:', maxDimensions);
    console.log('🔄 Maintain aspect ratio:', maintainAspectRatio);

    // Check if resizing is needed
    if (width <= maxDimensions && height <= maxDimensions) {
      console.log('✅ No resizing needed');
      console.log('📏 [CanvasImageProcessor] resizeImage completed\n');
      return imageData;
    }

    const startTime = performance.now();
    let newWidth = width;
    let newHeight = height;

    if (maintainAspectRatio) {
      // Calculate new dimensions maintaining aspect ratio
      const aspectRatio = width / height;
      console.log('📐 Original aspect ratio:', aspectRatio.toFixed(3));

      if (width > height) {
        newWidth = maxDimensions;
        newHeight = maxDimensions / aspectRatio;
      } else {
        newHeight = maxDimensions;
        newWidth = maxDimensions * aspectRatio;
      }
    } else {
      // Simple max dimension capping
      newWidth = Math.min(width, maxDimensions);
      newHeight = Math.min(height, maxDimensions);
    }

    console.log('📏 New dimensions:', `${Math.floor(newWidth)}x${Math.floor(newHeight)}`);
    console.log('📉 Size reduction:', ((1 - (newWidth * newHeight) / (width * height)) * 100).toFixed(1) + '%');

    // Create canvas for resizing
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context for resizing');
    }

    // Create temporary canvas with original image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      throw new Error('Failed to get temporary canvas context');
    }

    // Put original image data on temp canvas
    const originalImageData = new ImageData(imageData.data, width, height);
    tempCtx.putImageData(originalImageData, 0, 0);

    // Draw resized image
    ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);

    // Get resized image data
    const resizedImageData = ctx.getImageData(0, 0, newWidth, newHeight);

    const resizeTime = performance.now() - startTime;
    console.log('🖼️ Image resized successfully');
    console.log('📊 New data size:', (resizedImageData.data.length / 1024).toFixed(2), 'KB');
    console.log('⏱️ Resize time:', resizeTime.toFixed(2), 'ms');
    console.log('📏 [CanvasImageProcessor] resizeImage completed\n');

    return {
      width: resizedImageData.width,
      height: resizedImageData.height,
      data: resizedImageData.data,
    };
  }
}
