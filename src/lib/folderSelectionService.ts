import { supabase } from './supabase';
import { SKURoutingRule, FolderType } from './types';

export class FolderSelectionService {
  async getRoutingRules(): Promise<SKURoutingRule[]> {
    const { data } = await supabase
      .from('sku_routing_rules')
      .select('*')
      .eq('active', true)
      .order('priority', { ascending: true });

    return data || [];
  }

  async getActiveFolders(): Promise<FolderType[]> {
    const { data } = await supabase
      .from('folder_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    return data || [];
  }

  determineAutoSelectedFolder(sku: string, rules: SKURoutingRule[]): string | null {
    const skuUpper = sku.toUpperCase();

    for (const rule of rules) {
      if (skuUpper.includes(rule.pattern.toUpperCase())) {
        return rule.folder_name;
      }
    }

    return null;
  }

  async saveTabMetadata(tabMetadata: {
    order_item_id: string;
    tab_id: string;
    tab_number: number;
    sku: string;
    line_index: number;
    is_card: boolean;
    label: string;
    auto_selected_folder: string | null;
    selected_folder: string | null;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('tab_metadata')
        .insert([tabMetadata]);

      if (error) {
        console.error('Error saving tab metadata:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Unexpected error saving tab metadata:', err);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  async updateTabMetadata(
    tabId: string,
    updates: {
      is_card?: boolean;
      selected_folder?: string | null;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('tab_metadata')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('tab_id', tabId);

      if (error) {
        console.error('Error updating tab metadata:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Unexpected error updating tab metadata:', err);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  async getTabMetadataByOrderItemId(orderItemId: string) {
    const { data, error } = await supabase
      .from('tab_metadata')
      .select('*')
      .eq('order_item_id', orderItemId)
      .order('tab_number', { ascending: true });

    if (error) {
      console.error('Error fetching tab metadata:', error);
      return [];
    }

    return data || [];
  }

  async deleteTabMetadataByOrderItemId(orderItemId: string): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from('tab_metadata')
        .delete()
        .eq('order_item_id', orderItemId);

      if (error) {
        console.error('Error deleting tab metadata:', error);
        return { success: false };
      }

      return { success: true };
    } catch (err) {
      console.error('Unexpected error deleting tab metadata:', err);
      return { success: false };
    }
  }
}

export const folderSelectionService = new FolderSelectionService();
