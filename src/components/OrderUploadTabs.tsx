import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, X, MapPin, Save, Trash2, Folder, AlertCircle, Tag } from 'lucide-react';
import { OrderWithTabs, FolderType } from '../lib/types';
import { findCardPair, isCardTab } from '../lib/csvParser';
import { FilePreview } from './FilePreview';
import { createObjectURLFromFile } from '../lib/pdfProcessor';

interface OrderUploadTabsProps {
  order: OrderWithTabs;
  availableFolders: FolderType[];
  onTabUpdate: (tabId: string, file: File, dataUrl: string) => void;
  onRemoveFile: (tabId: string) => void;
  onPlaceOrderNumber: (tabId: string) => void;
  onAdjustPosition: (tabId: string) => void;
  onClearPosition: (tabId: string) => void;
  onToggleCard: (tabId: string, isCard: boolean) => void;
  onFolderSelect: (tabId: string, folder: string) => void;
  onSaveOrder: () => void;
}

export function OrderUploadTabs({
  order,
  availableFolders,
  onTabUpdate,
  onRemoveFile,
  onPlaceOrderNumber,
  onAdjustPosition,
  onClearPosition,
  onToggleCard,
  onFolderSelect,
  onSaveOrder
}: OrderUploadTabsProps) {
  const [activeTabId, setActiveTabId] = useState(order.tabs[0]?.id || '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTab = order.tabs.find(t => t.id === activeTabId) || order.tabs[0];
  const cardPair = (activeTab && isCardTab(activeTab)) ? findCardPair(order.tabs, activeTabId) : null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, tabId?: string) => {
    const file = e.target.files?.[0];
    if (!file || (!file.type.includes('pdf') && !file.type.includes('image'))) {
      alert('Please select a PDF or JPG file');
      return;
    }

    const objectUrl = await createObjectURLFromFile(file);
    onTabUpdate(tabId || activeTabId, file, objectUrl);
    e.target.value = '';
  };

  const handleTabSwitch = (newTabId: string) => {
    // Only validate folder selection if the current tab has a file uploaded
    if (activeTab && activeTab.pdfFile && !activeTab.selectedFolder) {
      setValidationError('Please select a folder destination before switching tabs.');
      return;
    }
    setValidationError(null);
    setActiveTabId(newTabId);
  };

  const handleCardToggle = (checked: boolean) => {
    onToggleCard(activeTabId, checked);
  };

  const handleFolderChange = (folder: string) => {
    if (cardPair) {
      onFolderSelect(cardPair.front.id, folder);
      onFolderSelect(cardPair.inside.id, folder);
    } else {
      onFolderSelect(activeTabId, folder);
    }
    setValidationError(null);
  };

  const allTabsHaveFiles = order.tabs.every(tab => tab.pdfFile !== null);

  const allTabsHaveOrderNumbers = order.tabs.every(tab => {
    const isInsideCard = tab.isCard && tab.label === 'Inside';
    return isInsideCard || tab.orderNumberPlaced;
  });

  const allTabsHaveFolders = order.tabs.every(tab => tab.selectedFolder !== null);
  const canSave = allTabsHaveFiles && allTabsHaveOrderNumbers && allTabsHaveFolders;

  const uploadedCount = order.tabs.filter(t => t.pdfFile).length;

  const placedCount = order.tabs.filter(t => {
    const isInsideCard = t.isCard && t.label === 'Inside';
    return isInsideCard || t.orderNumberPlaced;
  }).length;

  const foldersSelectedCount = order.tabs.filter(t => t.selectedFolder).length;

  // Safety check: if no active tab, show error
  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full bg-white p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load session</h3>
          <p className="text-gray-600">This order has no valid tabs. Please try a different session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Order #{order.order_number}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Veeqo ID: {order.veeqo_id}
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
            title={!canSave ? 'All tabs must have files, order numbers placed, and folders selected' : ''}
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
            Order Numbers: <span className="font-semibold text-gray-900">{placedCount}/{order.tabs.length}</span>
          </span>
          <span className="text-gray-600">
            Folders: <span className="font-semibold text-gray-900">{foldersSelectedCount}/{order.tabs.length}</span>
          </span>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex gap-2 p-2 overflow-x-auto">
          {order.tabs
            .filter(tab => !tab.isCard || tab.label !== 'Inside')
            .map(tab => {
              const pair = tab.isCard ? findCardPair(order.tabs, tab.id) : null;
              const isActive = activeTabId === tab.id || (pair && activeTabId === pair.inside.id);
              const hasFiles = pair ? (pair.front.pdfFile && pair.inside.pdfFile) : tab.pdfFile;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabSwitch(tab.id)}
                  className={`flex flex-col items-start gap-1 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>Tab {tab.tabNumber}{pair ? ' (Card)' : ''}</span>
                    {hasFiles && <CheckCircle className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                    {tab.sku}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      {validationError && (
        <div className="bg-red-50 border-b border-red-200 p-3 flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{validationError}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {cardPair ? (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">Front</span>
                  Order Number Placement
                </h3>
                {cardPair.front.pdfFile ? (
                  <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-blue-600" />
                        <div>
                          <p className="font-semibold text-gray-900">{cardPair.front.pdfFile.name}</p>
                          <p className="text-sm text-gray-600">
                            {(cardPair.front.pdfFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveFile(cardPair.front.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {cardPair.front.pdfFile && cardPair.front.pdfDataUrl && (
                      <div className="bg-white rounded border border-gray-300 p-4 mb-4 overflow-auto max-h-[500px]">
                        <FilePreview
                          file={cardPair.front.pdfFile}
                          objectUrl={cardPair.front.pdfDataUrl}
                          alt="Front design"
                          className="max-w-full"
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {cardPair.front.orderNumberPlaced ? (
                        <>
                          <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-medium text-sm">Order number placed ({order.order_number}-{cardPair.front.tabNumber})</span>
                          </div>
                          <button
                            onClick={() => onAdjustPosition(cardPair.front.id)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                          >
                            <MapPin className="w-5 h-5" />
                            Adjust Position
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Remove order number placement? You can place it again.')) {
                                onClearPosition(cardPair.front.id);
                              }
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                            Clear Position
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => onPlaceOrderNumber(cardPair.front.id)}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <MapPin className="w-5 h-5" />
                          Place Order Number
                        </button>
                      )}

                      <label className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">
                        <Upload className="w-5 h-5" />
                        Replace PDF
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg"
                          onChange={(e) => handleFileSelect(e, cardPair.front.id)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors bg-blue-50">
                      <Upload className="w-12 h-12 mx-auto mb-3 text-blue-400" />
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">
                        Upload Front PDF
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {cardPair.front.sku}
                      </p>
                      <p className="text-sm text-gray-500">
                        Click to browse or drag and drop
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg"
                      onChange={(e) => handleFileSelect(e, cardPair.front.id)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="bg-gray-600 text-white px-2 py-1 rounded text-sm">Inside</span>
                  No Order Number
                </h3>
                {cardPair.inside.pdfFile ? (
                  <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-gray-600" />
                        <div>
                          <p className="font-semibold text-gray-900">{cardPair.inside.pdfFile.name}</p>
                          <p className="text-sm text-gray-600">
                            {(cardPair.inside.pdfFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveFile(cardPair.inside.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {cardPair.inside.pdfFile && cardPair.inside.pdfDataUrl && (
                      <div className="bg-white rounded border border-gray-300 p-4 mb-4 overflow-auto max-h-[500px]">
                        <FilePreview
                          file={cardPair.inside.pdfFile}
                          objectUrl={cardPair.inside.pdfDataUrl}
                          alt="Inside design"
                          className="max-w-full"
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <div className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-lg text-center text-sm text-gray-600">
                        Order numbers are only placed on the front side
                      </div>

                      <label className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">
                        <Upload className="w-5 h-5" />
                        Replace PDF
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg"
                          onChange={(e) => handleFileSelect(e, cardPair.inside.id)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors bg-gray-50">
                      <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">
                        Upload Inside PDF
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {cardPair.inside.sku}
                      </p>
                      <p className="text-sm text-gray-500">
                        Click to browse or drag and drop
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg"
                      onChange={(e) => handleFileSelect(e, cardPair.inside.id)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          ) : activeTab.pdfFile ? (
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

              {activeTab.pdfFile && activeTab.pdfDataUrl && (
                <div ref={containerRef} className="bg-white rounded border border-gray-300 p-4 mb-4 overflow-auto max-h-[500px]">
                  <FilePreview
                    file={activeTab.pdfFile}
                    objectUrl={activeTab.pdfDataUrl}
                    alt="Design preview"
                    className="max-w-full"
                  />
                </div>
              )}

              <div className="flex items-center gap-4 flex-wrap">
                {activeTab.orderNumberPlaced ? (
                  <>
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Order number placed ({order.order_number}-{activeTab.tabNumber})</span>
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
                    accept=".pdf,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors bg-gray-50">
                <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload PDF for Tab {activeTab.tabNumber}
                </h3>
                <p className="text-gray-600 mb-2">
                  {activeTab.sku}
                </p>
                <p className="text-gray-600 mb-4">
                  Click to browse or drag and drop your PDF file here
                </p>
                <p className="text-sm text-gray-500">
                  PDF or JPG files
                </p>
              </div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                <Tag className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {cardPair ? `Tab ${activeTab.tabNumber} - Card Design` : `Tab ${activeTab.tabNumber} - ${activeTab.sku}`}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Folder className="w-4 h-4 text-gray-500" />
                <select
                  value={cardPair ? (cardPair.front.selectedFolder || '') : (activeTab.selectedFolder || '')}
                  onChange={(e) => handleFolderChange(e.target.value)}
                  className={`flex-1 px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    (cardPair ? !cardPair.front.selectedFolder : !activeTab.selectedFolder) ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">-- Select Folder --</option>
                  {availableFolders.map(folder => (
                    <option key={folder.id} value={folder.folder_name}>
                      {folder.folder_name}
                    </option>
                  ))}
                </select>
                {activeTab.autoSelectedFolder && (
                  <span className="text-xs text-gray-500 italic whitespace-nowrap">
                    (Auto: {activeTab.autoSelectedFolder})
                  </span>
                )}
              </div>

              <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={activeTab.isCard}
                  onChange={(e) => handleCardToggle(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Card Design</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
