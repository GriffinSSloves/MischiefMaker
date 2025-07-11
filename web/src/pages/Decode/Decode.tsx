import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Copy, AlertCircle, CheckCircle, Eye, EyeOff, Download } from 'lucide-react';
import { ImageUploader } from '@/components/custom/ImageUploader';
import { SteganographyEngine } from '@mischiefmaker/core';
import { CanvasImageProcessor } from '@/services/CanvasImageProcessor';

export default function Decode() {
  const [, setSelectedFile] = useState<File | null>(null);
  const [imageBuffer, setImageBuffer] = useState<ArrayBuffer | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodedMessage, setDecodedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const [methodUsed, setMethodUsed] = useState<string | null>(null);

  const handleImageSelect = (file: File, buffer: ArrayBuffer) => {
    setSelectedFile(file);
    setImageBuffer(buffer);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setSuccess(null);
    setDecodedMessage(null);
    setMethodUsed(null);
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
    setDecodedMessage(null);
    setMethodUsed(null);
  };

  const handleDecode = async () => {
    if (!imageBuffer) {
      setError('Please select an image to decode');
      return;
    }

    setIsDecoding(true);
    setError(null);
    setSuccess(null);
    setDecodedMessage(null);
    setProgress(0);

    try {
      const imageProcessor = new CanvasImageProcessor();
      const engine = new SteganographyEngine(imageProcessor);

      // Simulate progress updates
      const progressInterval = window.setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 90));
      }, 200);

      const result = await engine.decodeMessage(imageBuffer);

      window.clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        setDecodedMessage(result.message!);
        setMethodUsed(result.methodDetected!);
        setSuccess(
          `Message decoded successfully! Method detected: ${result.methodDetected}, Message length: ${result.messageLength} characters`
        );
      } else {
        setError(result.error || 'Failed to decode message. This image may not contain a hidden message.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsDecoding(false);
      setProgress(0);
    }
  };

  const copyToClipboard = async () => {
    if (!decodedMessage) {
      return;
    }

    try {
      await navigator.clipboard.writeText(decodedMessage);
      setSuccess('Message copied to clipboard!');
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const downloadMessage = () => {
    if (!decodedMessage) {
      return;
    }

    const blob = new Blob([decodedMessage], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `decoded_message_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Decode Secret Message</h1>
          <p className="text-muted-foreground">Extract the hidden message from an image using steganography</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle>1. Choose Encoded Image</CardTitle>
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

          {/* Decode Button */}
          <Card>
            <CardHeader>
              <CardTitle>2. Extract Hidden Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Button onClick={handleDecode} disabled={!imageBuffer || isDecoding} size="lg" className="px-8">
                  {isDecoding ? 'Decoding...' : 'Decode Message'}
                </Button>
              </div>
              {isDecoding && (
                <div className="mt-4 space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-center text-muted-foreground">Analyzing image for hidden data...</p>
                </div>
              )}
              {methodUsed && (
                <div className="text-sm text-center text-muted-foreground">Detection method: {methodUsed}</div>
              )}
            </CardContent>
          </Card>
        </div>

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

        {/* Decoded Message */}
        {decodedMessage && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>3. Decoded Message</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowMessage(!showMessage)}>
                    {showMessage ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={downloadMessage}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <div
                  className={`p-4 border rounded-lg bg-muted/50 min-h-32 whitespace-pre-wrap ${
                    showMessage ? 'font-mono' : 'blur-sm select-none'
                  }`}
                >
                  {decodedMessage}
                </div>
                {!showMessage && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setShowMessage(true)}
                      className="bg-background/80 backdrop-blur-sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Show Message
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Characters: {decodedMessage.length}</span>
                <span>Click the eye icon to reveal/hide the message</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>1. Upload an image that contains a hidden message</p>
              <p>2. Click &quot;Decode Message&quot; to extract the secret text</p>
              <p>3. The decoded message will appear below if found</p>
              <p>4. Use the eye icon to show/hide the message for privacy</p>
              <p>5. Copy to clipboard or download as text file</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
