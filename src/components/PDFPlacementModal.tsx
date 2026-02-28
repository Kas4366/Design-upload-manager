import { useEffect, useRef, useState } from 'react';
import { X, Save, Check, AlertCircle, RotateCw } from 'lucide-react';
import type { Order } from '../lib/types';
import { skuPositionService } from '../lib/db';
import { convertPDFToImageDataURL } from '../lib/pdfProcessor';

interface PDFPlacementModalProps {
  order: Order;
  onClose: () => void;
  onSavePosition: (orderId: string, x: number, y: number, fontSize: number, rotation: number) => void;
  initialPosition?: { x: number; y: number; fontSize: number; rotation: number } | null;
}

export function PDFPlacementModal({ order, onClose, onSavePosition, initialPosition }: PDFPlacementModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(initialPosition || { x: 50, y: 50 });
  const [fontSize, setFontSize] = useState(initialPosition?.fontSize || (order.fileWidth ? Math.round(order.fileWidth / 75) : 40));
  const [rotation, setRotation] = useState(initialPosition?.rotation || 0);
  const [savedPositionAvailable, setSavedPositionAvailable] = useState(false);
  const [positionApplied, setPositionApplied] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actualFileDimensions, setActualFileDimensions] = useState({ width: 0, height: 0 });
  const [displayDimensions, setDisplayDimensions] = useState({ width: 900, height: 1100 });
  const [renderError, setRenderError] = useState<string | null>(null);
  const [displayImageUrl, setDisplayImageUrl] = useState<string>('');

  useEffect(() => {
    checkSavedPosition();
  }, []);

  useEffect(() => {
    if (order.pdfDataUrl) {
      renderPreview();
    }
  }, [order.pdfDataUrl]);

  const renderPreview = async () => {
    setIsLoading(true);
    setRenderError(null);

    try {
      let imageUrlToUse = order.pdfDataUrl;

      if (order.fileType === 'pdf') {
        const base64Data = order.pdfDataUrl.split(',')[1];
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
        const actualWidth = order.fileWidth || img.naturalWidth;
        const actualHeight = order.fileHeight || img.naturalHeight;
        setActualFileDimensions({ width: actualWidth, height: actualHeight });

        const targetWidth = 900;
        const targetHeight = 1100;
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

  const checkSavedPosition = async () => {
    const savedPosition = await skuPositionService.getSavedPosition(order.sku);
    if (savedPosition) {
      setSavedPositionAvailable(true);
    }
  };

  const loadSavedPosition = async () => {
    const savedPosition = await skuPositionService.getSavedPosition(order.sku);
    if (savedPosition) {
      setPosition({ x: savedPosition.x_position, y: savedPosition.y_position });
      setFontSize(savedPosition.font_size);
      setRotation(savedPosition.rotation);
      setPositionApplied(true);
      setTimeout(() => setPositionApplied(false), 2000);
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

  const handleSave = () => {
    onSavePosition(order.id, position.x, position.y, fontSize, rotation);
    onClose();
  };

  const handleSaveToDatabase = async () => {
    const success = await skuPositionService.savePosition(
      order.sku,
      position.x,
      position.y,
      fontSize,
      rotation,
      actualFileDimensions.width,
      actualFileDimensions.height
    );

    if (success) {
      setShowSaveSuccess(true);
      setSavedPositionAvailable(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Place Order Number</h3>
            <p className="text-sm text-gray-600">Order #{order.orderNumber} - SKU: {order.sku}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 bg-gray-50 border-b border-gray-200">
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

            <div className="flex flex-col gap-2">
              {savedPositionAvailable && (
                <button
                  onClick={loadSavedPosition}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded text-sm transition-colors flex items-center gap-2"
                >
                  <Check size={16} />
                  Use Saved Position
                </button>
              )}

              <button
                onClick={handleSaveToDatabase}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded text-sm transition-colors flex items-center gap-2"
              >
                <Save size={16} />
                Save Position for SKU
              </button>
            </div>

            {showSaveSuccess && (
              <span className="text-green-600 text-sm flex items-center gap-1">
                <Check size={16} />
                Position saved successfully!
              </span>
            )}

            {positionApplied && (
              <span className="text-blue-600 text-sm flex items-center gap-1">
                <AlertCircle size={16} />
                Saved position applied!
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-gray-100">
          <div className="flex justify-center">
            {isLoading ? (
              <div className="flex items-center justify-center h-[1100px] w-[900px] bg-white">
                <div className="text-gray-500">Loading preview...</div>
              </div>
            ) : renderError ? (
              <div className="flex flex-col items-center justify-center h-[1100px] w-[900px] bg-white">
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
                  {order.orderNumber}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Check size={18} />
            Apply Position
          </button>
        </div>
      </div>
    </div>
  );
}
