export interface FileSystemAPI {
  isSupported: boolean;
  requestFolderAccess: () => Promise<FileSystemDirectoryHandle | null>;
  saveFile: (
    dirHandle: FileSystemDirectoryHandle,
    folderPath: string,
    filename: string,
    data: Uint8Array
  ) => Promise<boolean>;
  verifyPermission: (handle: FileSystemDirectoryHandle) => Promise<boolean>;
  readFile: (dirHandle: FileSystemDirectoryHandle, filename: string) => Promise<{ file: File; dataUrl: string } | null>;
  readFileFromPath: (dirHandle: FileSystemDirectoryHandle, filePath: string) => Promise<{ file: File; dataUrl: string } | null>;
}

async function verifyPermission(
  handle: FileSystemDirectoryHandle,
  readWrite: boolean = true
): Promise<boolean> {
  const options: FileSystemHandlePermissionDescriptor = {
    mode: readWrite ? 'readwrite' : 'read'
  };

  if ((await handle.queryPermission(options)) === 'granted') {
    return true;
  }

  if ((await handle.requestPermission(options)) === 'granted') {
    return true;
  }

  return false;
}

async function createDirectoryRecursive(
  parentHandle: FileSystemDirectoryHandle,
  folderPath: string
): Promise<FileSystemDirectoryHandle> {
  const parts = folderPath.split('/').filter(p => p.length > 0);

  let currentHandle = parentHandle;
  for (const part of parts) {
    currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
  }

  return currentHandle;
}

async function requestFolderAccess(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    });
    return handle;
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('Error requesting folder access:', error);
    }
    return null;
  }
}

async function saveFile(
  dirHandle: FileSystemDirectoryHandle,
  folderPath: string,
  filename: string,
  data: Uint8Array
): Promise<boolean> {
  try {
    const hasPermission = await verifyPermission(dirHandle);
    if (!hasPermission) {
      console.error('No permission to write to directory');
      return false;
    }

    const targetDirHandle = await createDirectoryRecursive(dirHandle, folderPath);

    const fileHandle = await targetDirHandle.getFileHandle(filename, { create: true });

    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();

    return true;
  } catch (error) {
    console.error('Error saving file:', error);
    return false;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readFile(
  dirHandle: FileSystemDirectoryHandle,
  filename: string
): Promise<{ file: File; dataUrl: string } | null> {
  try {
    const hasPermission = await verifyPermission(dirHandle, false);
    if (!hasPermission) {
      console.error('No permission to read from directory');
      return null;
    }

    const fileHandle = await dirHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const dataUrl = await fileToDataUrl(file);

    return { file, dataUrl };
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundError') {
      return null;
    }
    console.error('Error reading file:', error);
    return null;
  }
}

// Reads a file given a relative path like "Cards/12345.pdf" under dirHandle
async function readFileFromPath(
  dirHandle: FileSystemDirectoryHandle,
  filePath: string
): Promise<{ file: File; dataUrl: string } | null> {
  try {
    const hasPermission = await verifyPermission(dirHandle, false);
    if (!hasPermission) return null;

    const parts = filePath.split('/').filter(p => p.length > 0);
    const filename = parts.pop()!;

    let currentDir = dirHandle;
    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part);
    }

    const fileHandle = await currentDir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const dataUrl = await fileToDataUrl(file);

    return { file, dataUrl };
  } catch (error) {
    if (error instanceof Error && (error.name === 'NotFoundError' || error.name === 'TypeMismatchError')) {
      return null;
    }
    console.error('Error reading file from path:', error);
    return null;
  }
}

export async function listSubfolderHandles(
  dirHandle: FileSystemDirectoryHandle
): Promise<{ name: string; handle: FileSystemDirectoryHandle }[]> {
  const subfolders: { name: string; handle: FileSystemDirectoryHandle }[] = [];
  try {
    for await (const entry of (dirHandle as any).values()) {
      if (entry.kind === 'directory') {
        subfolders.push({ name: entry.name, handle: entry as FileSystemDirectoryHandle });
      }
    }
  } catch {
    // ignore errors from inaccessible entries
  }
  return subfolders;
}

export async function findFileByVeeqoId(
  rootHandle: FileSystemDirectoryHandle,
  veeqoId: string,
  tabNumber: number,
  tabLabel: string,
  isCard: boolean,
  totalNonInsideTabs: number
): Promise<{ file: File; dataUrl: string; fileType: 'pdf' | 'jpg' } | null> {
  const subfolders = await listSubfolderHandles(rootHandle);

  // Build candidate filenames in priority order
  const candidates: string[] = [];
  const extensions = ['pdf', 'jpg', 'jpeg'];

  for (const ext of extensions) {
    if (isCard && (tabLabel === 'Front' || tabLabel === 'Inside')) {
      candidates.push(`${veeqoId}-${tabLabel}.${ext}`);
    } else if (totalNonInsideTabs === 1) {
      candidates.push(`${veeqoId}.${ext}`);
    } else {
      candidates.push(`${veeqoId}-${tabNumber}.${ext}`);
    }
  }

  for (const subfolder of subfolders) {
    for (const filename of candidates) {
      try {
        const fileHandle = await subfolder.handle.getFileHandle(filename);
        const file = await fileHandle.getFile();
        const dataUrl = await fileToDataUrl(file);
        const ext = filename.split('.').pop()?.toLowerCase();
        const fileType: 'pdf' | 'jpg' = ext === 'pdf' ? 'pdf' : 'jpg';
        return { file, dataUrl, fileType };
      } catch {
        // file not found in this subfolder — try next
      }
    }
  }

  return null;
}

function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

export const fileSystemAPI: FileSystemAPI = {
  isSupported: isFileSystemAccessSupported(),
  requestFolderAccess,
  saveFile,
  verifyPermission,
  readFile,
  readFileFromPath
};

const DB_NAME = 'DesignUploadManager';
const DB_VERSION = 1;
const STORE_NAME = 'settings';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(handle, 'savedFolderHandle');

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error saving folder handle:', error);
  }
}

export async function loadFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('savedFolderHandle');

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const handle = request.result as FileSystemDirectoryHandle | undefined;
        resolve(handle || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error loading folder handle:', error);
    return null;
  }
}

export async function clearFolderHandle(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete('savedFolderHandle');

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error clearing folder handle:', error);
  }
}

export async function savePremadeFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(handle, 'premadeFolderHandle');

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error saving premade folder handle:', error);
  }
}

export async function loadPremadeFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('premadeFolderHandle');

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const handle = request.result as FileSystemDirectoryHandle | undefined;
        resolve(handle || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error loading premade folder handle:', error);
    return null;
  }
}

export async function clearPremadeFolderHandle(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete('premadeFolderHandle');

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error clearing premade folder handle:', error);
  }
}

export async function saveReferenceImagesFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(handle, 'referenceImagesFolderHandle');

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error saving reference images folder handle:', error);
  }
}

export async function loadReferenceImagesFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('referenceImagesFolderHandle');

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const handle = request.result as FileSystemDirectoryHandle | undefined;
        resolve(handle || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error loading reference images folder handle:', error);
    return null;
  }
}

export async function clearReferenceImagesFolderHandle(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete('referenceImagesFolderHandle');

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error clearing reference images folder handle:', error);
  }
}


