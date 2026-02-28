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

function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

export const fileSystemAPI: FileSystemAPI = {
  isSupported: isFileSystemAccessSupported(),
  requestFolderAccess,
  saveFile,
  verifyPermission
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
