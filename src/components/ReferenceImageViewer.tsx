import { useState, useEffect } from 'react';
import { Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { loadReferenceImageForSKU, ReferenceImage } from '../lib/referenceImageService';

interface ReferenceImageViewerProps {
  sku: string;
  className?: string;
}

export function ReferenceImageViewer({ sku, className = '' }: ReferenceImageViewerProps) {
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadImage = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const image = await loadReferenceImageForSKU(sku);
      setReferenceImage(image);

      if (!image) {
        setError('No reference image found');
      }
    } catch (err) {
      console.error('Error loading reference image:', err);
      setError('Failed to load reference image');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadImage();
  }, [sku]);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Reference Image</h3>
        <button
          onClick={loadImage}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-gray-50 rounded border border-gray-200 p-3 mb-2">
        <p className="text-xs font-medium text-gray-700 mb-1">SKU:</p>
        <p className="text-sm font-semibold text-gray-900">{sku}</p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center min-h-[300px] max-h-[500px] overflow-auto">
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-spin" />
            <p className="text-sm text-gray-500">Loading reference image...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 px-4">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600 mb-1">{error}</p>
            <p className="text-xs text-gray-500">
              Make sure the reference images folder is selected in Settings and contains a file named {sku}.jpg or {sku}.png
            </p>
          </div>
        ) : referenceImage ? (
          <div className="p-2 w-full">
            <img
              src={referenceImage.dataUrl}
              alt={`Reference for ${sku}`}
              className="w-full h-auto object-contain max-h-[480px] rounded"
            />
            <p className="text-xs text-gray-500 text-center mt-2">{referenceImage.file.name}</p>
          </div>
        ) : (
          <div className="text-center py-8 px-4">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">No reference image available</p>
          </div>
        )}
      </div>
    </div>
  );
}
