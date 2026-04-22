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

      let pdfData: Uint8Array;

      if (objectUrl.startsWith('blob:')) {
        // Blob URL — fetch the raw bytes
        const response = await fetch(objectUrl);
        const arrayBuffer = await response.arrayBuffer();
        pdfData = new Uint8Array(arrayBuffer);
      } else {
        // Data URL — extract base64 payload
        const base64Data = objectUrl.split(',')[1];
        const binaryString = atob(base64Data);
        pdfData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          pdfData[i] = binaryString.charCodeAt(i);
        }
      }

      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
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

      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);

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

    return (
      <div className={`flex items-center justify-center bg-gray-100 min-h-[200px] ${className}`}>
        <div className="text-gray-400 text-sm">Preview unavailable</div>
      </div>
    );
  }

  return (
    <img
      src={objectUrl}
      alt={alt}
      className={`max-w-full h-auto ${className}`}
    />
  );
}
