export interface Database {
  public: {
    Tables: {
      sku_positions: {
        Row: {
          id: string;
          sku: string;
          x_position: number;
          y_position: number;
          font_size: number;
          rotation: number;
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sku: string;
          x_position: number;
          y_position: number;
          font_size?: number;
          rotation?: number;
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sku?: string;
          x_position?: number;
          y_position?: number;
          font_size?: number;
          rotation?: number;
          last_updated?: string;
          created_at?: string;
        };
      };
      app_settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value?: string;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string;
          updated_at?: string;
          created_at?: string;
        };
      };
      sku_routing_rules: {
        Row: {
          id: string;
          pattern: string;
          folder_name: string;
          priority: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pattern: string;
          folder_name: string;
          priority?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pattern?: string;
          folder_name?: string;
          priority?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      processing_sessions: {
        Row: {
          id: string;
          csv_filename: string;
          total_orders: number;
          completed_orders: number;
          started_at: string;
          completed_at: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          csv_filename: string;
          total_orders?: number;
          completed_orders?: number;
          started_at?: string;
          completed_at?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          csv_filename?: string;
          total_orders?: number;
          completed_orders?: number;
          started_at?: string;
          completed_at?: string | null;
          status?: string;
          created_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          session_id: string;
          veeqo_id: string;
          order_number: string;
          sku: string;
          product_title: string;
          quantity: number;
          number_of_lines: number;
          customer_note: string;
          additional_options: string;
          is_customized: boolean;
          status: string;
          saved_at: string | null;
          created_at: string;
          updated_at: string;
          line_index: number;
          total_tabs: number;
          is_card: boolean;
          marked_for_review: boolean;
          review_notes: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          veeqo_id: string;
          order_number: string;
          sku: string;
          product_title: string;
          quantity?: number;
          number_of_lines?: number;
          customer_note?: string;
          additional_options?: string;
          is_customized?: boolean;
          status?: string;
          saved_at?: string | null;
          created_at?: string;
          updated_at?: string;
          line_index?: number;
          total_tabs?: number;
          is_card?: boolean;
          marked_for_review?: boolean;
          review_notes?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          veeqo_id?: string;
          order_number?: string;
          sku?: string;
          product_title?: string;
          quantity?: number;
          number_of_lines?: number;
          customer_note?: string;
          additional_options?: string;
          is_customized?: boolean;
          status?: string;
          saved_at?: string | null;
          created_at?: string;
          updated_at?: string;
          line_index?: number;
          total_tabs?: number;
          is_card?: boolean;
          marked_for_review?: boolean;
          review_notes?: string;
        };
      };
      tab_metadata: {
        Row: {
          id: string;
          order_item_id: string;
          tab_id: string;
          tab_number: number;
          sku: string;
          line_index: number;
          line_item_id: string | null;
          is_card: boolean;
          auto_selected_folder: string | null;
          selected_folder: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_item_id: string;
          tab_id: string;
          tab_number: number;
          sku: string;
          line_index?: number;
          line_item_id?: string | null;
          is_card?: boolean;
          auto_selected_folder?: string | null;
          selected_folder?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_item_id?: string;
          tab_id?: string;
          tab_number?: number;
          sku?: string;
          line_index?: number;
          line_item_id?: string | null;
          is_card?: boolean;
          auto_selected_folder?: string | null;
          selected_folder?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      csv_column_mappings: {
        Row: {
          id: string;
          veeqo_id_column: string | null;
          order_number_column: string | null;
          sku_column: string | null;
          title_column: string | null;
          quantity_column: string | null;
          number_of_lines_column: string | null;
          customer_note_column: string | null;
          additional_options_column: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          veeqo_id_column?: string | null;
          order_number_column?: string | null;
          sku_column?: string | null;
          title_column?: string | null;
          quantity_column?: string | null;
          number_of_lines_column?: string | null;
          customer_note_column?: string | null;
          additional_options_column?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          veeqo_id_column?: string | null;
          order_number_column?: string | null;
          sku_column?: string | null;
          title_column?: string | null;
          quantity_column?: string | null;
          number_of_lines_column?: string | null;
          customer_note_column?: string | null;
          additional_options_column?: string | null;
          updated_at?: string;
          created_at?: string;
        };
      };
      folder_types: {
        Row: {
          id: string;
          folder_name: string;
          description: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          folder_name: string;
          description?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          folder_name?: string;
          description?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      saved_files: {
        Row: {
          id: string;
          order_item_id: string;
          tab_id: string;
          file_path: string;
          veeqo_id: string;
          tab_number: number;
          saved_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_item_id: string;
          tab_id: string;
          file_path: string;
          veeqo_id: string;
          tab_number: number;
          saved_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_item_id?: string;
          tab_id?: string;
          file_path?: string;
          veeqo_id?: string;
          tab_number?: number;
          saved_at?: string;
          created_at?: string;
        };
      };
      order_line_items: {
        Row: {
          id: string;
          order_item_id: string;
          sku: string;
          product_title: string;
          quantity: number;
          number_of_lines: number;
          line_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_item_id: string;
          sku?: string;
          product_title?: string;
          quantity?: number;
          number_of_lines?: number;
          line_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_item_id?: string;
          sku?: string;
          product_title?: string;
          quantity?: number;
          number_of_lines?: number;
          line_index?: number;
          created_at?: string;
        };
      };
    };
  };
}

export interface SKUPosition {
  id: string;
  sku: string;
  x_position: number;
  y_position: number;
  font_size: number;
  rotation: number;
  file_width: number | null;
  file_height: number | null;
  last_updated: string;
  created_at: string;
}

export interface AppSettings {
  id: string;
  key: string;
  value: string;
  updated_at: string;
  created_at: string;
}

export interface SKURoutingRule {
  id: string;
  pattern: string;
  folder_name: string;
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProcessingSession {
  id: string;
  csv_filename: string;
  total_orders: number;
  completed_orders: number;
  started_at: string;
  completed_at: string | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  created_at: string;
}

export interface OrderLineItem {
  id: string;
  order_item_id: string;
  sku: string;
  product_title: string;
  quantity: number;
  number_of_lines: number;
  line_index: number;
  created_at: string;
}

export interface OrderItem {
  id: string;
  session_id: string;
  veeqo_id: string;
  order_number: string;
  sku: string;
  product_title: string;
  quantity: number;
  number_of_lines: number;
  customer_note: string;
  additional_options: string;
  is_customized: boolean;
  status: 'pending' | 'uploaded' | 'saved';
  saved_at: string | null;
  created_at: string;
  updated_at: string;
  line_index: number;
  total_tabs: number;
  is_card: boolean;
  marked_for_review: boolean;
  review_notes: string;
}

export interface CSVRow {
  id: string;
  order_number: string;
  sku: string;
  title: string;
  quantity: string;
  number_of_lines: string;
  customer_note: string;
  additional_options: string;
}

export interface UploadTab {
  id: string;
  label: string;
  tabNumber: number;
  sku: string;
  lineIndex: number;
  lineItemId: string | null;
  isCard: boolean;
  autoSelectedFolder: string | null;
  selectedFolder: string | null;
  pdfFile: File | null;
  pdfDataUrl: string | null;
  fileType: 'pdf' | 'jpg' | null;
  fileWidth: number | null;
  fileHeight: number | null;
  isAutoLoaded: boolean;
  orderNumberPlaced: boolean;
  position: {
    x: number;
    y: number;
    fontSize: number;
    rotation: number;
  } | null;
}

export interface OrderWithTabs extends OrderItem {
  tabs: UploadTab[];
  imageUrls: string[];
}

export interface CSVColumnMapping {
  id: string;
  veeqo_id_column: string | null;
  order_number_column: string | null;
  sku_column: string | null;
  title_column: string | null;
  quantity_column: string | null;
  number_of_lines_column: string | null;
  customer_note_column: string | null;
  additional_options_column: string | null;
  updated_at: string;
  created_at: string;
}

export interface FolderType {
  id: string;
  folder_name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  output_file_format: 'pdf' | 'jpg';
  created_at: string;
  updated_at: string;
}

export interface TabMetadata {
  id: string;
  order_item_id: string;
  tab_id: string;
  tab_number: number;
  sku: string;
  line_index: number;
  line_item_id: string | null;
  is_card: boolean;
  auto_selected_folder: string | null;
  selected_folder: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedFile {
  id: string;
  order_item_id: string;
  tab_id: string;
  file_path: string;
  veeqo_id: string;
  tab_number: number;
  saved_at: string;
  created_at: string;
}

export interface ValidationIssue {
  type: 'missing_file' | 'missing_order_number' | 'missing_folder';
  tabNumber: number;
  tabLabel: string;
  message: string;
}

export interface OrderValidationResult {
  orderId: string;
  orderNumber: string;
  veeqoId: string;
  isComplete: boolean;
  issues: ValidationIssue[];
  totalTabs: number;
  completeTabs: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  sku: string;
  pdfFile: File | null;
  pdfDataUrl: string | null;
  fileType?: 'pdf' | 'jpg' | null;
  fileWidth?: number | null;
  fileHeight?: number | null;
  position: {
    x: number;
    y: number;
    fontSize: number;
    rotation: number;
  } | null;
  hasPosition: boolean;
}

export interface CorrectionCheckFile {
  orderItemId: string;
  orderNumber: string;
  veeqoId: string;
  sku: string;
  productTitle: string;
  customerNote: string;
  additionalOptions: string;
  tabId: string;
  tabNumber: number;
  tabLabel: string;
  totalTabs: number;
  isCard: boolean;
  selectedFolder: string | null;
  pdfDataUrl: string;
  pdfFile: File;
  fileType: 'pdf' | 'jpg' | null;
  fileWidth: number | null;
  fileHeight: number | null;
  isAutoLoaded: boolean;
  orderNumberPlaced: boolean;
  position: {
    x: number;
    y: number;
    fontSize: number;
    rotation: number;
  } | null;
  imageUrls: string[];
  markedForReview: boolean;
  reviewNotes: string;
}
