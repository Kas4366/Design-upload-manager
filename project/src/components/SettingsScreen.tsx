import { useState, useEffect } from 'react';
import { Folder, Save, Settings as SettingsIcon, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

  useEffect(() => {
    loadSettings();
  }, []);

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
