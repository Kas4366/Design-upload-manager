import { useState, useMemo } from 'react';
import { X, CheckCircle, AlertCircle, FileX, Hash, FolderX, Search } from 'lucide-react';
import { OrderValidationResult, OrderWithTabs } from '../lib/types';
import { validationService } from '../lib/validationService';

interface SaveValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderWithTabs[];
  onSaveSelected: (selectedOrderIds: string[]) => void;
}

export default function SaveValidationModal({
  isOpen,
  onClose,
  orders,
  onSaveSelected
}: SaveValidationModalProps) {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const validationResults = useMemo(() =>
    validationService.validateAllOrders(orders),
    [orders]
  );

  const summary = useMemo(() =>
    validationService.getValidationSummary(orders),
    [orders]
  );

  const filteredResults = useMemo(() => {
    if (!searchTerm) return validationResults;
    const term = searchTerm.toLowerCase();
    return validationResults.filter(r =>
      r.orderNumber.toLowerCase().includes(term) ||
      r.veeqoId.toLowerCase().includes(term)
    );
  }, [validationResults, searchTerm]);

  const handleToggleOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleSelectAll = () => {
    const allIds = new Set(filteredResults.map(r => r.orderId));
    setSelectedOrders(allIds);
  };

  const handleSelectComplete = () => {
    const completeIds = new Set(
      filteredResults.filter(r => r.isComplete).map(r => r.orderId)
    );
    setSelectedOrders(completeIds);
  };

  const handleDeselectAll = () => {
    setSelectedOrders(new Set());
  };

  const handleSave = () => {
    onSaveSelected(Array.from(selectedOrders));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Save Design Files</h2>
            <p className="text-sm text-gray-600 mt-1">
              Review and select orders to save
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Total Orders</div>
              <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <div className="text-sm text-green-700">Complete</div>
              <div className="text-2xl font-bold text-green-600">{summary.complete}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-red-200">
              <div className="text-sm text-red-700">Incomplete</div>
              <div className="text-2xl font-bold text-red-600">{summary.incomplete}</div>
            </div>
          </div>

          {summary.incomplete > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-white p-3 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <FileX className="w-4 h-4" />
                  Missing Files
                </div>
                <div className="text-xl font-bold text-orange-600">{summary.missingFiles}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <Hash className="w-4 h-4" />
                  Missing Order #
                </div>
                <div className="text-xl font-bold text-orange-600">{summary.missingOrderNumbers}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <FolderX className="w-4 h-4" />
                  Missing Folders
                </div>
                <div className="text-xl font-bold text-orange-600">{summary.missingFolders}</div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={handleSelectComplete}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Select Complete Only
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Deselect All
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number or Veeqo ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {filteredResults.map((result) => (
              <div
                key={result.orderId}
                className={`border rounded-lg p-4 transition-all ${
                  result.isComplete
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                } ${selectedOrders.has(result.orderId) ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedOrders.has(result.orderId)}
                    onChange={() => handleToggleOrder(result.orderId)}
                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {result.isComplete ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-semibold text-gray-900">
                          Order #{result.orderNumber}
                        </div>
                        <div className="text-sm text-gray-600">
                          Veeqo ID: {result.veeqoId}
                        </div>
                      </div>
                      <div className="ml-auto text-sm text-gray-600">
                        {result.completeTabs}/{result.totalTabs} tabs complete
                      </div>
                    </div>

                    {!result.isComplete && result.issues.length > 0 && (
                      <div className="ml-8 mt-2 space-y-1">
                        {result.issues.map((issue, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            {issue.type === 'missing_file' && (
                              <FileX className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                            )}
                            {issue.type === 'missing_order_number' && (
                              <Hash className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                            )}
                            {issue.type === 'missing_folder' && (
                              <FolderX className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                            )}
                            <span className="text-orange-700">
                              <span className="font-medium">{issue.tabLabel}:</span> {issue.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={selectedOrders.size === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Save Selected ({selectedOrders.size})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
