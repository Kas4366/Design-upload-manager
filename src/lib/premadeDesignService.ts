import { supabase } from './supabase';

export const premadeDesignService = {
  transformSKUToFilename(sku: string): string {
    const upperSKU = sku.toUpperCase();

    if (upperSKU.startsWith('SMCH-')) {
      const withoutSuffix = upperSKU.split('-').slice(0, 2).join('');
      return `${withoutSuffix}.jpg`;
    }

    if (upperSKU.startsWith('LTCH-')) {
      const parts = upperSKU.split('-');
      if (parts.length >= 2) {
        const chPart = parts[0].substring(2);
        const numberPart = parts[1].substring(0, 3);
        return `${chPart}${numberPart}.jpg`;
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
    return null;
  },

  async loadDesignForSKU(sku: string): Promise<{ file: File; dataUrl: string } | null> {
    return null;
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
