import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Download, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { ImageUploader } from '@/components/custom/ImageUploader';
import { SteganographyEngine } from '@mischiefmaker/core';
import { CanvasImageProcessor } from '@/services/CanvasImageProcessor';

export default function Encode() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageBuffer, setImageBuffer] = useState<ArrayBuffer | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isEncoding, setIsEncoding] = useState(false);
  const [encodedImageUrl, setEncodedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showMessage, setShowMessage] = useState(false);

  const handleImageSelect = (file: File, buffer: ArrayBuffer) => {
    setSelectedFile(file);
    setImageBuffer(buffer);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setSuccess(null);
    setEncodedImageUrl(null);
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setImageBuffer(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setError(null);
    setSuccess(null);
    setEncodedImageUrl(null);
  };

  const handleEncode = async () => {
    if (!imageBuffer || !message.trim()) {
      setError('Please select an image and enter a message');
      return;
    }

    setIsEncoding(true);
    setError(null);
    setSuccess(null);
    setProgress(0);

    try {
      const imageProcessor = new CanvasImageProcessor();
      const engine = new SteganographyEngine(imageProcessor);

      // Simulate progress updates
      const progressInterval = window.setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await engine.encodeMessage(imageBuffer, message);

      window.clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        // Create URL for the encoded image
        const blob = new Blob([result.imageData!], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        setEncodedImageUrl(url);

        setSuccess(
          `Message encoded successfully! ${result.usedFallback ? 'Used fallback method for better reliability.' : ''} 
          Method: ${result.methodUsed}, File size: ${Math.round(result.fileSize! / 1024)}KB`
        );
      } else {
        setError(result.error || 'Failed to encode message');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsEncoding(false);
      setProgress(0);
    }
  };

  const handleDownload = () => {
    if (!encodedImageUrl || !selectedFile) return;

    const link = document.createElement('a');
    link.href = encodedImageUrl;
    link.download = `encoded_${selectedFile.name.replace(/\.[^/.]+$/, '')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const messageLength = message.length;
  const maxMessageLength = 10000; // Reasonable limit for UI

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Encode Secret Message</h1>
          <p className="text-muted-foreground">Hide your secret message inside an image using steganography</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle>1. Choose Image</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUploader
                onImageSelect={handleImageSelect}
                currentImage={previewUrl || undefined}
                onClear={handleClearImage}
                maxSize={5 * 1024 * 1024} // 5MB limit
              />
            </CardContent>
          </Card>

          {/* Message Input */}
          <Card>
            <CardHeader>
              <CardTitle>2. Enter Secret Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="message">Your secret message</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowMessage(!showMessage)}>
                    {showMessage ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Textarea
                  id="message"
                  placeholder="Enter your secret message here..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="min-h-32"
                  maxLength={maxMessageLength}
                  style={{ fontFamily: showMessage ? 'inherit' : 'monospace' }}
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Message length: {messageLength}</span>
                  <span>Max: {maxMessageLength}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Encode Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center">
              <Button
                onClick={handleEncode}
                disabled={!imageBuffer || !message.trim() || isEncoding}
                size="lg"
                className="px-8"
              >
                {isEncoding ? 'Encoding...' : 'Encode Message'}
              </Button>
            </div>
            {isEncoding && (
              <div className="mt-4 space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-center text-muted-foreground">Processing your image...</p>
              </div>
            )}
          </CardContent>
        </Card>

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

        {/* Download Section */}
        {encodedImageUrl && (
          <Card>
            <CardHeader>
              <CardTitle>3. Download Encoded Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={encodedImageUrl}
                  alt="Your encoded file ready for download"
                  className="max-w-full max-h-64 rounded-lg border"
                />
              </div>
              <div className="flex justify-center">
                <Button onClick={handleDownload} className="px-8">
                  <Download className="h-4 w-4 mr-2" />
                  Download Encoded Image
                </Button>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Share this image with others to let them decode your secret message!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
