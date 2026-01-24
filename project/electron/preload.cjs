const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFile: (filters) => ipcRenderer.invoke('select-file', filters),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, arrayBuffer) => ipcRenderer.invoke('write-file', filePath, arrayBuffer),
  checkPathExists: (path) => ipcRenderer.invoke('check-path-exists', path),
  createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),
  listDirectory: (dirPath) => ipcRenderer.invoke('list-directory', dirPath),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath)
});
