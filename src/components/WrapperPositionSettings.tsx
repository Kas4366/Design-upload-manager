import { useState, useEffect } from 'react';
import { Upload, Check, AlertCircle, FileImage, RotateCcw } from 'lucide-react';
import { PDFPreview } from './PDFPreview';
import { productTypePositionService, ProductTypePosition } from '../lib/productTypePositionService';

export function WrapperPositionSettings() {
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [sampleDataUrl, setSampleDataUrl] = useState<string | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number; fontSize: number; rotation: number } | null>(null);
  const [savedPosition, setSavedPosition] = useState<ProductTypePosition | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSavedPosition();
  }, []);

  const loadSavedPosition = async () => {
    const saved = await productTypePositionService.getPositionByType('wrapper');
    if (saved) {
      setSavedPosition(saved);
      setPosition({
        x: saved.x_position,
        y: saved.y_position,
        fontSize: saved.font_size,
        rotation: saved.rotation
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image')) {
      setError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    setError(null);
    setSampleFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSampleDataUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePosition = async () => {
    if (!position) {
      setError('Please place the order number on the sample wrapper first');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await productTypePositionService.savePosition('wrapper', position);

      if (result.success) {
        setSaveSuccess(true);
        await loadSavedPosition();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to save position');
      }
    } catch (err) {
      setError(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePositionChange = (x: number, y: number, fontSize: number, rotation: number) => {
    setPosition({ x, y, fontSize, rotation });
  };

  const handleReset = () => {
    setSampleFile(null);
    setSampleDataUrl(null);
    setPosition(savedPosition ? {
      x: savedPosition.x_position,
      y: savedPosition.y_position,
      fontSize: savedPosition.font_size,
      rotation: savedPosition.rotation
    } : null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileImage className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Wrapper Order Number Position</p>
            <p>Upload a sample wrapper image, place the order number once, and save. This position will automatically apply to all wrapper orders when you upload CSV files.</p>
          </div>
        </div>
      </div>

      {savedPosition && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">Wrapper Position Saved</p>
              <p>Position: X={savedPosition.x_position}, Y={savedPosition.y_position}, Font Size={savedPosition.font_size}, Rotation={savedPosition.rotation}°</p>
              <p className="mt-1 text-xs">Saved on: {new Date(savedPosition.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Sample Wrapper Image
        </label>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            {sampleFile ? 'Change Sample Image' : 'Upload Sample Image'}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          {sampleFile && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>
        {sampleFile && (
          <p className="mt-2 text-sm text-gray-600">
            Sample file: {sampleFile.name}
          </p>
        )}
      </div>

      {sampleDataUrl && (
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Place Order Number on Sample
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Click on the wrapper image to place the order number. Drag to reposition, use the controls to adjust size and rotation.
          </p>
          <PDFPreview
            pdfDataUrl={sampleDataUrl}
            orderNumber="12345"
            onPositionChange={handlePositionChange}
            initialPosition={position}
            fileType="image"
          />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {sampleFile && position && (
        <div className="flex gap-3">
          <button
            onClick={handleSavePosition}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Wrapper Position
              </>
            )}
          </button>
          {saveSuccess && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
              <Check className="w-4 h-4" />
              <span>Position saved successfully!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
