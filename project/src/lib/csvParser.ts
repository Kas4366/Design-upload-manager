import Papa from 'papaparse';
import { CSVRow, OrderItem, UploadTab } from './types';

export function parseCSV(file: File): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        const csvRows: CSVRow[] = rows.map(row => ({
          id: row.id || '',
          order_number: row.order_number || '',
          sku: row.sku || '',
          title: row.title || '',
          quantity: row.quantity || '1',
          number_of_lines: row.number_of_lines || '1',
          customer_note: row.customer_note || '',
          additional_options: row.additional_options || ''
        }));
        resolve(csvRows);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

export function isCustomizedOrder(title: string, customerNote: string): boolean {
  const titleLower = title.toLowerCase();
  return titleLower.includes('personalised') ||
         titleLower.includes('customised') ||
         titleLower.includes('personalized') ||
         titleLower.includes('customized') ||
         customerNote.trim().length > 0;
}

export function extractImageUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/gi;
  return text.match(urlRegex) || [];
}

export function calculateTabsForOrder(sku: string, quantity: number, numberOfLines: number): number {
  const skuUpper = sku.toUpperCase();

  if (skuUpper.includes('CD')) {
    return 2;
  }

  return quantity * numberOfLines;
}

export function generateTabLabels(sku: string, tabCount: number): string[] {
  const skuUpper = sku.toUpperCase();

  if (skuUpper.includes('CD') && tabCount === 2) {
    return ['Front', 'Inside'];
  }

  return Array.from({ length: tabCount }, (_, i) => `${i + 1}`);
}

export function createEmptyTabs(sku: string, tabCount: number): UploadTab[] {
  const labels = generateTabLabels(sku, tabCount);

  return labels.map((label, index) => ({
    id: `tab-${index}`,
    label,
    pdfFile: null,
    pdfDataUrl: null,
    orderNumberPlaced: false,
    position: null
  }));
}

export function convertCSVRowsToOrderItems(
  csvRows: CSVRow[],
  sessionId: string
): OrderItem[] {
  return csvRows.map(row => {
    const quantity = parseInt(row.quantity) || 1;
    const numberOfLines = parseInt(row.number_of_lines) || 1;
    const isCustomized = isCustomizedOrder(row.title, row.customer_note);

    return {
      id: crypto.randomUUID(),
      session_id: sessionId,
      veeqo_id: row.id,
      order_number: row.order_number,
      sku: row.sku,
      product_title: row.title,
      quantity,
      number_of_lines: numberOfLines,
      customer_note: row.customer_note,
      additional_options: row.additional_options,
      is_customized: isCustomized,
      status: 'pending',
      saved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
}
