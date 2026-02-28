import { useState, useEffect, useRef } from 'react';
import { Folder, Save, Settings as SettingsIcon, Check, AlertCircle, Upload, X, FileSpreadsheet, RefreshCw, FolderTree, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseCSVHeaders } from '../lib/csvParser';
import { loadColumnMappings, saveColumnMappings, clearColumnMappings, getDefaultColumnNames } from '../lib/columnMappings';
import { CSVColumnMapping } from '../lib/types';
import { FolderTypesManager } from './FolderTypesManager';
import { folderTypesService } from '../lib/folderTypesService';
import { fileSaverService } from '../lib/fileSaver';
import { fileSystemAPI } from '../lib/fileSystemAccess';
import { getAllActiveSessions, deleteSession } from '../lib/sessionService';
import { deleteSessionFiles } from '../lib/cloudStorage';

interface SettingsScreenProps {
  onClose: () => void;
}

export function SettingsScreenWeb({ onClose }: SettingsScreenProps) {
  const [premadeFolderPath, setPremadeFolderPath] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedFolder, setHasSavedFolder] = useState(false);

  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [columnMapping, setColumnMapping] = useState<CSVColumnMapping | null>(null);
  const [mappingValues, setMappingValues] = useState(getDefaultColumnNames());
  const [mappingSaveSuccess, setMappingSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showFolderTypesManager, setShowFolderTypesManager] = useState(false);
  const [folderTypesCount, setFolderTypesCount] = useState(0);

  const [activeTab, setActiveTab] = useState<'general' | 'csv-mapping' | 'folders' | 'cleanup'>('general');

  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadMappings();
    loadFolderTypesCount();
    checkSavedFolder();
  }, []);

  const checkSavedFolder = async () => {
    const handle = await fileSaverService.getSavedFolderHandle();
    setHasSavedFolder(!!handle);
  };

  const loadFolderTypesCount = async () => {
    const folderTypes = await folderTypesService.getActiveFolderTypes();
    setFolderTypesCount(folderTypes.length);
  };

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', ['premade_folder_path']);

      if (error) throw error;

      if (data) {
        const premadeEntry = data.find(d => d.key === 'premade_folder_path');
        if (premadeEntry) setPremadeFolderPath(premadeEntry.value || '');
      }
    } catch (err) {
      setError(`Failed to load settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMappings = async () => {
    const mapping = await loadColumnMappings();
    if (mapping) {
      setColumnMapping(mapping);
      setMappingValues(mapping);
    }
  };

  const handleSelectSaveLocation = async () => {
    if (!fileSystemAPI.isSupported) {
      alert('Your browser does not support the File System Access API. Files will be downloaded as ZIP instead.');
      return;
    }

    const handle = await fileSaverService.requestAndSaveFolderHandle();
    if (handle) {
      setHasSavedFolder(true);
      alert('Save location selected successfully!');
    }
  };

  const handleSave = async () => {
    setError(null);

    try {
      setIsSaving(true);

      await supabase
        .from('app_settings')
        .update({ value: premadeFolderPath, updated_at: new Date().toISOString() })
        .eq('key', 'premade_folder_path');

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (err) {
      setError(`Failed to save settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
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
      alert(`Failed to read CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSaveMappings = async () => {
    if (!csvFile) return;

    try {
      await saveColumnMappings(mappingValues);
      setColumnMapping(mappingValues);
      setMappingSaveSuccess(true);
      setTimeout(() => setMappingSaveSuccess(false), 2000);
    } catch (err) {
      alert(`Failed to save mappings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleClearMappings = async () => {
    if (!confirm('Clear all custom column mappings and use defaults?')) return;

    try {
      await clearColumnMappings();
      setColumnMapping(null);
      setMappingValues(getDefaultColumnNames());
      setCsvHeaders([]);
      setCsvFile(null);
    } catch (err) {
      alert(`Failed to clear mappings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const activeSessions = await getAllActiveSessions();
      setSessions(activeSessions);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, csvFilename: string) => {
    const confirmed = confirm(`Delete session "${csvFilename}"? This will remove all uploaded files and order data.`);
    if (!confirmed) return;

    setDeletingSessionId(sessionId);
    try {
      await deleteSessionFiles(sessionId);
      await deleteSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (err) {
      alert('Failed to delete session');
      console.error(err);
    } finally {
      setDeletingSessionId(null);
    }
  };

  if (showFolderTypesManager) {
    return (
      <FolderTypesManager
        onClose={() => {
          setShowFolderTypesManager(false);
          loadFolderTypesCount();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-gray-700" />
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'general'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('csv-mapping')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'csv-mapping'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            CSV Mapping
          </button>
          <button
            onClick={() => setActiveTab('folders')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'folders'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Folder Types ({folderTypesCount})
          </button>
          <button
            onClick={() => {
              setActiveTab('cleanup');
              if (sessions.length === 0) loadSessions();
            }}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'cleanup'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Cleanup
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Web Application Mode</p>
                    <p>Files are saved using your browser's File System Access API. You only need to select your save location once.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Save Location
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={handleSelectSaveLocation}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Folder className="w-4 h-4" />
                    {hasSavedFolder ? 'Change Save Location' : 'Select Save Location'}
                  </button>
                  {hasSavedFolder && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                      <Check className="w-4 h-4" />
                      <span>Location Saved</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {fileSystemAPI.isSupported
                    ? 'Select a folder where design files will be saved with proper folder structure (BL, CD, etc.)'
                    : 'Your browser does not support direct file saving. Files will be downloaded as ZIP archives instead.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pre-made Folder Path (Cloud Storage)
                </label>
                <input
                  type="text"
                  value={premadeFolderPath}
                  onChange={(e) => setPremadeFolderPath(e.target.value)}
                  placeholder="Path in Supabase Storage for pre-made designs"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Path in cloud storage where pre-made designs are stored
                </p>
              </div>
            </div>
          )}

          {activeTab === 'csv-mapping' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">CSV Column Mapping</h3>
                <p className="text-gray-600 mb-4">
                  If your CSV uses different column names, upload a sample CSV to map them to the expected format.
                </p>

                {columnMapping && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-green-800 font-medium">Custom mapping active</span>
                      <button
                        onClick={handleClearMappings}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Clear Mapping
                      </button>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Sample CSV
                </button>

                {csvHeaders.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h4 className="font-medium text-gray-900">Map Your CSV Columns</h4>
                    {Object.entries(mappingValues).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        <select
                          value={value}
                          onChange={(e) => setMappingValues({ ...mappingValues, [key]: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select column...</option>
                          {csvHeaders.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                    <button
                      onClick={handleSaveMappings}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save Mapping
                    </button>
                    {mappingSaveSuccess && (
                      <div className="flex items-center gap-2 text-green-600">
                        <Check className="w-4 h-4" />
                        <span>Mapping saved successfully!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'folders' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Folder Types</h3>
                <p className="text-gray-600 mb-4">
                  Configure folder types (BL, CD, etc.) for organizing saved design files.
                </p>
                <button
                  onClick={() => setShowFolderTypesManager(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FolderTree className="w-4 h-4" />
                  Manage Folder Types
                </button>
              </div>
            </div>
          )}

          {activeTab === 'cleanup' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Cleanup</h3>
                <p className="text-gray-600 mb-4">
                  Manage and delete old sessions. Sessions older than 30 days are automatically archived.
                </p>

                <button
                  onClick={loadSessions}
                  disabled={isLoadingSessions}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 mb-4"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingSessions ? 'animate-spin' : ''}`} />
                  {isLoadingSessions ? 'Loading...' : 'Load Sessions'}
                </button>

                {sessions.length > 0 && (
                  <div className="space-y-3">
                    {sessions.map(session => (
                      <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{session.csvFilename}</p>
                          <p className="text-sm text-gray-600">
                            {session.completedOrders} of {session.totalOrders} orders completed
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteSession(session.id, session.csvFilename)}
                          disabled={deletingSessionId === session.id}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900">Error</h4>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Close
          </button>
          {activeTab === 'general' && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Settings'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
