import { supabase } from './supabase';
import { loadPremadeFolderHandle } from './fileSystemAccess';
import { fileSystemAPI } from './fileSystemAccess';

export const premadeDesignService = {
  transformSKUToFilename(sku: string): string {
    const upperSKU = sku.toUpperCase();

    if (upperSKU.startsWith('SMCH-')) {
      const parts = upperSKU.split('-');
      if (parts.length >= 2) {
        const numberPart = parts[1];
        return `SMCH${numberPart}.jpg`;
      }
    }

    if (upperSKU.startsWith('LTCH-')) {
      const parts = upperSKU.split('-');
      if (parts.length >= 2) {
        const numberPart = parts[1];
        return `CH${numberPart}.jpg`;
      }
    }

    if (upperSKU.startsWith('CH-')) {
      const parts = upperSKU.split('-');
      if (parts.length >= 2) {
        const numberPart = parts[1];
        return `CH${numberPart}.jpg`;
      }
    }

    return '';
  },

  async getPremadeFolderPath(): Promise<string | null> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'premade_folder_path')
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.value || null;
  },

  async searchForReadyMadeDesign(sku: string): Promise<string | null> {
    try {
      const folderHandle = await loadPremadeFolderHandle();
      if (!folderHandle) {
        return null;
      }

      const hasPermission = await fileSystemAPI.verifyPermission(folderHandle);
      if (!hasPermission) {
        console.warn('No permission to access premade folder');
        return null;
      }

      const filename = this.transformSKUToFilename(sku);
      if (!filename) {
        return null;
      }

      try {
        await folderHandle.getFileHandle(filename);
        return filename;
      } catch (error) {
        if (error instanceof Error && error.name === 'NotFoundError') {
          return null;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error searching for ready-made design:', error);
      return null;
    }
  },

  async loadDesignForSKU(sku: string): Promise<{ file: File; dataUrl: string } | null> {
    try {
      const folderHandle = await loadPremadeFolderHandle();
      if (!folderHandle) {
        console.warn('Premade folder not selected');
        return null;
      }

      const filename = await this.searchForReadyMadeDesign(sku);
      if (!filename) {
        return null;
      }

      const result = await fileSystemAPI.readFile(folderHandle, filename);
      return result;
    } catch (error) {
      console.error('Error loading design for SKU:', sku, error);
      return null;
    }
  },

  isReadyMadeOrder(productTitle: string, customerNote: string): boolean {
    const title = productTitle.toLowerCase();
    const note = customerNote.toLowerCase().trim();

    const customizationKeywords = [
      'personalised',
      'personalized',
      'customised',
      'customized',
      'custom'
    ];

    if (customizationKeywords.some(keyword => title.includes(keyword))) {
      return false;
    }

    if (note.length > 0) {
      return false;
    }

    return true;
  }
};
