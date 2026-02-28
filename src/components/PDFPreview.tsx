import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { AlertCircle } from 'lucide-react';

interface PDFPreviewProps {
  dataUrl: string;
  fileType: 'pdf' | 'jpg';
  alt?: string;
  className?: string;
}

export function PDFPreview({ dataUrl, fileType, alt = 'Preview', className = '' }: PDFPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fileType === 'jpg') {
      setPreviewUrl(dataUrl);
      setIsLoading(false);
      return;
    }

    renderPDF();

    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [dataUrl, fileType]);

  const renderPDF = async () => {
    setIsLoading(true);
    setError(null);

    if (!canvasRef.current) {
      setTimeout(() => renderPDF(), 50);
      return;
    }

    try {
      let pdfData: ArrayBuffer;

      if (dataUrl.startsWith('data:')) {
        const base64Data = dataUrl.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        pdfData = bytes.buffer;
      } else {
        const response = await fetch(dataUrl);
        pdfData = await response.arrayBuffer();
      }

      const loadingTask = pdfjsLib.getDocument({
        data: pdfData,
        verbosity: 0,
        isEvalSupported: false,
        useSystemFonts: true,
        useWorkerFetch: false,
        disableAutoFetch: true,
        disableStream: true
      });

      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const context = canvas.getContext('2d', { alpha: false });
      if (!context) {
        setError('Failed to get canvas context');
        setIsLoading(false);
        return;
      }

      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport: viewport,
        background: 'white'
      }).promise;

      const imageUrl = canvas.toDataURL('image/png', 1.0);
      setPreviewUrl(imageUrl);
      setIsLoading(false);
    } catch (err) {
      console.error('PDF rendering error:', err);
      setError(err instanceof Error ? err.message : 'Failed to render PDF');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-gray-500 text-sm">Loading preview...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 p-4 ${className}`}>
        <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
        <div className="text-red-600 text-sm text-center">
          <p className="font-semibold mb-1">Preview Error</p>
          <p className="text-xs text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      {previewUrl && (
        <img
          src={previewUrl}
          alt={alt}
          className={className}
        />
      )}
    </>
  );
}
