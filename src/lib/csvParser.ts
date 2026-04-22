import Papa from 'papaparse';
import { CSVRow, OrderItem, UploadTab, CSVColumnMapping, OrderLineItem } from './types';
import { getDefaultColumnNames } from './columnMappings';

export function parseCSV(file: File, columnMapping?: CSVColumnMapping | null): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        const defaultColumns = getDefaultColumnNames();

        const mapping = columnMapping ? {
          id: columnMapping.veeqo_id_column || defaultColumns.veeqo_id_column,
          order_number: columnMapping.order_number_column || defaultColumns.order_number_column,
          sku: columnMapping.sku_column || defaultColumns.sku_column,
          title: columnMapping.title_column || defaultColumns.title_column,
          quantity: columnMapping.quantity_column || defaultColumns.quantity_column,
          number_of_lines: columnMapping.number_of_lines_column || defaultColumns.number_of_lines_column,
          customer_note: columnMapping.customer_note_column || defaultColumns.customer_note_column,
          additional_options: columnMapping.additional_options_column || defaultColumns.additional_options_column,
        } : defaultColumns;

        const csvRows: CSVRow[] = rows.map(row => ({
          id: row[mapping.id] || '',
          order_number: row[mapping.order_number] || '',
          sku: row[mapping.sku] || '',
          title: row[mapping.title] || '',
          quantity: row[mapping.quantity] || '1',
          number_of_lines: row[mapping.number_of_lines] || '1',
          customer_note: row[mapping.customer_note] || '',
          additional_options: row[mapping.additional_options] || ''
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

export function isCardSKU(title: string): boolean {
  const titleLower = title.toLowerCase();
  return titleLower.includes('card');
}

export function calculateTabsForOrder(sku: string, title: string, quantity: number, numberOfLines: number): number {
  const skuUpper = sku.toUpperCase();
  const titleLower = title.toLowerCase();

  if (skuUpper.includes('CD') || titleLower.includes('card')) {
    return quantity * 2;
  }

  if (numberOfLines === 0) {
    return quantity;
  }

  return Math.ceil(quantity / numberOfLines);
}

export function generateTabLabels(sku: string, title: string, tabCount: number, isCard: boolean): string[] {
  const skuUpper = sku.toUpperCase();
  const titleLower = title.toLowerCase();

  if (skuUpper.includes('CD') || titleLower.includes('card') || isCard) {
    const pairCount = tabCount / 2;
    const labels: string[] = [];
    for (let i = 0; i < pairCount; i++) {
      labels.push('Front', 'Inside');
    }
    return labels;
  }

  return Array.from({ length: tabCount }, (_, i) => `${i + 1}`);
}

export function createEmptyTabs(
  sku: string,
  title: string,
  tabCount: number,
  startingTabNumber: number,
  lineIndex: number,
  isCard: boolean,
  autoSelectedFolder: string | null,
  lineItemId: string | null = null
): UploadTab[] {
  const labels = generateTabLabels(sku, title, tabCount, isCard);

  return labels.map((label, index) => {
    const pairIndex = isCard ? Math.floor(index / 2) + 1 : null;
    return {
      id: `tab-${startingTabNumber + index}`,
      label,
      tabNumber: startingTabNumber + index,
      sku,
      lineIndex,
      lineItemId,
      isCard,
      pairIndex,
      autoSelectedFolder,
      selectedFolder: autoSelectedFolder,
      pdfFile: null,
      pdfDataUrl: null,
      fileType: null,
      isAutoLoaded: false,
      orderNumberPlaced: false,
      position: null
    };
  });
}

export function convertCSVRowsToOrderItems(
  csvRows: CSVRow[],
  sessionId: string
): OrderItem[] {
  const groupedByOrder: Map<string, CSVRow[]> = new Map();

  csvRows.forEach(row => {
    const orderNum = row.order_number;
    if (!groupedByOrder.has(orderNum)) {
      groupedByOrder.set(orderNum, []);
    }
    groupedByOrder.get(orderNum)!.push(row);
  });

  const orderItems: OrderItem[] = [];

  groupedByOrder.forEach((rows, orderNumber) => {
    // Use first row for order-level data (veeqo_id, customer_note are shared across lines)
    const firstRow = rows[0];

    // Calculate total tabs across all lines
    let totalTabs = 0;
    rows.forEach(row => {
      const quantity = parseInt(row.quantity) || 1;
      const numberOfLines = parseInt(row.number_of_lines) || 1;
      const tabsForLine = calculateTabsForOrder(row.sku, row.title, quantity, numberOfLines);
      totalTabs += tabsForLine;
    });

    const isCustomized = isCustomizedOrder(firstRow.title, firstRow.customer_note);

    // Create single order item for this order_number
    orderItems.push({
      id: crypto.randomUUID(),
      session_id: sessionId,
      veeqo_id: firstRow.id, // All lines share the same veeqo_id
      order_number: orderNumber,
      sku: firstRow.sku, // Keep for backward compatibility
      product_title: firstRow.title, // Keep for backward compatibility
      quantity: parseInt(firstRow.quantity) || 1, // Keep for backward compatibility
      number_of_lines: parseInt(firstRow.number_of_lines) || 1, // Keep for backward compatibility
      customer_note: firstRow.customer_note, // Shared across all lines
      additional_options: firstRow.additional_options, // From first row
      is_customized: isCustomized,
      is_card: false, // Will be set per tab
      line_index: 0, // Keep for backward compatibility
      total_tabs: totalTabs, // Sum of tabs across all lines
      status: 'pending',
      saved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  return orderItems;
}

export function createLineItemsForOrder(
  orderId: string,
  csvRows: CSVRow[]
): OrderLineItem[] {
  return csvRows.map((row, lineIndex) => ({
    id: crypto.randomUUID(),
    order_item_id: orderId,
    sku: row.sku,
    product_title: row.title,
    quantity: parseInt(row.quantity) || 1,
    number_of_lines: parseInt(row.number_of_lines) || 1,
    line_index: lineIndex,
    created_at: new Date().toISOString()
  }));
}

export function parseCSVHeaders(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      preview: 1,
      complete: (results) => {
        if (results.meta.fields) {
          resolve(results.meta.fields);
        } else {
          resolve([]);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

export function findCardPair(tabs: UploadTab[], tabId: string): { front: UploadTab; inside: UploadTab } | null {
  const currentTab = tabs.find(t => t.id === tabId);
  if (!currentTab || !currentTab.isCard) return null;

  const pairedTab = tabs.find(t =>
    t.id !== tabId &&
    t.lineIndex === currentTab.lineIndex &&
    t.lineItemId === currentTab.lineItemId &&
    t.isCard &&
    t.pairIndex === currentTab.pairIndex
  );

  if (!pairedTab) return null;

  if (currentTab.label === 'Front') {
    return { front: currentTab, inside: pairedTab };
  } else if (currentTab.label === 'Inside') {
    return { front: pairedTab, inside: currentTab };
  }

  return null;
}

export function isCardTab(tab: UploadTab): boolean {
  return tab.isCard && (tab.label === 'Front' || tab.label === 'Inside');
}
