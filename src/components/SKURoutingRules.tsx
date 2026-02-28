import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Edit2, X, Check, AlertCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SKURoutingRule, FolderType } from '../lib/types';
import { folderTypesService } from '../lib/folderTypesService';

interface SKURoutingRulesProps {
  onClose: () => void;
}

export function SKURoutingRules({ onClose }: SKURoutingRulesProps) {
  const [rules, setRules] = useState<SKURoutingRule[]>([]);
  const [folderTypes, setFolderTypes] = useState<FolderType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testSKU, setTestSKU] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    pattern: '',
    folder_name: '',
    priority: 0,
    active: true
  });

  useEffect(() => {
    loadRules();
    loadFolderTypes();
  }, []);

  const loadRules = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('sku_routing_rules')
        .select('*')
        .order('priority', { ascending: true });

      if (error) throw error;

      setRules(data || []);
    } catch (err) {
      setError(`Failed to load rules: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFolderTypes = async () => {
    const types = await folderTypesService.getAllFolderTypes();
    setFolderTypes(types);
  };

  const getFolderValidationStatus = (folderName: string): 'valid' | 'inactive' | 'missing' => {
    const folderType = folderTypes.find(ft => ft.folder_name === folderName);
    if (!folderType) return 'missing';
    if (!folderType.is_active) return 'inactive';
    return 'valid';
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({
      pattern: '',
      folder_name: '',
      priority: rules.length > 0 ? Math.max(...rules.map(r => r.priority)) + 1 : 1,
      active: true
    });
  };

  const handleEdit = (rule: SKURoutingRule) => {
    setEditingId(rule.id);
    setIsAdding(false);
    setFormData({
      pattern: rule.pattern,
      folder_name: rule.folder_name,
      priority: rule.priority,
      active: rule.active
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({
      pattern: '',
      folder_name: '',
      priority: 0,
      active: true
    });
  };

  const handleSave = async () => {
    if (!formData.pattern || !formData.folder_name) {
      setError('Pattern and folder name are required');
      return;
    }

    try {
      if (isAdding) {
        const { error } = await supabase
          .from('sku_routing_rules')
          .insert([formData]);

        if (error) throw error;
      } else if (editingId) {
        const { error } = await supabase
          .from('sku_routing_rules')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingId);

        if (error) throw error;
      }

      await loadRules();
      handleCancel();
      setError(null);
    } catch (err) {
      setError(`Failed to save rule: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const { error } = await supabase
        .from('sku_routing_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadRules();
    } catch (err) {
      setError(`Failed to delete rule: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleToggleActive = async (rule: SKURoutingRule) => {
    try {
      const { error } = await supabase
        .from('sku_routing_rules')
        .update({ active: !rule.active, updated_at: new Date().toISOString() })
        .eq('id', rule.id);

      if (error) throw error;

      await loadRules();
    } catch (err) {
      setError(`Failed to update rule: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const testSKURouting = () => {
    if (!testSKU) {
      setTestResult(null);
      return;
    }

    const activeRules = rules
      .filter(r => r.active)
      .sort((a, b) => a.priority - b.priority);

    const matchedRule = activeRules.find(rule =>
      testSKU.toUpperCase().includes(rule.pattern.toUpperCase())
    );

    setTestResult(matchedRule ? matchedRule.folder_name : 'No matching rule found');
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">SKU Routing Rules</h2>
          <p className="text-sm text-gray-600 mt-2">
            Define patterns to automatically route designs to correct folders
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900">Error</h4>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {rules.length > 0 && folderTypes.length > 0 && (
            (() => {
              const validationIssues = rules.map(r => ({
                rule: r,
                status: getFolderValidationStatus(r.folder_name)
              })).filter(v => v.status !== 'valid');

              if (validationIssues.length === 0) return null;

              return (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-yellow-900 mb-2">Validation Issues ({validationIssues.length})</h4>
                      <ul className="text-sm text-yellow-800 space-y-1">
                        {validationIssues.map(({ rule, status }) => (
                          <li key={rule.id}>
                            Rule "{rule.pattern}" → "{rule.folder_name}": Folder is {status}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-3">Test SKU Routing</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={testSKU}
                onChange={(e) => setTestSKU(e.target.value)}
                placeholder="Enter SKU to test (e.g., CH-001, CD-123)"
                className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={testSKURouting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Test
              </button>
            </div>
            {testResult && (
              <div className="mt-3 p-3 bg-white border border-blue-200 rounded">
                <span className="text-sm text-gray-700">Target folder: </span>
                <span className="font-semibold text-blue-900">{testResult}</span>
              </div>
            )}
          </div>

          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Rules (ordered by priority)</h3>
            <button
              onClick={handleAdd}
              disabled={isAdding || editingId !== null}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              Add Rule
            </button>
          </div>

          <div className="space-y-3">
            {isAdding && (
              <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <input
                    type="text"
                    value={formData.pattern}
                    onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                    placeholder="Pattern (e.g., CH)"
                    className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <select
                    value={formData.folder_name}
                    onChange={(e) => setFormData({ ...formData, folder_name: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="">Select folder...</option>
                    {folderTypes
                      .filter(ft => ft.is_active)
                      .map(ft => (
                        <option key={ft.id} value={ft.folder_name}>
                          {ft.folder_name}
                          {ft.description ? ` - ${ft.description}` : ''}
                        </option>
                      ))}
                  </select>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                    placeholder="Priority"
                    className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
                {folderTypes.length === 0 && (
                  <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    No folder types configured. Please add folder types in Settings first.
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {rules.map(rule => (
              <div
                key={rule.id}
                className={`border rounded-lg p-4 ${
                  editingId === rule.id
                    ? 'border-blue-500 bg-blue-50'
                    : rule.active
                    ? 'border-gray-200 bg-white'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                {editingId === rule.id ? (
                  <>
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <input
                        type="text"
                        value={formData.pattern}
                        onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={formData.folder_name}
                        onChange={(e) => setFormData({ ...formData, folder_name: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Select folder...</option>
                        {folderTypes
                          .filter(ft => ft.is_active)
                          .map(ft => (
                            <option key={ft.id} value={ft.folder_name}>
                              {ft.folder_name}
                              {ft.description ? ` - ${ft.description}` : ''}
                            </option>
                          ))}
                      </select>
                      <input
                        type="number"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                        className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.active}
                          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Active</span>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div>
                        <span className="text-sm text-gray-600">Pattern:</span>
                        <span className="ml-2 font-semibold text-gray-900">{rule.pattern}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Folder:</span>
                        <span className="ml-2 font-semibold text-gray-900">{rule.folder_name}</span>
                        {getFolderValidationStatus(rule.folder_name) === 'missing' && (
                          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Missing
                          </span>
                        )}
                        {getFolderValidationStatus(rule.folder_name) === 'inactive' && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Priority:</span>
                        <span className="ml-2 font-semibold text-gray-900">{rule.priority}</span>
                      </div>
                      <button
                        onClick={() => handleToggleActive(rule)}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          rule.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {rule.active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(rule)}
                        disabled={isAdding || editingId !== null}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        disabled={isAdding || editingId !== null}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
