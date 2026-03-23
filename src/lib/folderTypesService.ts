import { supabase } from './supabase';
import type { FolderType } from './types';

export const folderTypesService = {
  async getAllFolderTypes(): Promise<FolderType[]> {
    const { data, error } = await supabase
      .from('folder_types')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching folder types:', error);
      return [];
    }

    return data || [];
  },

  async getActiveFolderTypes(): Promise<FolderType[]> {
    const { data, error } = await supabase
      .from('folder_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching active folder types:', error);
      return [];
    }

    return data || [];
  },

  async createFolderType(
    folder_name: string,
    description?: string | null,
    output_file_format: 'pdf' | 'jpg' = 'pdf'
  ): Promise<FolderType | null> {
    const maxSortOrder = await this.getMaxSortOrder();

    const { data, error } = await supabase
      .from('folder_types')
      .insert({
        folder_name,
        description: description || null,
        is_active: true,
        sort_order: maxSortOrder + 1,
        output_file_format,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating folder type:', error);
      return null;
    }

    return data;
  },

  async updateFolderType(
    id: string,
    updates: {
      folder_name?: string;
      description?: string | null;
      is_active?: boolean;
      sort_order?: number;
      output_file_format?: 'pdf' | 'jpg';
    }
  ): Promise<boolean> {
    const { error } = await supabase
      .from('folder_types')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating folder type:', error);
      return false;
    }

    return true;
  },

  async deleteFolderType(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('folder_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting folder type:', error);
      return false;
    }

    return true;
  },

  async reorderFolderTypes(folderTypeIds: string[]): Promise<boolean> {
    try {
      for (let i = 0; i < folderTypeIds.length; i++) {
        const { error } = await supabase
          .from('folder_types')
          .update({ sort_order: i })
          .eq('id', folderTypeIds[i]);

        if (error) {
          console.error('Error reordering folder types:', error);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error reordering folder types:', error);
      return false;
    }
  },

  async getMaxSortOrder(): Promise<number> {
    const { data, error } = await supabase
      .from('folder_types')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error getting max sort order:', error);
      return 0;
    }

    return data?.sort_order ?? -1;
  },

  async folderTypeExists(folder_name: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('folder_types')
      .select('id')
      .eq('folder_name', folder_name)
      .maybeSingle();

    if (error) {
      console.error('Error checking folder type existence:', error);
      return false;
    }

    return !!data;
  },

  async getFolderTypeByName(folder_name: string): Promise<FolderType | null> {
    const { data, error } = await supabase
      .from('folder_types')
      .select('*')
      .eq('folder_name', folder_name)
      .maybeSingle();

    if (error) {
      console.error('Error fetching folder type by name:', error);
      return null;
    }

    return data;
  },
};
