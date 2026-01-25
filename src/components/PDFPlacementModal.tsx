import { useEffect, useRef, useState } from 'react';
import { X, Save, Check, AlertCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import type { Order } from '../lib/types';
import { skuPositionService } from '../lib/db';

// Use a relative path that works in both dev and production Electron builds
pdfjsLib.GlobalWorkerOptions.workerSrc = import.meta.env.DEV
  ? new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  : './pdf.worker.min.mjs';

interface PDFPlacementModalProps {
  order: Order;
  onClose: () => void;
  onSavePosition: (orderId: string, x: number, y: number, fontSize: number) => void;
  initialPosition?: { x: number; y: number; fontSize: number } | null;
}

export function PDFPlacementModal({ order, onClose, onSavePosition, initialPosition }: PDFPlacementModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(initialPosition || { x: 50, y: 50 });
  const [fontSize, setFontSize] = useState(initialPosition?.fontSize || 12);
  const [loading, setLoading] = useState(true);
  const [savedPositionAvailable, setSavedPositionAvailable] = useState(false);
  const [positionApplied, setPositionApplied] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  useEffect(() => {
    if (order.pdfDataUrl && canvasRef.current) {
      renderPDF();
    }
    checkSavedPosition();
  }, [order.pdfDataUrl]);

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
      setPositionApplied(true);
      setTimeout(() => setPositionApplied(false), 2000);
    }
  };

  const renderPDF = async () => {
    if (!order.pdfDataUrl || !canvasRef.current) return;

    try {
      setLoading(true);
      const loadingTask = pdfjsLib.getDocument(order.pdfDataUrl);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      setLoading(false);
    } catch (error) {
      console.error('Error rendering PDF:', error);
      setLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('order-number-text')) {
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setPosition({ x, y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    onSavePosition(order.id, position.x, position.y, fontSize);
    onClose();
  };

  const handleSaveToDatabase = async () => {
    const success = await skuPositionService.savePosition(
      order.sku,
      position.x,
      position.y,
      fontSize
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
          <div className="flex flex-wrap gap-4 items-center">
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
            <div
              ref={containerRef}
              className="relative bg-white shadow-lg cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                  <div className="text-gray-600">Loading PDF...</div>
                </div>
              )}
              <canvas ref={canvasRef} />
              <div
                className="absolute order-number-text cursor-move px-2 py-1 rounded border-2 border-blue-500 select-none pointer-events-auto"
                style={{
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  fontSize: `${fontSize}px`,
                  fontWeight: 'bold',
                  color: '#000',
                  backgroundColor: 'transparent',
                  textShadow: '0 0 3px white, 0 0 3px white, 0 0 3px white, 0 0 3px white',
                }}
              >
                {order.orderNumber}
              </div>
            </div>
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
