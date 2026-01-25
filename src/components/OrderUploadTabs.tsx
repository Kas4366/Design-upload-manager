import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckCircle, X, MapPin, Save, Trash2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { OrderWithTabs, UploadTab } from '../lib/types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface OrderUploadTabsProps {
  order: OrderWithTabs;
  onTabUpdate: (tabId: string, file: File, dataUrl: string) => void;
  onRemoveFile: (tabId: string) => void;
  onPlaceOrderNumber: (tabId: string) => void;
  onAdjustPosition: (tabId: string) => void;
  onClearPosition: (tabId: string) => void;
  onSaveOrder: () => void;
}

export function OrderUploadTabs({
  order,
  onTabUpdate,
  onRemoveFile,
  onPlaceOrderNumber,
  onAdjustPosition,
  onClearPosition,
  onSaveOrder
}: OrderUploadTabsProps) {
  const [activeTabId, setActiveTabId] = useState(order.tabs[0]?.id || '');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const activeTab = order.tabs.find(t => t.id === activeTabId) || order.tabs[0];

  useEffect(() => {
    if (activeTab.pdfDataUrl && canvasRef.current) {
      renderPDFPreview();
    }
  }, [activeTab.pdfDataUrl, activeTab.position, activeTabId]);

  const renderPDFPreview = async () => {
    if (!activeTab.pdfDataUrl || !canvasRef.current) return;

    try {
      setPdfLoading(true);
      const loadingTask = pdfjsLib.getDocument(activeTab.pdfDataUrl);
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

      if (activeTab.position && activeTab.orderNumberPlaced) {
        context.font = `bold ${activeTab.position.fontSize}px Helvetica`;
        context.fillStyle = '#000000';
        context.fillText(order.order_number, activeTab.position.x, activeTab.position.y);
      }

      setPdfLoading(false);
    } catch (error) {
      console.error('Error rendering PDF:', error);
      setPdfLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.includes('pdf')) {
      alert('Please select a PDF file');
      return;
    }

    const dataUrl = await readFileAsDataURL(file);
    onTabUpdate(activeTabId, file, dataUrl);
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const allTabsHaveFiles = order.tabs.every(tab => tab.pdfFile !== null);
  const allTabsHaveOrderNumbers = order.tabs.every(tab => tab.orderNumberPlaced);
  const canSave = allTabsHaveFiles && allTabsHaveOrderNumbers;

  const uploadedCount = order.tabs.filter(t => t.pdfFile).length;
  const placedCount = order.tabs.filter(t => t.orderNumberPlaced).length;

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Order #{order.order_number}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              SKU: {order.sku} | Veeqo ID: {order.veeqo_id}
            </p>
            <p className="text-sm text-gray-700 mt-2">{order.product_title}</p>
          </div>
          <button
            onClick={onSaveOrder}
            disabled={!canSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              canSave
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-5 h-5" />
            Save Design Files
          </button>
        </div>

        {order.customer_note && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <h4 className="text-sm font-semibold text-yellow-900 mb-1">Customer Note:</h4>
            <p className="text-sm text-yellow-800">{order.customer_note}</p>
          </div>
        )}

        {order.imageUrls.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Customer Images:</h4>
            <div className="flex gap-2 overflow-x-auto">
              {order.imageUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Customer upload ${i + 1}`}
                  className="h-20 rounded border border-gray-200"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 text-sm">
          <span className="text-gray-600">
            Uploaded: <span className="font-semibold text-gray-900">{uploadedCount}/{order.tabs.length}</span>
          </span>
          <span className="text-gray-600">
            Order Numbers Placed: <span className="font-semibold text-gray-900">{placedCount}/{order.tabs.length}</span>
          </span>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex gap-2 p-2 overflow-x-auto">
          {order.tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTabId === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              {tab.pdfFile && <CheckCircle className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab.pdfFile ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="font-semibold text-gray-900">{activeTab.pdfFile.name}</p>
                    <p className="text-sm text-gray-600">
                      {(activeTab.pdfFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveFile(activeTabId)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {activeTab.pdfDataUrl && (
                <div ref={containerRef} className="bg-white rounded border border-gray-300 p-4 mb-4 overflow-auto max-h-[500px]">
                  {pdfLoading && (
                    <div className="flex items-center justify-center h-96 text-gray-600">
                      Loading PDF preview...
                    </div>
                  )}
                  <canvas ref={canvasRef} className="max-w-full" />
                </div>
              )}

              <div className="flex items-center gap-4 flex-wrap">
                {activeTab.orderNumberPlaced ? (
                  <>
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Order number placed</span>
                    </div>
                    <button
                      onClick={() => onAdjustPosition(activeTabId)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <MapPin className="w-5 h-5" />
                      Adjust Position
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Remove order number placement? You can place it again.')) {
                          onClearPosition(activeTabId);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                      Clear Position
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onPlaceOrderNumber(activeTabId)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <MapPin className="w-5 h-5" />
                    Place Order Number
                  </button>
                )}

                <label className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">
                  <Upload className="w-5 h-5" />
                  Replace PDF
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors bg-gray-50">
                <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload PDF for {activeTab.label}
                </h3>
                <p className="text-gray-600 mb-4">
                  Click to browse or drag and drop your PDF file here
                </p>
                <p className="text-sm text-gray-500">
                  PDF files only
                </p>
              </div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
