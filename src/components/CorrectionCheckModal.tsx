import { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, AlertCircle, CheckCircle, Flag } from 'lucide-react';
import { CorrectionCheckFile, OrderWithTabs } from '../lib/types';
import { supabase } from '../lib/supabase';

interface CorrectionCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderWithTabs[];
}

export default function CorrectionCheckModal({
  isOpen,
  onClose,
  orders
}: CorrectionCheckModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [markedForReview, setMarkedForReview] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  const files = useMemo(() => {
    const allFiles: CorrectionCheckFile[] = [];

    orders.forEach(order => {
      order.tabs.forEach(tab => {
        if (tab.pdfFile && tab.pdfDataUrl) {
          allFiles.push({
            orderItemId: order.id,
            orderNumber: order.order_number,
            veeqoId: order.veeqo_id,
            sku: order.sku,
            productTitle: order.product_title,
            customerNote: order.customer_note,
            additionalOptions: order.additional_options,
            tabId: tab.id,
            tabNumber: tab.tabNumber,
            tabLabel: tab.label,
            totalTabs: order.tabs.filter(t => !(t.isCard && t.label === 'Inside')).length,
            isCard: tab.isCard,
            selectedFolder: tab.selectedFolder,
            pdfDataUrl: tab.pdfDataUrl,
            pdfFile: tab.pdfFile,
            fileType: tab.fileType,
            isAutoLoaded: tab.isAutoLoaded,
            orderNumberPlaced: tab.orderNumberPlaced,
            position: tab.position,
            imageUrls: order.imageUrls,
            markedForReview: order.marked_for_review,
            reviewNotes: order.review_notes
          });
        }
      });
    });

    return allFiles.sort((a, b) => {
      if (a.orderNumber !== b.orderNumber) {
        return a.orderNumber.localeCompare(b.orderNumber);
      }
      return a.tabNumber - b.tabNumber;
    });
  }, [orders]);

  useEffect(() => {
    if (files.length > 0) {
      const currentFile = files[currentIndex];
      setMarkedForReview(currentFile.markedForReview);
      setReviewNotes(currentFile.reviewNotes);
    }
  }, [currentIndex, files]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          handlePrevious();
          break;
        case 'ArrowRight':
        case 'PageDown':
          handleNext();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, files.length]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : files.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < files.length - 1 ? prev + 1 : 0));
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleFitScreen = () => {
    setZoom(100);
  };

  const handleToggleReviewFlag = async () => {
    if (files.length === 0) return;
    const currentFile = files[currentIndex];
    const newMarkedForReview = !markedForReview;

    setMarkedForReview(newMarkedForReview);

    await supabase
      .from('order_items')
      .update({
        marked_for_review: newMarkedForReview,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentFile.orderItemId);
  };

  const handleSaveNotes = async () => {
    if (files.length === 0) return;
    const currentFile = files[currentIndex];

    await supabase
      .from('order_items')
      .update({
        review_notes: reviewNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentFile.orderItemId);
  };

  if (!isOpen || files.length === 0) return null;

  const currentFile = files[currentIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col z-50">
      {/* Top Toolbar */}
      <div className="bg-gray-900 text-white px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Design Correction Check</h2>
            <p className="text-sm text-gray-400 mt-1">
              File {currentIndex + 1} of {files.length}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-800 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium min-w-[60px] text-center">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-800 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={handleFitScreen}
              className="p-2 hover:bg-gray-800 rounded transition-colors"
              title="Fit to Screen"
            >
              <Maximize className="w-5 h-5" />
            </button>
            <button
              onClick={handleToggleReviewFlag}
              className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                markedForReview
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Flag className="w-5 h-5" />
              {markedForReview ? 'Flagged' : 'Flag for Review'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Order Details */}
        <div className="w-80 bg-gray-800 text-white p-6 overflow-y-auto border-r border-gray-700">
          <div className="text-lg font-semibold text-gray-300 mb-4">Order Details</div>

          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-2xl font-bold">#{currentFile.orderNumber}</div>
              {currentFile.orderNumberPlaced ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <AlertCircle className="w-6 h-6 text-yellow-500" />
              )}
            </div>
            <div className="text-sm text-gray-400">Veeqo ID: {currentFile.veeqoId}</div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">Product</div>
              <div className="text-sm font-medium bg-gray-900 p-3 rounded">
                {currentFile.productTitle}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">SKU</div>
              <div className="text-sm font-medium bg-gray-900 p-3 rounded">
                {currentFile.sku}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Tab</div>
              <div className="text-sm font-medium bg-gray-900 p-3 rounded">
                {currentFile.isCard ? currentFile.tabLabel : `Tab ${currentFile.tabNumber}`}
                {currentFile.totalTabs > 1 && ` of ${currentFile.totalTabs}`}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Destination Folder</div>
              <div className="text-sm font-medium bg-gray-900 p-3 rounded">
                {currentFile.selectedFolder || 'Not selected'}
              </div>
            </div>

            {currentFile.position && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Placement Position</div>
                <div className="text-sm font-medium bg-gray-900 p-3 rounded">
                  X: {currentFile.position.x}, Y: {currentFile.position.y}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center - PDF/Image Viewer */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 relative">
          <div
            className="flex-1 flex items-center justify-center overflow-auto w-full"
            style={{ zoom: `${zoom}%` }}
          >
            {currentFile.fileType === 'jpg' ? (
              <img
                src={currentFile.pdfDataUrl}
                alt={`Design Preview - Order ${currentFile.orderNumber}`}
                className="max-w-[900px] max-h-[1100px] bg-white shadow-2xl"
              />
            ) : (
              <iframe
                src={currentFile.pdfDataUrl}
                className="w-[900px] h-[1100px] bg-white shadow-2xl"
                title={`PDF Preview - Order ${currentFile.orderNumber}`}
              />
            )}
          </div>

          {/* Navigation Arrows at Bottom */}
          <div className="flex items-center justify-center gap-8 py-4 bg-gray-800 bg-opacity-90 w-full">
            <button
              onClick={handlePrevious}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-all"
              title="Previous (←)"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <span className="text-white text-sm font-medium">
              Use arrow keys to navigate • ESC to close
            </span>
            <button
              onClick={handleNext}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-all"
              title="Next (→)"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>
        </div>

        {/* Right Sidebar - Customization Details */}
        <div className="w-80 bg-gray-800 text-white p-6 overflow-y-auto border-l border-gray-700">
          <div className="text-lg font-semibold text-gray-300 mb-4">Customization Details</div>

          {currentFile.customerNote && (
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Customer Note</div>
              <div className="text-sm bg-gray-900 p-3 rounded max-h-32 overflow-y-auto">
                {currentFile.customerNote}
              </div>
            </div>
          )}

          {currentFile.additionalOptions && (
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Additional Options</div>
              <div className="text-sm bg-gray-900 p-3 rounded max-h-32 overflow-y-auto">
                {currentFile.additionalOptions}
              </div>
            </div>
          )}

          {currentFile.imageUrls.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-2">Customer Images</div>
              <div className="grid grid-cols-2 gap-2">
                {currentFile.imageUrls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Customer upload ${idx + 1}`}
                    className="w-full h-24 object-cover rounded border border-gray-700 cursor-pointer hover:border-gray-500 transition-colors"
                    onClick={() => window.open(url, '_blank')}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="text-xs text-gray-400 mb-2">Review Notes</div>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add notes about this design..."
              rows={4}
              className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            />
            <button
              onClick={handleSaveNotes}
              className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-sm font-medium"
            >
              Save Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
