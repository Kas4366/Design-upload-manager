import { supabase } from './supabase';
import type { SKUPosition } from './types';

export const skuPositionService = {
  async getSavedPosition(sku: string): Promise<SKUPosition | null> {
    const { data, error } = await supabase
      .from('sku_positions')
      .select('*')
      .eq('sku', sku)
      .maybeSingle();

    if (error) {
      console.error('Error fetching saved position:', error);
      return null;
    }

    return data;
  },

  async savePosition(
    sku: string,
    x_position: number,
    y_position: number,
    font_size: number
  ): Promise<boolean> {
    const { error } = await supabase
      .from('sku_positions')
      .upsert(
        {
          sku,
          x_position,
          y_position,
          font_size,
          last_updated: new Date().toISOString(),
        },
        {
          onConflict: 'sku',
        }
      );

    if (error) {
      console.error('Error saving position:', error);
      return false;
    }

    return true;
  },

  async getAllPositions(): Promise<SKUPosition[]> {
    const { data, error } = await supabase
      .from('sku_positions')
      .select('*')
      .order('last_updated', { ascending: false });

    if (error) {
      console.error('Error fetching all positions:', error);
      return [];
    }

    return data || [];
  },

  async deletePosition(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('sku_positions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting position:', error);
      return false;
    }

    return true;
  },

  async updatePosition(
    id: string,
    updates: {
      x_position?: number;
      y_position?: number;
      font_size?: number;
    }
  ): Promise<boolean> {
    const { error } = await supabase
      .from('sku_positions')
      .update({
        ...updates,
        last_updated: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating position:', error);
      return false;
    }

    return true;
  },
};
