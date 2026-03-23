import { useEffect, useState } from 'react';
import { X, Plus, Trash2, CreditCard as Edit2, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { folderTypesService } from '../lib/folderTypesService';
import type { FolderType } from '../lib/types';

interface FolderTypesManagerProps {
  onClose: () => void;
  onUpdate?: () => void;
}

export function FolderTypesManager({ onClose, onUpdate }: FolderTypesManagerProps) {
  const [folderTypes, setFolderTypes] = useState<FolderType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newFileFormat, setNewFileFormat] = useState<'pdf' | 'jpg'>('pdf');
  const [editFolderName, setEditFolderName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFileFormat, setEditFileFormat] = useState<'pdf' | 'jpg'>('pdf');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFolderTypes();
  }, []);

  const loadFolderTypes = async () => {
    setLoading(true);
    const types = await folderTypesService.getAllFolderTypes();
    setFolderTypes(types);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newFolderName.trim()) {
      setError('Folder name is required');
      return;
    }

    const exists = await folderTypesService.folderTypeExists(newFolderName.trim());
    if (exists) {
      setError('A folder with this name already exists');
      return;
    }

    const created = await folderTypesService.createFolderType(
      newFolderName.trim(),
      newDescription.trim() || null,
      newFileFormat
    );

    if (created) {
      setNewFolderName('');
      setNewDescription('');
      setNewFileFormat('pdf');
      setIsAdding(false);
      setError(null);
      await loadFolderTypes();
      onUpdate?.();
    }
  };

  const handleEdit = async (id: string) => {
    if (!editFolderName.trim()) {
      setError('Folder name is required');
      return;
    }

    const folderType = folderTypes.find(ft => ft.id === id);
    if (folderType && editFolderName.trim() !== folderType.folder_name) {
      const exists = await folderTypesService.folderTypeExists(editFolderName.trim());
      if (exists) {
        setError('A folder with this name already exists');
        return;
      }
    }

    const success = await folderTypesService.updateFolderType(id, {
      folder_name: editFolderName.trim(),
      description: editDescription.trim() || null,
      output_file_format: editFileFormat,
    });

    if (success) {
      setEditingId(null);
      setError(null);
      await loadFolderTypes();
      onUpdate?.();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this folder type? This action cannot be undone.')) {
      const success = await folderTypesService.deleteFolderType(id);
      if (success) {
        await loadFolderTypes();
        onUpdate?.();
      }
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    const success = await folderTypesService.updateFolderType(id, {
      is_active: !currentState,
    });

    if (success) {
      await loadFolderTypes();
      onUpdate?.();
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newOrder = [...folderTypes];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];

    const success = await folderTypesService.reorderFolderTypes(
      newOrder.map(ft => ft.id)
    );

    if (success) {
      setFolderTypes(newOrder);
      onUpdate?.();
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === folderTypes.length - 1) return;

    const newOrder = [...folderTypes];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];

    const success = await folderTypesService.reorderFolderTypes(
      newOrder.map(ft => ft.id)
    );

    if (success) {
      setFolderTypes(newOrder);
      onUpdate?.();
    }
  };

  const startEdit = (folderType: FolderType) => {
    setEditingId(folderType.id);
    setEditFolderName(folderType.folder_name);
    setEditDescription(folderType.description || '');
    setEditFileFormat(folderType.output_file_format);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError(null);
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setNewFolderName('');
    setNewDescription('');
    setNewFileFormat('pdf');
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Manage Folder Types</h3>
            <p className="text-sm text-gray-600">Configure the folders for organizing your orders</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading folder types...</div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium text-gray-700">
                  Folder Types ({folderTypes.length})
                </h4>
                {!isAdding && (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Add Folder Type
                  </button>
                )}
              </div>

              {isAdding && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Folder Name *
                    </label>
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="e.g., CH, CD, BL"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Brief description of this folder type"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Output Format *
                    </label>
                    <select
                      value={newFileFormat}
                      onChange={(e) => setNewFileFormat(e.target.value as 'pdf' | 'jpg')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pdf">PDF</option>
                      <option value="jpg">JPG</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAdd}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Check size={18} />
                      Create
                    </button>
                    <button
                      onClick={cancelAdd}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {folderTypes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No folder types configured. Add one to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  {folderTypes.map((folderType, index) => (
                    <div
                      key={folderType.id}
                      className={`border rounded-lg p-4 ${
                        folderType.is_active ? 'border-gray-200 bg-white' : 'border-gray-300 bg-gray-100'
                      }`}
                    >
                      {editingId === folderType.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Folder Name *
                            </label>
                            <input
                              type="text"
                              value={editFolderName}
                              onChange={(e) => setEditFolderName(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description (optional)
                            </label>
                            <input
                              type="text"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Output Format *
                            </label>
                            <select
                              value={editFileFormat}
                              onChange={(e) => setEditFileFormat(e.target.value as 'pdf' | 'jpg')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="pdf">PDF</option>
                              <option value="jpg">JPG</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(folderType.id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                            >
                              <Check size={18} />
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h5 className="text-lg font-medium text-gray-800">
                                {folderType.folder_name}
                              </h5>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  folderType.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-300 text-gray-700'
                                }`}
                              >
                                {folderType.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            {folderType.description && (
                              <p className="text-sm text-gray-600 mt-1">{folderType.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs font-medium text-gray-500">Format:</span>
                              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 uppercase">
                                {folderType.output_file_format}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              className={`p-1 rounded ${
                                index === 0
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              <ChevronUp size={20} />
                            </button>
                            <button
                              onClick={() => handleMoveDown(index)}
                              disabled={index === folderTypes.length - 1}
                              className={`p-1 rounded ${
                                index === folderTypes.length - 1
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              <ChevronDown size={20} />
                            </button>
                            <button
                              onClick={() => handleToggleActive(folderType.id, folderType.is_active)}
                              className={`px-3 py-1 rounded text-sm transition-colors ${
                                folderType.is_active
                                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                  : 'bg-green-100 hover:bg-green-200 text-green-800'
                              }`}
                            >
                              {folderType.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => startEdit(folderType)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(folderType.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
