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
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sku: string;
          x_position: number;
          y_position: number;
          font_size?: number;
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sku?: string;
          x_position?: number;
          y_position?: number;
          font_size?: number;
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
  pdfFile: File | null;
  pdfDataUrl: string | null;
  orderNumberPlaced: boolean;
  position: {
    x: number;
    y: number;
    fontSize: number;
  } | null;
}

export interface OrderWithTabs extends OrderItem {
  tabs: UploadTab[];
  imageUrls: string[];
}
