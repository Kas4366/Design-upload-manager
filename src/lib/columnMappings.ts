import { supabase } from './supabase';
import { CSVColumnMapping } from './types';

export async function loadColumnMappings(): Promise<CSVColumnMapping | null> {
  const { data, error } = await supabase
    .from('csv_column_mappings')
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Error loading column mappings:', error);
    return null;
  }

  return data;
}

export async function saveColumnMappings(mappings: {
  veeqo_id_column: string;
  order_number_column: string;
  sku_column: string;
  title_column: string;
  quantity_column: string;
  number_of_lines_column: string;
  customer_note_column: string;
  additional_options_column: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const existingMapping = await loadColumnMappings();

    if (existingMapping) {
      const { error } = await supabase
        .from('csv_column_mappings')
        .update({
          ...mappings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMapping.id);

      if (error) {
        console.error('Error updating column mappings:', error);
        return { success: false, error: error.message };
      }
    } else {
      const { error } = await supabase
        .from('csv_column_mappings')
        .insert([mappings]);

      if (error) {
        console.error('Error inserting column mappings:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error saving column mappings:', err);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

export async function clearColumnMappings(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('csv_column_mappings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Error clearing column mappings:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error clearing column mappings:', err);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

export function getDefaultColumnNames() {
  return {
    veeqo_id_column: 'id',
    order_number_column: 'order_number',
    sku_column: 'sku',
    title_column: 'title',
    quantity_column: 'quantity',
    number_of_lines_column: 'number_of_lines',
    customer_note_column: 'customer_note',
    additional_options_column: 'additional_options',
  };
}
