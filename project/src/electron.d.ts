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
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
