import { useEffect, useRef, useState } from 'react';
import { RotateCw, AlertCircle } from 'lucide-react';
import { convertPDFToImageDataURL } from '../lib/pdfProcessor';

interface InteractivePlacementProps {
  dataUrl: string;
  orderNumber: string;
  fileType: 'pdf' | 'image';
  onPositionChange: (x: number, y: number, fontSize: number, rotation: number) => void;
  initialPosition?: { x: number; y: number; fontSize: number; rotation: number } | null;
}

export function InteractivePlacement({
  dataUrl,
  orderNumber,
  fileType,
  onPositionChange,
  initialPosition
}: InteractivePlacementProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(initialPosition || { x: 50, y: 50 });
  const [fontSize, setFontSize] = useState(initialPosition?.fontSize || 40);
  const [rotation, setRotation] = useState(initialPosition?.rotation || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [actualFileDimensions, setActualFileDimensions] = useState({ width: 0, height: 0 });
  const [displayDimensions, setDisplayDimensions] = useState({ width: 800, height: 600 });
  const [renderError, setRenderError] = useState<string | null>(null);
  const [displayImageUrl, setDisplayImageUrl] = useState<string>('');

  useEffect(() => {
    if (dataUrl) {
      renderPreview();
    }
  }, [dataUrl]);

  useEffect(() => {
    // Notify parent of position changes
    onPositionChange(position.x, position.y, fontSize, rotation);
  }, [position, fontSize, rotation]);

  const renderPreview = async () => {
    setIsLoading(true);
    setRenderError(null);

    try {
      let imageUrlToUse = dataUrl;

      if (fileType === 'pdf') {
        const base64Data = dataUrl.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const convertedImageUrl = await convertPDFToImageDataURL(blob);
        imageUrlToUse = convertedImageUrl;
      }

      setDisplayImageUrl(imageUrlToUse);

      const img = new Image();
      img.onload = () => {
        const actualWidth = img.naturalWidth;
        const actualHeight = img.naturalHeight;
        setActualFileDimensions({ width: actualWidth, height: actualHeight });

        const targetWidth = 800;
        const targetHeight = 600;
        const scale = Math.min(targetWidth / actualWidth, targetHeight / actualHeight);
        const displayWidth = actualWidth * scale;
        const displayHeight = actualHeight * scale;
        setDisplayDimensions({ width: displayWidth, height: displayHeight });
        setIsLoading(false);
      };
      img.onerror = () => {
        setRenderError('Failed to load file');
        setIsLoading(false);
      };
      img.src = imageUrlToUse;
    } catch (error) {
      console.error('Error loading preview:', error);
      setRenderError(`Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('order-number-text')) {
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && containerRef.current && actualFileDimensions.width > 0) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const scaleX = actualFileDimensions.width / displayDimensions.width;
      const scaleY = actualFileDimensions.height / displayDimensions.height;

      const actualX = clickX * scaleX;
      const actualY = clickY * scaleY;

      setPosition({ x: actualX, y: actualY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-start">
          <div className="flex items-center gap-2">
            <label htmlFor="fontSize" className="text-sm font-medium text-gray-700">
              Font Size:
            </label>
            <input
              type="number"
              id="fontSize"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-20 px-2 py-1 border border-gray-300 rounded"
              min="8"
              max="72"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <RotateCw size={16} className="text-gray-700" />
              <label htmlFor="rotation" className="text-sm font-medium text-gray-700">
                Rotation: {rotation}°
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                id="rotation"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-48"
                min="0"
                max="360"
                step="1"
              />
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setRotation(0)}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              >
                0°
              </button>
              <button
                onClick={() => setRotation(90)}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              >
                90°
              </button>
              <button
                onClick={() => setRotation(180)}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              >
                180°
              </button>
              <button
                onClick={() => setRotation(270)}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              >
                270°
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center bg-gray-100 p-6 rounded-lg">
        {isLoading ? (
          <div className="flex items-center justify-center h-[600px] w-[800px] bg-white">
            <div className="text-gray-500">Loading preview...</div>
          </div>
        ) : renderError ? (
          <div className="flex flex-col items-center justify-center h-[600px] w-[800px] bg-white">
            <AlertCircle size={48} className="text-red-500 mb-4" />
            <div className="text-red-600 text-center">
              <p className="font-semibold mb-2">Failed to load preview</p>
              <p className="text-sm text-gray-600">{renderError}</p>
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="relative bg-white shadow-lg cursor-crosshair"
            style={{
              width: `${displayDimensions.width}px`,
              height: `${displayDimensions.height}px`
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              ref={imageRef}
              src={displayImageUrl}
              alt="Design Preview"
              className="block w-full h-full"
              style={{ objectFit: 'contain', objectPosition: 'top left' }}
            />
            <div
              className="absolute order-number-text cursor-move px-2 py-1 rounded border-2 border-blue-500 select-none pointer-events-auto"
              style={{
                left: `${(position.x * displayDimensions.width) / actualFileDimensions.width}px`,
                top: `${(position.y * displayDimensions.height) / actualFileDimensions.height}px`,
                fontSize: `${(fontSize * displayDimensions.width) / actualFileDimensions.width}px`,
                fontWeight: 'bold',
                color: '#000',
                backgroundColor: 'transparent',
                textShadow: '0 0 3px white, 0 0 3px white, 0 0 3px white, 0 0 3px white',
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'left top',
              }}
            >
              {orderNumber}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
