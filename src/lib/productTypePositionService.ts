import { supabase } from './supabase';

export interface ProductTypePosition {
  id: string;
  product_type: string;
  x_position: number;
  y_position: number;
  font_size: number;
  rotation: number;
  created_at: string;
  updated_at: string;
}

export class ProductTypePositionService {
  async getPositionByType(productType: string): Promise<ProductTypePosition | null> {
    const { data, error } = await supabase
      .from('product_type_positions')
      .select('*')
      .eq('product_type', productType)
      .maybeSingle();

    if (error) {
      console.error('Error fetching product type position:', error);
      return null;
    }

    return data;
  }

  async savePosition(
    productType: string,
    position: { x: number; y: number; fontSize: number; rotation: number }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('product_type_positions')
        .upsert({
          product_type: productType,
          x_position: position.x,
          y_position: position.y,
          font_size: position.fontSize,
          rotation: position.rotation,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'product_type'
        });

      if (error) {
        console.error('Error saving product type position:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Unexpected error saving product type position:', err);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  isChocolateWrapper(sku: string, title: string): boolean {
    const skuUpper = sku.toUpperCase();
    const titleLower = title.toLowerCase();

    return skuUpper.includes('WW') ||
           titleLower.includes('wrapper') ||
           titleLower.includes('chocolate wrapper');
  }

  getProductType(sku: string, title: string): string | null {
    if (this.isChocolateWrapper(sku, title)) {
      return 'wrapper';
    }

    const skuUpper = sku.toUpperCase();
    const titleLower = title.toLowerCase();

    if (skuUpper.includes('CD') || titleLower.includes('card')) {
      return 'card';
    }

    if (skuUpper.includes('BL') || titleLower.includes('bottle') || titleLower.includes('label')) {
      return 'bottle_label';
    }

    return null;
  }
}

export const productTypePositionService = new ProductTypePositionService();
