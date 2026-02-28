import JSZip from 'jszip';

export interface FileToZip {
  folderPath: string;
  filename: string;
  data: Uint8Array;
}

export async function createZipExport(
  files: FileToZip[],
  zipFilename: string = 'design-files.zip'
): Promise<boolean> {
  try {
    const zip = new JSZip();

    for (const file of files) {
      const fullPath = file.folderPath ? `${file.folderPath}/${file.filename}` : file.filename;
      zip.file(fullPath, file.data);
    }

    const blob = await zip.generateAsync({ type: 'blob' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error creating ZIP:', error);
    return false;
  }
}

export async function downloadSingleFile(
  filename: string,
  data: Uint8Array
): Promise<boolean> {
  try {
    const blob = new Blob([data]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error downloading file:', error);
    return false;
  }
}
