import { loadReferenceImagesFolderHandle } from './fileSystemAccess';

export interface ReferenceImage {
  file: File;
  dataUrl: string;
}

async function findFileInFolder(
  folderHandle: FileSystemDirectoryHandle,
  baseName: string,
  extensions: string[]
): Promise<FileSystemFileHandle | null> {
  for (const ext of extensions) {
    const fileName = `${baseName}.${ext}`;
    try {
      const fileHandle = await folderHandle.getFileHandle(fileName);
      return fileHandle;
    } catch (error) {
      continue;
    }
  }
  return null;
}

export async function loadReferenceImageForSKU(sku: string): Promise<ReferenceImage | null> {
  try {
    const folderHandle = await loadReferenceImagesFolderHandle();
    if (!folderHandle) {
      return null;
    }

    const extensions = ['jpg', 'jpeg', 'png', 'JPG', 'JPEG', 'PNG'];

    const fileHandle = await findFileInFolder(folderHandle, sku, extensions);
    if (!fileHandle) {
      return null;
    }

    const file = await fileHandle.getFile();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve({
            file,
            dataUrl: e.target.result as string
          });
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error('Error loading reference image:', error);
    return null;
  }
}
