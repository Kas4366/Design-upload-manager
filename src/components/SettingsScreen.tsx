import { useState, useEffect, useRef } from 'react';
import { Folder, Save, Settings as SettingsIcon, Check, AlertCircle, Upload, X, FileSpreadsheet, RefreshCw, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseCSVHeaders } from '../lib/csvParser';
import { loadColumnMappings, saveColumnMappings, clearColumnMappings, getDefaultColumnNames } from '../lib/columnMappings';
import { CSVColumnMapping } from '../lib/types';

interface SettingsScreenProps {
  onClose: () => void;
}

export function SettingsScreen({ onClose }: SettingsScreenProps) {
  const [dateFolderPath, setDateFolderPath] = useState('');
  const [premadeFolderPath, setPremadeFolderPath] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [columnMapping, setColumnMapping] = useState<CSVColumnMapping | null>(null);
  const [mappingValues, setMappingValues] = useState(getDefaultColumnNames());
  const [mappingSaveSuccess, setMappingSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [appVersion, setAppVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error'>('idle');
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    loadSettings();
    loadMappings();
    loadAppVersion();
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onUpdateChecking(() => {
      setUpdateStatus('checking');
      setUpdateError(null);
    });

    window.electronAPI.onUpdateAvailable((info) => {
      setUpdateStatus('available');
      setUpdateInfo(info);
    });

    window.electronAPI.onUpdateNotAvailable(() => {
      setUpdateStatus('not-available');
      setTimeout(() => setUpdateStatus('idle'), 3000);
    });

    window.electronAPI.onUpdateError((message) => {
      setUpdateStatus('error');
      setUpdateError(message);
    });

    window.electronAPI.onUpdateDownloadProgress((progress) => {
      setUpdateStatus('downloading');
      setDownloadProgress(Math.round(progress.percent));
    });

    window.electronAPI.onUpdateDownloaded(() => {
      setUpdateStatus('ready');
      setDownloadProgress(100);
    });

    return () => {
      window.electronAPI?.removeUpdateListeners();
    };
  }, []);

  const loadAppVersion = async () => {
    if (!window.electronAPI) return;
    const version = await window.electronAPI.getAppVersion();
    setAppVersion(version);
  };

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', ['date_folder_path', 'premade_folder_path']);

      if (error) throw error;

      if (data) {
        const dateFolder = data.find(s => s.key === 'date_folder_path');
        const premadeFolder = data.find(s => s.key === 'premade_folder_path');

        setDateFolderPath(dateFolder?.value || '');
        setPremadeFolderPath(premadeFolder?.value || '');
      }
    } catch (err) {
      setError(`Failed to load settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMappings = async () => {
    const mapping = await loadColumnMappings();
    setColumnMapping(mapping);
    if (mapping) {
      setMappingValues({
        veeqo_id_column: mapping.veeqo_id_column || 'id',
        order_number_column: mapping.order_number_column || 'order_number',
        sku_column: mapping.sku_column || 'sku',
        title_column: mapping.title_column || 'title',
        quantity_column: mapping.quantity_column || 'quantity',
        number_of_lines_column: mapping.number_of_lines_column || 'number_of_lines',
        customer_note_column: mapping.customer_note_column || 'customer_note',
        additional_options_column: mapping.additional_options_column || 'additional_options',
      });
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const headers = await parseCSVHeaders(file);
      setCsvHeaders(headers);
      setCsvFile(file);
    } catch (err) {
      setError(`Failed to parse CSV headers: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleMappingChange = (field: keyof typeof mappingValues, value: string) => {
    setMappingValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveMapping = async () => {
    try {
      const result = await saveColumnMappings(mappingValues);
      if (result.success) {
        setMappingSaveSuccess(true);
        await loadMappings();
        setTimeout(() => setMappingSaveSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to save column mapping');
      }
    } catch (err) {
      setError(`Failed to save column mapping: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleClearMapping = async () => {
    try {
      const result = await clearColumnMappings();
      if (result.success) {
        setColumnMapping(null);
        setCsvHeaders([]);
        setCsvFile(null);
        setMappingValues(getDefaultColumnNames());
        setMappingSaveSuccess(true);
        setTimeout(() => setMappingSaveSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to clear column mapping');
      }
    } catch (err) {
      setError(`Failed to clear column mapping: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const selectDateFolder = async () => {
    if (!window.electronAPI) {
      alert('Folder selection is only available in the desktop app');
      return;
    }

    const path = await window.electronAPI.selectFolder();
    if (path) {
      setDateFolderPath(path);
    }
  };

  const selectPremadeFolder = async () => {
    if (!window.electronAPI) {
      alert('Folder selection is only available in the desktop app');
      return;
    }

    const path = await window.electronAPI.selectFolder();
    if (path) {
      setPremadeFolderPath(path);
    }
  };

  const validatePaths = async () => {
    if (!window.electronAPI) return true;

    if (dateFolderPath) {
      const exists = await window.electronAPI.checkPathExists(dateFolderPath);
      if (!exists) {
        setError('Date folder path does not exist');
        return false;
      }
    }

    if (premadeFolderPath) {
      const exists = await window.electronAPI.checkPathExists(premadeFolderPath);
      if (!exists) {
        setError('Pre-made folder path does not exist');
        return false;
      }
    }

    return true;
  };

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI) return;
    setUpdateError(null);
    await window.electronAPI.checkForUpdates();
  };

  const handleDownloadUpdate = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.downloadUpdate();
    if (!result.success && result.error) {
      setUpdateError(result.error);
      setUpdateStatus('error');
    }
  };

  const handleInstallUpdate = () => {
    if (!window.electronAPI) return;
    window.electronAPI.installUpdate();
  };

  const handleSave = async () => {
    setError(null);

    const isValid = await validatePaths();
    if (!isValid) return;

    try {
      setIsSaving(true);

      await supabase
        .from('app_settings')
        .update({ value: dateFolderPath, updated_at: new Date().toISOString() })
        .eq('key', 'date_folder_path');

      await supabase
        .from('app_settings')
        .update({ value: premadeFolderPath, updated_at: new Date().toISOString() })
        .eq('key', 'premade_folder_path');

      if (window.electronAPI && dateFolderPath) {
        await window.electronAPI.createDirectory(`${dateFolderPath}/CH`);
        await window.electronAPI.createDirectory(`${dateFolderPath}/CD`);
        await window.electronAPI.createDirectory(`${dateFolderPath}/BL`);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(`Failed to save settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-gray-700" />
            <h2 className="text-2xl font-bold text-gray-900">Application Settings</h2>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Configure folder paths for saving design files
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Date Folder Path
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Main folder where design files will be saved (CH, CD, BL subfolders will be created automatically)
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={dateFolderPath}
                onChange={(e) => setDateFolderPath(e.target.value)}
                placeholder="C:\Designs\2026-01-22"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={selectDateFolder}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Folder className="w-5 h-5" />
                Browse
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Pre-Made Designs Folder Path
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Folder containing ready-made design files for automatic upload
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={premadeFolderPath}
                onChange={(e) => setPremadeFolderPath(e.target.value)}
                placeholder="C:\Designs\PreMade"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={selectPremadeFolder}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Folder className="w-5 h-5" />
                Browse
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900">
                  CSV Column Mapping
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Configure how your CSV columns map to required fields
                </p>
              </div>
              {columnMapping && (
                <button
                  onClick={handleClearMapping}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear Mapping
                </button>
              )}
            </div>

            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors w-full justify-center"
              >
                <Upload className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700">
                  {csvFile ? `${csvFile.name} uploaded` : 'Upload Sample CSV to Detect Columns'}
                </span>
              </button>
            </div>

            {csvHeaders.length > 0 && (
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Map your CSV columns to the required fields:
                  </span>
                </div>

                {[
                  { label: 'Veeqo ID', field: 'veeqo_id_column' as const },
                  { label: 'Order Number', field: 'order_number_column' as const },
                  { label: 'SKU', field: 'sku_column' as const },
                  { label: 'Title', field: 'title_column' as const },
                  { label: 'Quantity', field: 'quantity_column' as const },
                  { label: 'Number of Lines', field: 'number_of_lines_column' as const },
                  { label: 'Customer Note', field: 'customer_note_column' as const },
                  { label: 'Additional Options', field: 'additional_options_column' as const },
                ].map(({ label, field }) => (
                  <div key={field} className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 w-40 flex-shrink-0">
                      {label}:
                    </label>
                    <select
                      value={mappingValues[field]}
                      onChange={(e) => handleMappingChange(field, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {csvHeaders.map(header => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                <div className="flex gap-3 pt-3">
                  <button
                    onClick={handleSaveMapping}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save Column Mapping
                  </button>
                </div>
              </div>
            )}

            {columnMapping && csvHeaders.length === 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800 font-medium">
                    Column mapping is configured and active
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900">
                  About
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Version {appVersion || '1.0.0'}
                </p>
              </div>
            </div>

            {window.electronAPI && (
              <div className="space-y-3">
                <button
                  onClick={handleCheckForUpdates}
                  disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-5 h-5 ${updateStatus === 'checking' ? 'animate-spin' : ''}`} />
                  {updateStatus === 'checking' ? 'Checking for updates...' : 'Check for Updates'}
                </button>

                {updateStatus === 'not-available' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-blue-800 font-medium">
                        You're up to date!
                      </span>
                    </div>
                  </div>
                )}

                {updateStatus === 'available' && updateInfo && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                    <div className="flex items-start gap-2">
                      <Download className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-sm text-green-800 font-medium block">
                          Update available: Version {updateInfo.version}
                        </span>
                        <span className="text-sm text-green-700 mt-1 block">
                          A new version is ready to download.
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadUpdate}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Download and Install
                    </button>
                  </div>
                )}

                {updateStatus === 'downloading' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-sm text-blue-800">
                      <span className="font-medium">Downloading update...</span>
                      <span className="font-semibold">{downloadProgress}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${downloadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {updateStatus === 'ready' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-800 font-medium">
                        Update downloaded and ready to install
                      </span>
                    </div>
                    <button
                      onClick={handleInstallUpdate}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Restart and Install
                    </button>
                  </div>
                )}

                {updateStatus === 'error' && updateError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-sm text-red-800 font-medium block">
                          Update check failed
                        </span>
                        <span className="text-sm text-red-700 mt-1 block">
                          {updateError}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900">Error</h4>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-medium">Settings saved successfully!</p>
            </div>
          )}

          {mappingSaveSuccess && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-medium">Column mapping saved successfully!</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
