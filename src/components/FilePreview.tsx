import { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

interface FilePreviewProps {
  file: File;
  objectUrl: string;
  alt?: string;
  className?: string;
}

export function FilePreview({ file, objectUrl, alt = 'Preview', className = '' }: FilePreviewProps) {
  const isPDF = file.type === 'application/pdf';
  const [pdfImageUrl, setPdfImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isPDF && objectUrl) {
      renderPDFToImage();
    }
  }, [isPDF, objectUrl]);

  const renderPDFToImage = async () => {
    setIsLoading(true);
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const base64Data = objectUrl.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Could not get canvas context');
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      const imageUrl = canvas.toDataURL('image/png');
      setPdfImageUrl(imageUrl);
      setIsLoading(false);
    } catch (error) {
      console.error('Error rendering PDF:', error);
      setIsLoading(false);
    }
  };

  if (isPDF) {
    if (isLoading) {
      return (
        <div className={`flex items-center justify-center bg-gray-100 min-h-[400px] ${className}`}>
          <div className="text-gray-500 text-sm">Loading PDF preview...</div>
        </div>
      );
    }

    if (pdfImageUrl) {
      return (
        <img
          src={pdfImageUrl}
          alt={alt}
          className={`max-w-full h-auto ${className}`}
        />
      );
    }

    return null;
  }

  return (
    <img
      src={objectUrl}
      alt={alt}
      className={`max-w-full h-auto ${className}`}
    />
  );
}
