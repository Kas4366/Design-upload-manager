import { supabase } from './supabase';
import { CSVColumnMapping } from './types';

export async function loadColumnMappings(): Promise<CSVColumnMapping | null> {
  try {
    const { data, error } = await supabase
      .from('csv_column_mappings')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error loading column mappings from database:', error);
      throw error;
    }

    console.log('Column mappings loaded:', data);
    return data;
  } catch (err) {
    console.error('Failed to load column mappings:', err);
    return null;
  }
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
    console.log('Starting saveColumnMappings...', mappings);
    const existingMapping = await loadColumnMappings();
    console.log('Existing mapping:', existingMapping);

    if (existingMapping) {
      console.log('Updating existing mapping with id:', existingMapping.id);
      const { data, error } = await supabase
        .from('csv_column_mappings')
        .update({
          ...mappings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMapping.id)
        .select();

      if (error) {
        console.error('Error updating column mappings:', error);
        return { success: false, error: `Database error: ${error.message}` };
      }
      console.log('Update successful:', data);
    } else {
      console.log('Inserting new mapping...');
      const { data, error } = await supabase
        .from('csv_column_mappings')
        .insert([mappings])
        .select();

      if (error) {
        console.error('Error inserting column mappings:', error);
        return { success: false, error: `Database error: ${error.message}` };
      }
      console.log('Insert successful:', data);
    }

    console.log('Column mappings saved successfully');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error saving column mappings:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Failed to connect to database: ${errorMessage}` };
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
