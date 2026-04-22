import { supabase } from './supabase';
import { CSVRow, OrderWithTabs, UploadTab, OrderLineItem, SKURoutingRule } from './types';
import { getSessionFiles, fetchFileAsBlob } from './cloudStorage';
import { productTypePositionService } from './productTypePositionService';
import { calculateTabsForOrder, createEmptyTabs, isCardSKU } from './csvParser';
import { folderSelectionService } from './folderSelectionService';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface SessionInfo {
  id: string;
  csvFilename: string;
  uploadedAt: string;
  lastAccessedAt: string;
  autoCleanupDays: number;
  isArchived: boolean;
  totalOrders: number;
  completedOrders: number;
}

export interface SessionPosition {
  id: string;
  sessionId: string;
  orderItemId: string;
  tabId: string;
  xPosition: number;
  yPosition: number;
  fontSize: number;
  rotation: number;
  savedAt: string;
}

export async function findSessionByCSVFilename(csvFilename: string): Promise<SessionInfo | null> {
  const { data, error } = await supabase
    .from('processing_sessions')
    .select('*')
    .eq('csv_filename', csvFilename)
    .eq('is_archived', false)
    .order('last_accessed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error finding session:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  const { count: totalCount } = await supabase
    .from('order_items')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', data.id);

  const { count: completedCount } = await supabase
    .from('order_items')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', data.id)
    .eq('is_saved', true);

  return {
    id: data.id,
    csvFilename: data.csv_filename,
    uploadedAt: data.uploaded_at || data.started_at,
    lastAccessedAt: data.last_accessed_at || data.uploaded_at || data.started_at,
    autoCleanupDays: data.auto_cleanup_days || 30,
    isArchived: data.is_archived || false,
    totalOrders: totalCount || 0,
    completedOrders: completedCount || 0
  };
}

export async function createSession(
  csvFilename: string,
  csvRows: CSVRow[]
): Promise<string | null> {
  const { data: sessionData, error: sessionError } = await supabase
    .from('processing_sessions')
    .insert({
      csv_filename: csvFilename,
      uploaded_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
      auto_cleanup_days: 30,
      is_archived: false
    })
    .select()
    .single();

  if (sessionError) {
    console.error('Error creating session:', sessionError);
    return null;
  }

  const orderItems = csvRows.map(row => ({
    session_id: sessionData.id,
    order_id: row.id,
    order_number: row.order_number,
    sku: row.sku,
    title: row.title,
    quantity: row.quantity,
    number_of_lines: row.number_of_lines,
    line1: row.line1 || '',
    line2: row.line2 || '',
    line3: row.line3 || '',
    line4: row.line4 || '',
    line5: row.line5 || '',
    line6: row.line6 || '',
    line7: row.line7 || '',
    line8: row.line8 || '',
    line9: row.line9 || '',
    line10: row.line10 || '',
    is_saved: false
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    console.error('Error creating order items:', itemsError);
    await supabase.from('processing_sessions').delete().eq('id', sessionData.id);
    return null;
  }

  return sessionData.id;
}

export async function updateSessionAccess(sessionId: string): Promise<void> {
  await supabase
    .from('processing_sessions')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', sessionId);
}

export async function getAllActiveSessions(): Promise<SessionInfo[]> {
  const { data, error } = await supabase
    .from('processing_sessions')
    .select('*')
    .eq('is_archived', false)
    .order('last_accessed_at', { ascending: false });

  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  const sessionsWithCounts = await Promise.all(
    data.map(async session => {
      const { count: totalCount } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id);

      const { count: completedCount } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id)
        .eq('is_saved', true);

      return {
        id: session.id,
        csvFilename: session.csv_filename,
        uploadedAt: session.uploaded_at || session.started_at,
        lastAccessedAt: session.last_accessed_at || session.uploaded_at || session.started_at,
        autoCleanupDays: session.auto_cleanup_days || 30,
        isArchived: session.is_archived || false,
        totalOrders: totalCount || 0,
        completedOrders: completedCount || 0
      };
    })
  );

  return sessionsWithCounts;
}

export async function saveOrderNumberPosition(
  sessionId: string,
  orderItemId: string,
  tabId: string,
  xPosition: number,
  yPosition: number,
  fontSize: number,
  rotation: number
): Promise<boolean> {
  const { error } = await supabase
    .from('session_positions')
    .upsert({
      session_id: sessionId,
      order_item_id: orderItemId,
      tab_id: tabId,
      x_position: xPosition,
      y_position: yPosition,
      font_size: fontSize,
      rotation: rotation,
      saved_at: new Date().toISOString()
    }, {
      onConflict: 'session_id,order_item_id,tab_id'
    });

  if (error) {
    console.error('Error saving position:', error);
    return false;
  }

  return true;
}

export async function getOrderNumberPosition(
  sessionId: string,
  orderItemId: string,
  tabId: string
): Promise<SessionPosition | null> {
  const { data, error } = await supabase
    .from('session_positions')
    .select('*')
    .eq('session_id', sessionId)
    .eq('order_item_id', orderItemId)
    .eq('tab_id', tabId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching position:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    sessionId: data.session_id,
    orderItemId: data.order_item_id,
    tabId: data.tab_id,
    xPosition: data.x_position,
    yPosition: data.y_position,
    fontSize: data.font_size,
    rotation: data.rotation,
    savedAt: data.saved_at
  };
}

export async function getSessionPositions(sessionId: string): Promise<SessionPosition[]> {
  const { data, error } = await supabase
    .from('session_positions')
    .select('*')
    .eq('session_id', sessionId);

  if (error) {
    console.error('Error fetching positions:', error);
    return [];
  }

  return data.map(pos => ({
    id: pos.id,
    sessionId: pos.session_id,
    orderItemId: pos.order_item_id,
    tabId: pos.tab_id,
    xPosition: pos.x_position,
    yPosition: pos.y_position,
    fontSize: pos.font_size,
    rotation: pos.rotation,
    savedAt: pos.saved_at
  }));
}

export async function archiveSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('processing_sessions')
    .update({ is_archived: true })
    .eq('id', sessionId);

  if (error) {
    console.error('Error archiving session:', error);
    return false;
  }

  return true;
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('processing_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error('Error deleting session:', error);
    return false;
  }

  return true;
}

export async function getOldSessions(days: number = 30): Promise<SessionInfo[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await supabase
    .from('processing_sessions')
    .select('*')
    .eq('is_archived', false)
    .lt('last_accessed_at', cutoffDate.toISOString());

  if (error) {
    console.error('Error fetching old sessions:', error);
    return [];
  }

  return data.map(session => ({
    id: session.id,
    csvFilename: session.csv_filename,
    uploadedAt: session.uploaded_at,
    lastAccessedAt: session.last_accessed_at || session.uploaded_at,
    autoCleanupDays: session.auto_cleanup_days || 30,
    isArchived: session.is_archived,
    totalOrders: 0,
    completedOrders: 0
  }));
}

async function reconstructTabsFromLineItems(
  orderId: string,
  lineItems: OrderLineItem[],
  routingRules: SKURoutingRule[]
): Promise<UploadTab[]> {
  let globalTabNumber = 1;
  const allTabs: UploadTab[] = [];

  for (const lineItem of lineItems) {
    const tabsForLine = calculateTabsForOrder(
      lineItem.sku,
      lineItem.product_title,
      lineItem.quantity,
      lineItem.number_of_lines
    );
    const isCard = isCardSKU(lineItem.product_title);
    const autoSelectedFolder = folderSelectionService.determineAutoSelectedFolder(lineItem.sku, routingRules);

    const tabs = createEmptyTabs(
      lineItem.sku,
      lineItem.product_title,
      tabsForLine,
      globalTabNumber,
      lineItem.line_index,
      isCard,
      autoSelectedFolder,
      lineItem.id
    );

    allTabs.push(...tabs);
    globalTabNumber += tabsForLine;
  }

  return allTabs;
}

export async function loadSessionData(sessionId: string): Promise<OrderWithTabs[] | null> {
  try {
    const { data: orders, error: ordersError } = await supabase
      .from('order_items')
      .select('*')
      .eq('session_id', sessionId)
      .order('order_number');

    if (ordersError || !orders) {
      console.error('Error loading orders:', ordersError);
      return null;
    }

    const { data: allLineItems, error: lineItemsError } = await supabase
      .from('order_line_items')
      .select('*')
      .in('order_item_id', orders.map(o => o.id))
      .order('line_index');

    if (lineItemsError) {
      console.error('Error loading line items:', lineItemsError);
      return null;
    }

    const { data: allTabMetadata, error: tabMetadataError } = await supabase
      .from('tab_metadata')
      .select('*')
      .in('order_item_id', orders.map(o => o.id))
      .order('tab_number');

    if (tabMetadataError) {
      console.error('Error loading tab metadata:', tabMetadataError);
      return null;
    }

    const uploadedFiles = await getSessionFiles(sessionId);
    const positions = await getSessionPositions(sessionId);

    // Check if we need to use migration fallback
    const hasTabMetadata = allTabMetadata && allTabMetadata.length > 0;
    const hasLineItems = allLineItems && allLineItems.length > 0;

    // Load routing rules for tab reconstruction
    let routingRules: SKURoutingRule[] = [];
    if (!hasTabMetadata && hasLineItems) {
      console.log('Tab metadata missing, reconstructing from line items...');
      const { data: rulesData } = await supabase
        .from('sku_routing_rules')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: false });
      routingRules = rulesData || [];
    }

    const ordersWithTabs: OrderWithTabs[] = [];

    for (const order of orders) {
      const lineItems = (allLineItems || []).filter(li => li.order_item_id === order.id);
      const tabMetadata = (allTabMetadata || []).filter(tm => tm.order_item_id === order.id);

      let tabs: UploadTab[] = [];

      // Use tab_metadata if available, otherwise reconstruct from line_items
      if (tabMetadata.length > 0) {
        // Existing logic: use tab_metadata
        for (const tabMeta of tabMetadata) {
          if (!tabMeta || !tabMeta.tab_id || !tabMeta.sku) {
            console.warn('Invalid tab metadata found, skipping:', tabMeta);
            continue;
          }

          // Validate required tab properties
          if (tabMeta.tab_number === null || tabMeta.tab_number === undefined) {
            console.warn('Tab metadata missing tab_number, setting to 0:', tabMeta);
            tabMeta.tab_number = 0;
          }

        const uploadedFile = uploadedFiles.find(
          f => f.orderItemId === order.id && f.tabId === tabMeta.tab_id
        );

        let pdfFile: File | null = null;
        let pdfDataUrl: string | null = null;
        let fileType: 'pdf' | 'jpg' | null = null;

        if (uploadedFile) {
          const blob = await fetchFileAsBlob(uploadedFile.storageUrl);
          if (blob) {
            pdfFile = new File([blob], uploadedFile.originalFilename, { type: blob.type });
            pdfDataUrl = await blobToDataUrl(blob);
            fileType = uploadedFile.fileType === 'pdf' ? 'pdf' : 'jpg';
          }
        }

        const position = positions.find(
          p => p.orderItemId === order.id && p.tabId === tabMeta.tab_id
        );

        let finalPosition = position ? {
          x: position.xPosition,
          y: position.yPosition,
          fontSize: position.fontSize,
          rotation: position.rotation
        } : null;

        let hasPosition = !!position;

        if (!position) {
          const productType = productTypePositionService.getProductType(tabMeta.sku || '', order.product_title || '');
          if (productType) {
            const typePosition = await productTypePositionService.getPositionByType(productType);
            if (typePosition) {
              finalPosition = {
                x: typePosition.x_position,
                y: typePosition.y_position,
                fontSize: typePosition.font_size,
                rotation: typePosition.rotation
              };
              hasPosition = true;
            }
          }
        }

          // Derive pairIndex for card tabs that pre-date the pair_index column
          let resolvedPairIndex: number | null = tabMeta.pair_index ?? null;
          if (resolvedPairIndex === null && tabMeta.is_card) {
            // Count how many card tabs with same lineItemId/lineIndex have been pushed so far
            const sameGroupCardsSoFar = tabs.filter(
              t => t.isCard && t.lineItemId === tabMeta.line_item_id && t.lineIndex === tabMeta.line_index
            ).length;
            resolvedPairIndex = Math.floor(sameGroupCardsSoFar / 2) + 1;
          }

          tabs.push({
            id: tabMeta.tab_id,
            label: tabMeta.label || `Tab ${tabMeta.tab_number || 0}`,
            tabNumber: tabMeta.tab_number || 0,
            sku: tabMeta.sku || '',
            lineIndex: tabMeta.line_index || 0,
            lineItemId: tabMeta.line_item_id || null,
            isCard: tabMeta.is_card || false,
            pairIndex: resolvedPairIndex,
            autoSelectedFolder: tabMeta.auto_selected_folder || null,
            selectedFolder: tabMeta.selected_folder || null,
            pdfFile,
            pdfDataUrl,
            fileType,
            fileWidth: null,
            fileHeight: null,
            isAutoLoaded: !!uploadedFile,
            orderNumberPlaced: hasPosition,
            position: finalPosition
          });
        }
      } else if (lineItems.length > 0) {
        // Fallback: reconstruct tabs from line items
        tabs = await reconstructTabsFromLineItems(order.id, lineItems, routingRules);

        // Apply positions and uploaded files to reconstructed tabs
        for (const tab of tabs) {
          const uploadedFile = uploadedFiles.find(
            f => f.orderItemId === order.id && f.tabId === tab.id
          );

          if (uploadedFile) {
            const blob = await fetchFileAsBlob(uploadedFile.storageUrl);
            if (blob) {
              tab.pdfFile = new File([blob], uploadedFile.originalFilename, { type: blob.type });
              tab.pdfDataUrl = await blobToDataUrl(blob);
              tab.fileType = uploadedFile.fileType === 'pdf' ? 'pdf' : 'jpg';
              tab.isAutoLoaded = true;
            }
          }

          const position = positions.find(
            p => p.orderItemId === order.id && p.tabId === tab.id
          );

          if (position) {
            tab.position = {
              x: position.xPosition,
              y: position.yPosition,
              fontSize: position.fontSize,
              rotation: position.rotation
            };
            tab.orderNumberPlaced = true;
          } else {
            // Try to get product type position
            const productType = productTypePositionService.getProductType(tab.sku, order.product_title || '');
            if (productType) {
              const typePosition = await productTypePositionService.getPositionByType(productType);
              if (typePosition) {
                tab.position = {
                  x: typePosition.x_position,
                  y: typePosition.y_position,
                  fontSize: typePosition.font_size,
                  rotation: typePosition.rotation
                };
                tab.orderNumberPlaced = true;
              }
            }
          }
        }
      }

      // Only add order if it has at least one valid tab
      if (tabs.length > 0) {
        ordersWithTabs.push({
          ...order,
          tabs,
          imageUrls: []
        });
      } else {
        console.warn('Order has no valid tabs, skipping:', order.order_number);
      }
    }

    return ordersWithTabs;
  } catch (error) {
    console.error('Unexpected error loading session:', error);
    return null;
  }
}
