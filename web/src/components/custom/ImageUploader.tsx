import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  onImageSelect: (file: File, buffer: ArrayBuffer) => void;
  accept?: string;
  maxSize?: number; // in bytes
  className?: string;
  currentImage?: string; // preview URL
  onClear?: () => void;
}

export function ImageUploader({
  onImageSelect,
  accept = 'image/*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  className,
  currentImage,
  onClear,
}: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!file.type.startsWith('image/')) {
        return 'Please select a valid image file';
      }
      if (file.size > maxSize) {
        return `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`;
      }
      return null;
    },
    [maxSize]
  );

  const handleFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setLoading(true);

      try {
        const buffer = await file.arrayBuffer();
        onImageSelect(file, buffer);
      } catch {
        setError('Failed to read file');
      } finally {
        setLoading(false);
      }
    },
    [onImageSelect, validateFile]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleClear = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    setError(null);
    onClear?.();
  }, [onClear]);

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Upload Area */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50',
              loading && 'opacity-50 pointer-events-none'
            )}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleClick();
              }
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              onChange={handleChange}
              className="hidden"
              aria-label="Upload image"
            />

            <div className="flex flex-col items-center space-y-2">
              {loading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Click to upload</span> or drag and drop
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, GIF up to {Math.round(maxSize / (1024 * 1024))}MB
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

          {/* Image Preview */}
          {currentImage && (
            <div className="relative">
              <div className="border rounded-lg overflow-hidden">
                <img src={currentImage} alt="Preview" className="w-full h-48 object-cover" />
              </div>
              <Button variant="outline" size="sm" className="absolute top-2 right-2 h-8 w-8 p-0" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Upload Button (alternative to drag/drop) */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClick} disabled={loading} className="flex-1">
              <ImageIcon className="h-4 w-4 mr-2" />
              {loading ? 'Processing...' : 'Choose Image'}
            </Button>
            {currentImage && (
              <Button variant="outline" onClick={handleClear} size="sm">
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
