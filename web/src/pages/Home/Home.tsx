import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileImage, MessageSquare, Download, Settings } from 'lucide-react';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Welcome to MischiefMaker</h1>
          <p className="text-xl text-muted-foreground">Hide secret messages in pictures using advanced steganography</p>
          <p className="text-muted-foreground">
            Send hidden messages through images that survive compression from messaging services like iMessage,
            WhatsApp, and more.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="text-center">
              <FileImage className="h-12 w-12 mx-auto mb-2 text-primary" />
              <CardTitle>Encode</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">Hide your secret message inside an image</p>
              <Button asChild className="w-full">
                <Link to="/encode">Start Encoding</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 text-primary" />
              <CardTitle>Decode</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">Extract hidden messages from images</p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/decode">Start Decoding</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Settings className="h-12 w-12 mx-auto mb-2 text-primary" />
              <CardTitle>Preprocessing</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">Test image preprocessing pipeline for JPEG compatibility</p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/preprocessing">Test Pipeline</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Download className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <CardTitle className="text-muted-foreground">Coming Soon</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">Additional features and improvements</p>
              <Button disabled className="w-full">
                Stay Tuned
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800">
            <p className="mb-4">
              MischiefMaker uses DCT (Discrete Cosine Transform) coefficient steganography to hide messages in JPEG
              images. This method ensures your hidden messages survive compression from messaging services.
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Messages are embedded in the frequency domain, not pixel values</li>
              <li>Compatible with messaging service compression (iMessage, WhatsApp, SMS/MMS)</li>
              <li>Automatic quality optimization and preprocessing for best results</li>
              <li>Advanced error correction ensures message reliability</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
