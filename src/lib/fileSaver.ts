import { supabase } from './supabase';
import { SKURoutingRule, OrderWithTabs, SavedFile } from './types';
import { embedOrderNumberInPDF, embedOrderNumberInJPG, convertPDFToJPG, convertJPGToPDF } from './pdfProcessor';
import { folderTypesService } from './folderTypesService';
import { fileSystemAPI, loadFolderHandle, saveFolderHandle } from './fileSystemAccess';
import { createZipExport, FileToZip } from './zipExport';
import { uploadDesignFile } from './cloudStorage';

export class FileSaverService {
  private folderHandle: FileSystemDirectoryHandle | null = null;

  async getSavedFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
    if (!this.folderHandle) {
      this.folderHandle = await loadFolderHandle();
    }
    return this.folderHandle;
  }

  async requestAndSaveFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
    if (!fileSystemAPI.isSupported) {
      return null;
    }

    const handle = await fileSystemAPI.requestFolderAccess();
    if (handle) {
      this.folderHandle = handle;
      await saveFolderHandle(handle);
    }
    return handle;
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

  async readFileAsArrayBuffer(file: File): Promise<{ buffer: ArrayBuffer }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ buffer: reader.result as ArrayBuffer });
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async checkIfFileWasSaved(orderItemId: string, tabId: string): Promise<SavedFile | null> {
    const { data } = await supabase
      .from('saved_files')
      .select('*')
      .eq('order_item_id', orderItemId)
      .eq('tab_id', tabId)
      .maybeSingle();

    return data;
  }

  async recordSavedFile(orderItemId: string, tabId: string, filePath: string, veeqoId: string, tabNumber: number): Promise<void> {
    await supabase
      .from('saved_files')
      .upsert({
        order_item_id: orderItemId,
        tab_id: tabId,
        file_path: filePath,
        veeqo_id: veeqoId,
        tab_number: tabNumber,
        saved_at: new Date().toISOString()
      }, {
        onConflict: 'order_item_id,tab_id'
      });
  }

  generateFilename(veeqoId: string, tabNumber: number, sku: string, tabLabel: string, isCard: boolean, totalNonInsideTabs: number, outputFormat: 'pdf' | 'jpg' = 'pdf'): string {
    const extension = outputFormat === 'jpg' ? 'jpg' : 'pdf';

    if (isCard && (tabLabel === 'Front' || tabLabel === 'Inside')) {
      return `${veeqoId}-${tabLabel}.${extension}`;
    }

    if (totalNonInsideTabs === 1) {
      return `${veeqoId}.${extension}`;
    }

    return `${veeqoId}-${tabNumber}.${extension}`;
  }

  async saveOrderFiles(order: OrderWithTabs, sessionId?: string, csvFilename?: string): Promise<{
    success: boolean;
    error?: string;
    savedPaths?: string[];
    skippedPaths?: string[];
  }> {
    try {
      const folderHandle = await this.getSavedFolderHandle();

      if (!folderHandle && !fileSystemAPI.isSupported) {
        return await this.saveAsZipExport(order);
      }

      if (!folderHandle) {
        return {
          success: false,
          error: 'Please select a save location first (use "Select Save Location" button in settings)'
        };
      }

      const hasPermission = await fileSystemAPI.verifyPermission(folderHandle);
      if (!hasPermission) {
        return {
          success: false,
          error: 'No permission to write to selected folder'
        };
      }

      const savedPaths: string[] = [];
      const skippedPaths: string[] = [];

      const totalNonInsideTabs = order.tabs.filter(t => !(t.isCard && t.label === 'Inside')).length;

      for (const tab of order.tabs) {
        if (!tab.pdfFile) {
          return {
            success: false,
            error: `Tab ${tab.tabNumber} is missing PDF file`
          };
        }

        const previouslySaved = await this.checkIfFileWasSaved(order.id, tab.id);
        if (previouslySaved) {
          skippedPaths.push(previouslySaved.file_path);
          continue;
        }

        const isInsideCard = tab.isCard && tab.label === 'Inside';
        if (!isInsideCard && !tab.position) {
          return {
            success: false,
            error: `Tab ${tab.tabNumber} is missing order number placement`
          };
        }

        if (!tab.selectedFolder) {
          return {
            success: false,
            error: `Tab ${tab.tabNumber} does not have a folder selected`
          };
        }

        const folderType = await folderTypesService.getFolderTypeByName(tab.selectedFolder);
        if (!folderType) {
          return {
            success: false,
            error: `Folder type "${tab.selectedFolder}" does not exist. Please configure it in Settings.`
          };
        }

        if (!folderType.is_active) {
          return {
            success: false,
            error: `Folder type "${tab.selectedFolder}" is inactive. Please activate it in Settings.`
          };
        }

        let fileBytes: Uint8Array;
        const outputFormat = folderType.output_file_format;

        if (isInsideCard) {
          const { buffer } = await this.readFileAsArrayBuffer(tab.pdfFile);
          fileBytes = new Uint8Array(buffer);

          if (outputFormat === 'jpg' && tab.fileType === 'pdf') {
            fileBytes = await convertPDFToJPG(fileBytes);
          } else if (outputFormat === 'pdf' && tab.fileType === 'jpg') {
            fileBytes = await convertJPGToPDF(fileBytes);
          }
        } else {
          if (tab.fileType === 'jpg') {
            fileBytes = await embedOrderNumberInJPG(
              tab.pdfFile,
              order.order_number,
              tab.tabNumber,
              tab.position!
            );
          } else {
            fileBytes = await embedOrderNumberInPDF(
              tab.pdfFile,
              order.order_number,
              tab.tabNumber,
              tab.position!
            );
          }

          if (outputFormat === 'jpg' && tab.fileType === 'pdf') {
            fileBytes = await convertPDFToJPG(fileBytes);
          } else if (outputFormat === 'pdf' && tab.fileType === 'jpg') {
            fileBytes = await convertJPGToPDF(fileBytes);
          }
        }

        const filename = this.generateFilename(order.veeqo_id, tab.tabNumber, tab.sku, tab.label, tab.isCard, totalNonInsideTabs, outputFormat);

        const success = await fileSystemAPI.saveFile(
          folderHandle,
          tab.selectedFolder,
          filename,
          fileBytes
        );

        if (!success) {
          return {
            success: false,
            error: `Failed to save file: ${filename}`
          };
        }

        const fullPath = `${tab.selectedFolder}/${filename}`;
        await this.recordSavedFile(order.id, tab.id, fullPath, order.veeqo_id, tab.tabNumber);
        savedPaths.push(fullPath);
      }

      await supabase
        .from('order_items')
        .update({
          status: 'saved',
          is_saved: true,
          saved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      return {
        success: true,
        savedPaths,
        skippedPaths
      };
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async saveAsZipExport(order: OrderWithTabs): Promise<{
    success: boolean;
    error?: string;
    savedPaths?: string[];
  }> {
    try {
      const filesToZip: FileToZip[] = [];
      const totalNonInsideTabs = order.tabs.filter(t => !(t.isCard && t.label === 'Inside')).length;

      for (const tab of order.tabs) {
        if (!tab.pdfFile || !tab.selectedFolder) {
          continue;
        }

        const folderType = await folderTypesService.getFolderTypeByName(tab.selectedFolder);
        const outputFormat = folderType?.output_file_format || 'pdf';

        const isInsideCard = tab.isCard && tab.label === 'Inside';

        let fileBytes: Uint8Array;

        if (isInsideCard) {
          const { buffer } = await this.readFileAsArrayBuffer(tab.pdfFile);
          fileBytes = new Uint8Array(buffer);

          if (outputFormat === 'jpg' && tab.fileType === 'pdf') {
            fileBytes = await convertPDFToJPG(fileBytes);
          } else if (outputFormat === 'pdf' && tab.fileType === 'jpg') {
            fileBytes = await convertJPGToPDF(fileBytes);
          }
        } else {
          if (!tab.position) continue;

          if (tab.fileType === 'jpg') {
            fileBytes = await embedOrderNumberInJPG(
              tab.pdfFile,
              order.order_number,
              tab.tabNumber,
              tab.position
            );
          } else {
            fileBytes = await embedOrderNumberInPDF(
              tab.pdfFile,
              order.order_number,
              tab.tabNumber,
              tab.position
            );
          }

          if (outputFormat === 'jpg' && tab.fileType === 'pdf') {
            fileBytes = await convertPDFToJPG(fileBytes);
          } else if (outputFormat === 'pdf' && tab.fileType === 'jpg') {
            fileBytes = await convertJPGToPDF(fileBytes);
          }
        }

        const filename = this.generateFilename(order.veeqo_id, tab.tabNumber, tab.sku, tab.label, tab.isCard, totalNonInsideTabs, outputFormat);

        filesToZip.push({
          folderPath: tab.selectedFolder,
          filename,
          data: fileBytes
        });
      }

      const zipFilename = `order-${order.order_number}.zip`;
      const success = await createZipExport(filesToZip, zipFilename);

      if (!success) {
        return {
          success: false,
          error: 'Failed to create ZIP file'
        };
      }

      return {
        success: true,
        savedPaths: filesToZip.map(f => `${f.folderPath}/${f.filename}`)
      };
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async saveBatchOrders(orders: OrderWithTabs[], selectedOrderIds: string[]): Promise<{
    success: boolean;
    savedCount: number;
    skippedCount: number;
    errors: string[];
  }> {
    let savedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    const ordersToSave = orders.filter(o => selectedOrderIds.includes(o.id));

    for (const order of ordersToSave) {
      const result = await this.saveOrderFiles(order);

      if (result.success) {
        savedCount += result.savedPaths?.length || 0;
        skippedCount += result.skippedPaths?.length || 0;

        await supabase
          .from('order_items')
          .update({
            status: 'saved',
            saved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);
      } else {
        errors.push(`Order ${order.order_number}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      savedCount,
      skippedCount,
      errors
    };
  }

  async autoUploadPremadeDesigns(orders: OrderWithTabs[]): Promise<{
    success: boolean;
    uploadedCount: number;
    errors: string[];
  }> {
    return {
      success: false,
      uploadedCount: 0,
      errors: ['Auto-upload premade designs feature will be implemented with cloud storage in future update']
    };
  }
}

export const fileSaverService = new FileSaverService();
