export interface ElectronAPI {
  selectFolder: () => Promise<string | null>;
  selectFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;
  readFile: (filePath: string) => Promise<{
    success: boolean;
    data?: number[];
    path?: string;
    name?: string;
    error?: string;
  }>;
  writeFile: (filePath: string, arrayBuffer: ArrayBuffer) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;
  checkPathExists: (path: string) => Promise<boolean>;
  createDirectory: (dirPath: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  listDirectory: (dirPath: string) => Promise<{
    success: boolean;
    files?: string[];
    error?: string;
  }>;
  fileExists: (filePath: string) => Promise<{
    exists: boolean;
    isFile: boolean;
  }>;
  checkForUpdates: () => Promise<{
    success: boolean;
    updateInfo?: any;
    error?: string;
  }>;
  downloadUpdate: () => Promise<{
    success: boolean;
    error?: string;
  }>;
  installUpdate: () => void;
  getAppVersion: () => Promise<string>;
  onUpdateChecking: (callback: () => void) => void;
  onUpdateAvailable: (callback: (info: any) => void) => void;
  onUpdateNotAvailable: (callback: () => void) => void;
  onUpdateError: (callback: (message: string) => void) => void;
  onUpdateDownloadProgress: (callback: (progress: {
    bytesPerSecond: number;
    percent: number;
    transferred: number;
    total: number;
  }) => void) => void;
  onUpdateDownloaded: (callback: (info: any) => void) => void;
  removeUpdateListeners: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
