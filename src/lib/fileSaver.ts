import { supabase } from './supabase';
import { SKURoutingRule, OrderWithTabs } from './types';
import { embedOrderNumberInPDF } from './pdfProcessor';

export class FileSaverService {
  async getDateFolderPath(): Promise<string> {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'date_folder_path')
      .maybeSingle();

    return data?.value || '';
  }

  async getPremadeFolderPath(): Promise<string> {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'premade_folder_path')
      .maybeSingle();

    return data?.value || '';
  }

  async getRoutingRules(): Promise<SKURoutingRule[]> {
    const { data } = await supabase
      .from('sku_routing_rules')
      .select('*')
      .eq('active', true)
      .order('priority', { ascending: true });

    return data || [];
  }

  determineTargetFolder(sku: string, rules: SKURoutingRule[]): string {
    const skuUpper = sku.toUpperCase();

    for (const rule of rules) {
      if (skuUpper.includes(rule.pattern.toUpperCase())) {
        return rule.folder_name;
      }
    }

    return '';
  }

  generateFilename(veeqoId: string, tabLabel: string, sku: string): string {
    const skuUpper = sku.toUpperCase();

    if (skuUpper.includes('CD')) {
      return `${veeqoId}-${tabLabel}.pdf`;
    }

    if (tabLabel !== '1') {
      return `${veeqoId}-${tabLabel}.pdf`;
    }

    return `${veeqoId}.pdf`;
  }

  async saveOrderFiles(order: OrderWithTabs): Promise<{
    success: boolean;
    error?: string;
    savedPaths?: string[];
  }> {
    if (!window.electronAPI) {
      return {
        success: false,
        error: 'File saving is only available in the desktop app'
      };
    }

    try {
      const dateFolderPath = await this.getDateFolderPath();
      if (!dateFolderPath) {
        return {
          success: false,
          error: 'Date folder path not configured. Please configure it in Settings.'
        };
      }

      const rules = await this.getRoutingRules();
      const targetFolder = this.determineTargetFolder(order.sku, rules);

      if (!targetFolder) {
        return {
          success: false,
          error: `No routing rule found for SKU: ${order.sku}`
        };
      }

      const targetPath = `${dateFolderPath}\\${targetFolder}`;

      const pathExists = await window.electronAPI.checkPathExists(targetPath);
      if (!pathExists) {
        const createResult = await window.electronAPI.createDirectory(targetPath);
        if (!createResult.success) {
          return {
            success: false,
            error: `Failed to create directory: ${targetPath}`
          };
        }
      }

      const savedPaths: string[] = [];

      for (const tab of order.tabs) {
        if (!tab.pdfFile || !tab.position) {
          return {
            success: false,
            error: `Tab ${tab.label} is missing PDF file or order number placement`
          };
        }

        const pdfWithOrderNumber = await embedOrderNumberInPDF(
          tab.pdfFile,
          order.order_number,
          tab.position
        );

        const filename = this.generateFilename(order.veeqo_id, tab.label, order.sku);
        const fullPath = `${targetPath}\\${filename}`;

        const fileCheck = await window.electronAPI.fileExists(fullPath);
        if (fileCheck.exists) {
          const overwrite = confirm(
            `File ${filename} already exists in ${targetFolder}. Overwrite?`
          );
          if (!overwrite) {
            return {
              success: false,
              error: 'File save cancelled by user'
            };
          }
        }

        const writeResult = await window.electronAPI.writeFile(
          fullPath,
          pdfWithOrderNumber.buffer
        );

        if (!writeResult.success) {
          return {
            success: false,
            error: `Failed to save file: ${writeResult.error}`
          };
        }

        savedPaths.push(fullPath);
      }

      await supabase
        .from('order_items')
        .update({
          status: 'saved',
          saved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      return {
        success: true,
        savedPaths
      };
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async autoUploadPremadeDesigns(orders: OrderWithTabs[]): Promise<{
    success: boolean;
    uploadedCount: number;
    errors: string[];
  }> {
    if (!window.electronAPI) {
      return {
        success: false,
        uploadedCount: 0,
        errors: ['Auto-upload is only available in the desktop app']
      };
    }

    const premadeFolderPath = await this.getPremadeFolderPath();
    if (!premadeFolderPath) {
      return {
        success: false,
        uploadedCount: 0,
        errors: ['Pre-made folder path not configured']
      };
    }

    const errors: string[] = [];
    let uploadedCount = 0;

    const chOrders = orders.filter(order => {
      const isCH = order.sku.toUpperCase().includes('CH');
      const isNotCustomized = !order.product_title.toLowerCase().match(/personalised|customised|personalized|customized/);
      const hasNoFiles = order.tabs.every(tab => !tab.pdfFile);
      return isCH && isNotCustomized && hasNoFiles;
    });

    const dirResult = await window.electronAPI.listDirectory(premadeFolderPath);
    if (!dirResult.success || !dirResult.files) {
      return {
        success: false,
        uploadedCount: 0,
        errors: ['Failed to read pre-made folder']
      };
    }

    const availableFiles = dirResult.files.filter(f => f.toLowerCase().endsWith('.pdf'));

    for (const order of chOrders) {
      const matchingFile = availableFiles.find(filename => {
        const fileNameUpper = filename.toUpperCase();
        const skuUpper = order.sku.toUpperCase();
        return fileNameUpper.includes(skuUpper) || fileNameUpper.startsWith(skuUpper);
      });

      if (matchingFile) {
        try {
          const filePath = `${premadeFolderPath}\\${matchingFile}`;
          const fileData = await window.electronAPI.readFile(filePath);

          if (fileData.success && fileData.data) {
            const blob = new Blob([new Uint8Array(fileData.data)], { type: 'application/pdf' });
            const file = new File([blob], matchingFile, { type: 'application/pdf' });

            uploadedCount++;
          }
        } catch (err) {
          errors.push(`Failed to load ${matchingFile}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    }

    return {
      success: true,
      uploadedCount,
      errors
    };
  }
}

export const fileSaverService = new FileSaverService();
