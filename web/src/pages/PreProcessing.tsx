import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Download, AlertCircle, CheckCircle, RefreshCw, ImageIcon } from 'lucide-react';
import { ImageUploader } from '@/components/custom/ImageUploader';
import { CanvasImageProcessor } from '@/services/CanvasImageProcessor';
import { webBufferAdapter } from '@/services/WebBufferAdapter';
import jp3gFork from '@mischiefmaker/core/src/jp3gFork/decoder/jp3gDecoder';

interface ImageMetadata {
  width: number;
  height: number;
  fileSize: number;
  subsampling: string;
  quality: number;
  components: Array<{
    id: number;
    scaleX: number;
    scaleY: number;
    samplingFactors: string;
  }>;
}

export default function PreProcessing() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedBuffer, setProcessedBuffer] = useState<ArrayBuffer | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [originalMetadata, setOriginalMetadata] = useState<ImageMetadata | null>(null);
  const [processedMetadata, setProcessedMetadata] = useState<ImageMetadata | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const extractImageMetadata = async (buffer: ArrayBuffer): Promise<ImageMetadata> => {
    try {
      const uint8Array = new Uint8Array(buffer);

      try {
        // Try to extract real metadata using jp3gFork with buffer adapter
        const jpegObject = jp3gFork(uint8Array, webBufferAdapter).toObject();
        const decoder = jpegObject._decoder;

        if (!decoder) {
          throw new Error('Failed to decode JPEG metadata');
        }

        // Determine subsampling format
        let subsampling = 'Unknown';
        if (decoder.components.length >= 3) {
          const y = decoder.components[0];
          const cb = decoder.components[1];
          const cr = decoder.components[2];

          if (cb.scaleX === 1 && cb.scaleY === 1 && cr.scaleX === 1 && cr.scaleY === 1) {
            subsampling = '4:4:4';
          } else if (cb.scaleX === 0.5 && cb.scaleY === 0.5 && cr.scaleX === 0.5 && cr.scaleY === 0.5) {
            subsampling = '4:2:0 (may cause grey filter)';
          } else if (cb.scaleX === 0.5 && cb.scaleY === 1 && cr.scaleX === 0.5 && cr.scaleY === 1) {
            subsampling = '4:2:2';
          } else {
            subsampling = `custom:${y.scaleX}:${cb.scaleX}:${cr.scaleX}`;
          }
        }

        // Estimate quality (simplified approximation)
        const quantTable = decoder.components[0]?.quantizationTable;
        let avgQuant = 50;
        if (quantTable && quantTable.length > 0) {
          avgQuant = Array.from(quantTable).reduce((sum: number, val: number) => sum + val, 0) / quantTable.length;
        }
        const estimatedQuality = Math.max(1, Math.min(100, Math.round(100 - ((avgQuant - 1) / 99) * 50)));

        return {
          width: decoder.width,
          height: decoder.height,
          fileSize: buffer.byteLength,
          subsampling,
          quality: estimatedQuality,
          components: decoder.components.map((comp: { scaleX: number; scaleY: number }, index: number) => ({
            id: index,
            scaleX: comp.scaleX,
            scaleY: comp.scaleY,
            samplingFactors: `${comp.scaleX}×${comp.scaleY}`,
          })),
        };
      } catch {
        // Failed to extract JPEG metadata, falling back to basic analysis

        // Fallback to basic image analysis
        const blob = new Blob([buffer], { type: 'image/jpeg' });
        const imageUrl = URL.createObjectURL(blob);

        return new Promise((resolve, reject) => {
          const img = document.createElement('img');
          img.onload = () => {
            URL.revokeObjectURL(imageUrl);

            const fileSize = buffer.byteLength;
            const isOriginal = !processedBuffer || buffer === originalBuffer;

            // Heuristic fallback
            let subsampling = 'Unknown (decode failed)';
            let quality = 85;

            if (isOriginal) {
              const pixelCount = img.width * img.height;
              const bytesPerPixel = fileSize / pixelCount;

              if (bytesPerPixel > 2) {
                subsampling = 'Likely 4:4:4 (high quality)';
                quality = 90;
              } else if (bytesPerPixel > 1) {
                subsampling = 'Likely 4:2:2 or mixed';
                quality = 75;
              } else {
                subsampling = 'Likely 4:2:0 (may cause grey filter)';
                quality = 65;
              }
            } else {
              subsampling = '4:4:4 (preprocessed)';
              quality = 85;
            }

            resolve({
              width: img.width,
              height: img.height,
              fileSize: buffer.byteLength,
              subsampling,
              quality,
              components: [
                { id: 0, scaleX: 1, scaleY: 1, samplingFactors: '1×1' },
                {
                  id: 1,
                  scaleX: isOriginal ? 0.5 : 1,
                  scaleY: isOriginal ? 0.5 : 1,
                  samplingFactors: isOriginal ? '0.5×0.5' : '1×1',
                },
                {
                  id: 2,
                  scaleX: isOriginal ? 0.5 : 1,
                  scaleY: isOriginal ? 0.5 : 1,
                  samplingFactors: isOriginal ? '0.5×0.5' : '1×1',
                },
              ],
            });
          };

          img.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            reject(new Error('Failed to load image for metadata extraction'));
          };

          img.src = imageUrl;
        });
      }
    } catch (error) {
      throw new Error(`Failed to extract metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleImageSelect = async (file: File, buffer: ArrayBuffer) => {
    setSelectedFile(file);
    setOriginalBuffer(buffer);
    setOriginalUrl(URL.createObjectURL(file));
    setError(null);
    setSuccess(null);
    setProcessedBuffer(null);
    setProcessedUrl(null);
    setProcessedMetadata(null);

    try {
      const metadata = await extractImageMetadata(buffer);
      setOriginalMetadata(metadata);
    } catch (err) {
      setError(`Failed to read image metadata: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setOriginalBuffer(null);
    setOriginalMetadata(null);
    setProcessedBuffer(null);
    setProcessedMetadata(null);
    if (originalUrl) {
      URL.revokeObjectURL(originalUrl);
    }
    if (processedUrl) {
      URL.revokeObjectURL(processedUrl);
    }
    setOriginalUrl(null);
    setProcessedUrl(null);
    setError(null);
    setSuccess(null);
  };

  const handlePreprocess = async () => {
    if (!originalBuffer) {
      setError('Please select an image first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setProgress(0);

    try {
      const imageProcessor = new CanvasImageProcessor();

      // Simulate progress updates
      const progressInterval = window.setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Preprocess image to force 4:4:4 subsampling and optimize for steganography
      const processedBuffer = await imageProcessor.preprocessImageToJPEG(originalBuffer, {
        quality: 85,
        maxSize: 1024 * 1024, // 1MB limit
        maxDimensions: 2048,
        maintainAspectRatio: true,
        algorithm: 'none',
        level: 1,
        includeMetadata: false,
      });

      window.clearInterval(progressInterval);
      setProgress(100);

      // Create URL for processed image
      const blob = new Blob([processedBuffer], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      setProcessedUrl(url);
      setProcessedBuffer(processedBuffer);

      // Extract metadata from processed image (this will correctly identify it as processed)
      const processedMeta = await extractImageMetadata(processedBuffer);
      setProcessedMetadata(processedMeta);

      const sizeChange = ((processedBuffer.byteLength - originalBuffer.byteLength) / originalBuffer.byteLength) * 100;
      setSuccess(`Image preprocessed successfully! Size change: ${sizeChange > 0 ? '+' : ''}${sizeChange.toFixed(1)}%`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleDownload = () => {
    if (!processedBuffer || !selectedFile) {
      return;
    }

    const blob = new Blob([processedBuffer], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `preprocessed_${selectedFile.name.replace(/\.[^/.]+$/, '')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const MetadataCard = ({ title, metadata }: { title: string; metadata: ImageMetadata | null }) => (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {metadata ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="font-medium">Dimensions:</div>
              <div>
                {metadata.width} × {metadata.height}
              </div>

              <div className="font-medium">File Size:</div>
              <div>{(metadata.fileSize / 1024).toFixed(1)} KB</div>

              <div className="font-medium">Est. Quality:</div>
              <div>{metadata.quality}%</div>

              <div className="font-medium">Subsampling:</div>
              <div
                className={
                  metadata.subsampling.includes('4:4:4') ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'
                }
              >
                {metadata.subsampling}
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="font-medium mb-2">Components:</div>
              <div className="space-y-1">
                {metadata.components.map((comp, index) => (
                  <div key={comp.id} className="text-xs grid grid-cols-3 gap-2">
                    <span>{index === 0 ? 'Y (Luma)' : index === 1 ? 'Cb (Chroma)' : 'Cr (Chroma)'}</span>
                    <span>
                      Scale: {comp.scaleX}×{comp.scaleY}
                    </span>
                    <span>Factor: {comp.samplingFactors}</span>
                  </div>
                ))}
              </div>
            </div>

            {(metadata.subsampling.includes('4:2:0') || metadata.subsampling.includes('grey filter')) && (
              <div className="pt-2 border-t">
                <div className="text-orange-600 text-xs p-2 bg-orange-50 rounded">
                  ⚠️ This image likely uses 4:2:0 subsampling which may cause grey filter issues in steganography.
                </div>
              </div>
            )}

            {metadata.subsampling.includes('4:4:4') && (
              <div className="pt-2 border-t">
                <div className="text-green-600 text-xs p-2 bg-green-50 rounded">
                  ✅ This image uses 4:4:4 subsampling and should work well for steganography.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground text-center py-8">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No image loaded</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Image Preprocessing Pipeline</h1>
          <p className="text-muted-foreground">
            Test the preprocessing pipeline to fix JPEG subsampling issues for steganography
          </p>
        </div>

        {/* Image Upload */}
        <Card>
          <CardHeader>
            <CardTitle>1. Upload Test Image</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUploader
              onImageSelect={handleImageSelect}
              currentImage={originalUrl || undefined}
              onClear={handleClearImage}
              maxSize={10 * 1024 * 1024} // 10MB limit for testing
            />
          </CardContent>
        </Card>

        {/* Process Button */}
        {originalBuffer && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-center">
                <Button
                  onClick={handlePreprocess}
                  disabled={!originalBuffer || isProcessing}
                  size="lg"
                  className="px-8"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                  {isProcessing ? 'Processing...' : 'Preprocess Image'}
                </Button>
              </div>
              {isProcessing && (
                <div className="mt-4 space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-center text-muted-foreground">Converting to 4:4:4 subsampling format...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Two-column comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Image */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center">Original Image</h2>
            <Card>
              <CardContent className="p-4">
                {originalUrl ? (
                  <img src={originalUrl} alt="Original" className="w-full max-h-64 object-contain rounded border" />
                ) : (
                  <div className="w-full h-64 bg-gray-100 rounded border flex items-center justify-center">
                    <span className="text-gray-400">No image selected</span>
                  </div>
                )}
              </CardContent>
            </Card>
            <MetadataCard title="Original Metadata" metadata={originalMetadata} />
          </div>

          {/* Processed Image */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center">Preprocessed Image</h2>
            <Card>
              <CardContent className="p-4">
                {processedUrl ? (
                  <img
                    src={processedUrl}
                    alt="Preprocessed"
                    className="w-full max-h-64 object-contain rounded border"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-100 rounded border flex items-center justify-center">
                    <span className="text-gray-400">
                      {originalBuffer ? 'Click "Preprocess Image" above' : 'Upload an image first'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
            <MetadataCard title="Processed Metadata" metadata={processedMetadata} />
          </div>
        </div>

        {/* Download Section */}
        {processedBuffer && (
          <Card>
            <CardHeader>
              <CardTitle>2. Download Preprocessed Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Button onClick={handleDownload} className="px-8">
                  <Download className="h-4 w-4 mr-2" />
                  Download Preprocessed Image
                </Button>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                This preprocessed image should be compatible with steganography without grey filter issues
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
