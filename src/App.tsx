import { useState, useEffect } from 'react';
import { Settings, FileUp, List, Upload, CheckSquare, Eye, FolderOpen } from 'lucide-react';
import { CSVUpload } from './components/CSVUpload';
import { OrderDashboard } from './components/OrderDashboard';
import { OrderUploadTabs } from './components/OrderUploadTabs';
import { PDFPlacementModal } from './components/PDFPlacementModal';
import { SettingsScreenWeb as SettingsScreen } from './components/SettingsScreenWeb';
import { SKURoutingRules } from './components/SKURoutingRules';
import SaveValidationModal from './components/SaveValidationModal';
import CorrectionCheckModal from './components/CorrectionCheckModal';
import SessionSelector from './components/SessionSelector';
import { supabase } from './lib/supabase';
import { parseCSV, convertCSVRowsToOrderItems, createEmptyTabs, extractImageUrls, createLineItemsForOrder, calculateTabsForOrder, isCardSKU } from './lib/csvParser';
import { fileSaverService } from './lib/fileSaver';
import { folderSelectionService } from './lib/folderSelectionService';
import { skuPositionService } from './lib/db';
import { premadeDesignService } from './lib/premadeDesignService';
import { getFileDimensions } from './lib/pdfProcessor';
import { loadSessionData, updateSessionAccess, findSessionByCSVFilename, archiveSession } from './lib/sessionService';
import { productTypePositionService } from './lib/productTypePositionService';
import { loadPremadeFolderHandle, savePremadeFolderHandle } from './lib/fileSystemAccess';
import { fileSystemAPI } from './lib/fileSystemAccess';
import type { CSVRow, OrderWithTabs, ProcessingSession, UploadTab, FolderType, SKURoutingRule } from './lib/types';

type AppView = 'upload' | 'orders';
type ModalView = 'settings' | 'routing' | 'placement' | 'save-validation' | 'correction-check' | 'session-selector' | null;

function App() {
  const [view, setView] = useState<AppView>('upload');
  const [modalView, setModalView] = useState<ModalView>(null);
  const [orders, setOrders] = useState<OrderWithTabs[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithTabs | null>(null);
  const [currentSession, setCurrentSession] = useState<ProcessingSession | null>(null);
  const [placementTab, setPlacementTab] = useState<{ order: OrderWithTabs; tabId: string } | null>(null);
  const [availableFolders, setAvailableFolders] = useState<FolderType[]>([]);
  const [routingRules, setRoutingRules] = useState<SKURoutingRule[]>([]);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');

  useEffect(() => {
    loadFoldersAndRules();
    testDatabaseConnection();
  }, []);

  useEffect(() => {
    if (!currentSession) return;

    const updateInterval = setInterval(() => {
      updateSessionAccess(currentSession.id);
    }, 5 * 60 * 1000);

    return () => clearInterval(updateInterval);
  }, [currentSession]);

  const testDatabaseConnection = async () => {
    try {
      console.log('Testing Supabase connection...');
      const { data, error } = await supabase
        .from('app_settings')
        .select('count')
        .limit(1);

      if (error) {
        console.error('Database connection test failed:', error);
      } else {
        console.log('Database connection successful!', data);
      }
    } catch (err) {
      console.error('Failed to test database connection:', err);
    }
  };

  const loadFoldersAndRules = async () => {
    const folders = await folderSelectionService.getActiveFolders();
    const rules = await folderSelectionService.getRoutingRules();
    setAvailableFolders(folders);
    setRoutingRules(rules);
  };

  const handleLoadSession = async (sessionId: string) => {
    const { data: session, error: sessionError } = await supabase
      .from('processing_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      alert('Failed to load session');
      return;
    }

    const ordersWithTabs = await loadSessionData(sessionId);

    if (!ordersWithTabs) {
      alert('Failed to load session data');
      return;
    }

    // Check if session has ready-made orders and prompt for premade folder if needed
    const hasReadyMadeOrders = ordersWithTabs.some(order =>
      premadeDesignService.isReadyMadeOrder(order.product_title, order.customer_note)
    );

    if (hasReadyMadeOrders) {
      let premadeHandle = await loadPremadeFolderHandle();

      if (!premadeHandle || !(await fileSystemAPI.verifyPermission(premadeHandle))) {
        premadeHandle = await fileSystemAPI.requestFolderAccess();

        if (premadeHandle) {
          await savePremadeFolderHandle(premadeHandle);
        }
      }
    }

    await updateSessionAccess(sessionId);

    setCurrentSession(session);
    setOrders(ordersWithTabs);
    if (ordersWithTabs.length > 0) {
      setSelectedOrder(ordersWithTabs[0]);
    }
    setView('orders');
    setModalView(null);
  };

  const handleCSVParsed = async (rows: CSVRow[], filename: string) => {
    setIsUploadingCSV(true);
    setUploadProgress('Checking for existing session...');

    try {
      const existingSession = await findSessionByCSVFilename(filename);

      if (existingSession) {
        const confirmed = window.confirm(
          `A session for "${filename}" already exists.\n\n` +
          `Started: ${new Date(existingSession.uploadedAt).toLocaleString()}\n` +
          `Last accessed: ${new Date(existingSession.lastAccessedAt).toLocaleString()}\n` +
          `Progress: ${existingSession.completedOrders}/${existingSession.totalOrders} orders\n\n` +
          `Click OK to resume the existing session, or Cancel to start fresh.`
        );

        if (confirmed) {
          setUploadProgress('Loading existing session...');
          await handleLoadSession(existingSession.id);
          setIsUploadingCSV(false);
          return;
        } else {
          await archiveSession(existingSession.id);
        }
      }

      setUploadProgress('Creating new session...');

    // Group CSV rows by order_number to get unique order count
    const groupedByOrderNumber = new Map<string, CSVRow[]>();
    rows.forEach(row => {
      const orderNum = row.order_number;
      if (!groupedByOrderNumber.has(orderNum)) {
        groupedByOrderNumber.set(orderNum, []);
      }
      groupedByOrderNumber.get(orderNum)!.push(row);
    });

    const { data: session, error } = await supabase
      .from('processing_sessions')
      .insert([{
        csv_filename: filename,
        total_orders: groupedByOrderNumber.size,
        completed_orders: 0,
        status: 'in_progress',
        uploaded_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error || !session) {
      alert('Failed to create session');
      return;
    }

    setCurrentSession(session);

    // Create consolidated order items (one per unique order_number)
    const orderItems = convertCSVRowsToOrderItems(rows, session.id);

    const { data: insertedOrders, error: insertError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();

    if (insertError || !insertedOrders) {
      alert('Failed to save orders');
      return;
    }

    // Now create line items for each order
    for (const order of insertedOrders) {
      const csvRowsForOrder = groupedByOrderNumber.get(order.order_number) || [];
      const lineItems = createLineItemsForOrder(order.id, csvRowsForOrder);

      const { error: lineItemsError } = await supabase
        .from('order_line_items')
        .insert(lineItems);

      if (lineItemsError) {
        console.error('Failed to create line items:', lineItemsError);
      }
    }

    // Check if there are any ready-made orders and prompt for premade folder if needed
    const hasReadyMadeOrders = insertedOrders.some(order =>
      premadeDesignService.isReadyMadeOrder(order.product_title, order.customer_note)
    );

    if (hasReadyMadeOrders) {
      setUploadProgress('Checking premade folder access...');
      let premadeHandle = await loadPremadeFolderHandle();

      if (!premadeHandle || !(await fileSystemAPI.verifyPermission(premadeHandle))) {
        setUploadProgress('Please select your premade designs folder...');
        premadeHandle = await fileSystemAPI.requestFolderAccess();

        if (premadeHandle) {
          await savePremadeFolderHandle(premadeHandle);
        } else {
          console.warn('Premade folder not selected. Ready-made designs will not be auto-loaded.');
        }
      }
    }

    // Fetch line items for all orders to build tabs
    const { data: allLineItems } = await supabase
      .from('order_line_items')
      .select('*')
      .in('order_item_id', insertedOrders.map(o => o.id));

    const ordersWithTabs: OrderWithTabs[] = [];

    for (const order of insertedOrders) {
      const lineItems = (allLineItems || [])
        .filter(li => li.order_item_id === order.id)
        .sort((a, b) => a.line_index - b.line_index);

      let globalTabNumber = 1;
      const allTabs: UploadTab[] = [];

      // Create tabs for each line item
      lineItems.forEach((lineItem) => {
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
      });

      // Save tab metadata to database
      setUploadProgress(`Saving order metadata (${ordersWithTabs.length + 1}/${insertedOrders.length})...`);
      for (const tab of allTabs) {
        await folderSelectionService.saveTabMetadata({
          order_item_id: order.id,
          tab_id: tab.id,
          tab_number: tab.tabNumber,
          sku: tab.sku,
          line_index: tab.lineIndex,
          is_card: tab.isCard,
          label: tab.label,
          auto_selected_folder: tab.autoSelectedFolder,
          selected_folder: tab.selectedFolder
        });
      }

      // Check for wrapper type and apply saved position if exists
      for (const tab of allTabs) {
        const productType = productTypePositionService.getProductType(tab.sku, order.product_title);
        if (productType) {
          const typePosition = await productTypePositionService.getPositionByType(productType);
          if (typePosition && !tab.position) {
            tab.orderNumberPlaced = true;
            tab.position = {
              x: typePosition.x_position,
              y: typePosition.y_position,
              fontSize: typePosition.font_size,
              rotation: typePosition.rotation
            };
          }
        }
      }

      const imageUrls = extractImageUrls(`${order.customer_note} ${order.additional_options}`);

      const isReadyMade = premadeDesignService.isReadyMadeOrder(order.product_title, order.customer_note);

      if (isReadyMade) {
        setUploadProgress(`Loading ready-made designs (${ordersWithTabs.length + 1}/${insertedOrders.length})...`);
        for (const tab of allTabs) {
          const isInsideCard = tab.isCard && tab.label === 'Inside';
          if (isInsideCard) continue;

          try {
            const designData = await premadeDesignService.loadDesignForSKU(tab.sku);
            if (designData) {
              const savedPosition = await skuPositionService.getSavedPosition(tab.sku);
              const dimensions = await getFileDimensions(designData.file, 'jpg');

              tab.pdfFile = designData.file;
              tab.pdfDataUrl = designData.dataUrl;
              tab.fileType = 'jpg';
              tab.fileWidth = dimensions.width;
              tab.fileHeight = dimensions.height;
              tab.isAutoLoaded = true;

              if (savedPosition) {
                tab.orderNumberPlaced = true;
                tab.position = {
                  x: savedPosition.x_position,
                  y: savedPosition.y_position,
                  fontSize: savedPosition.font_size,
                  rotation: savedPosition.rotation
                };
              } else {
                const productType = productTypePositionService.getProductType(tab.sku, order.product_title);
                if (productType) {
                  const typePosition = await productTypePositionService.getPositionByType(productType);
                  if (typePosition) {
                    tab.orderNumberPlaced = true;
                    tab.position = {
                      x: typePosition.x_position,
                      y: typePosition.y_position,
                      fontSize: typePosition.font_size,
                      rotation: typePosition.rotation
                    };
                  }
                }
              }
            }
          } catch (error) {
            console.error('Failed to auto-load design for SKU:', tab.sku, error);
          }
        }
      }

      ordersWithTabs.push({
        ...order,
        tabs: allTabs,
        imageUrls
      });
    }

      setOrders(ordersWithTabs);
      setView('orders');
    } catch (error) {
      console.error('Error during CSV upload:', error);
      alert('An error occurred while processing the CSV file. Please try again.');
    } finally {
      setIsUploadingCSV(false);
      setUploadProgress('');
    }
  };

  const handleSelectOrder = (order: OrderWithTabs) => {
    setSelectedOrder(order);
  };

  const handleTabUpdate = async (tabId: string, file: File, dataUrl: string) => {
    if (!selectedOrder) return;

    const currentTab = selectedOrder.tabs.find(t => t.id === tabId);
    const savedPosition = await skuPositionService.getSavedPosition(currentTab?.sku || selectedOrder.sku);

    const fileType = file.type.includes('image') ? 'jpg' : 'pdf';

    const dimensions = await getFileDimensions(file, fileType);

    // Check for product type position (e.g., wrapper)
    let typePosition = null;
    if (currentTab && !savedPosition) {
      const productType = productTypePositionService.getProductType(currentTab.sku, selectedOrder.product_title);
      if (productType) {
        typePosition = await productTypePositionService.getPositionByType(productType);
      }
    }

    const positionToUse = savedPosition || typePosition;

    const updatedTabs = selectedOrder.tabs.map(tab =>
      tab.id === tabId
        ? {
            ...tab,
            pdfFile: file,
            pdfDataUrl: dataUrl,
            fileType,
            fileWidth: dimensions.width,
            fileHeight: dimensions.height,
            isAutoLoaded: false,
            orderNumberPlaced: positionToUse ? true : false,
            position: positionToUse
              ? {
                  x: positionToUse.x_position,
                  y: positionToUse.y_position,
                  fontSize: positionToUse.font_size,
                  rotation: positionToUse.rotation
                }
              : null
          }
        : tab
    );

    const updatedOrder = { ...selectedOrder, tabs: updatedTabs, status: 'uploaded' as const };
    setSelectedOrder(updatedOrder);

    setOrders(orders.map(o =>
      o.id === selectedOrder.id ? updatedOrder : o
    ));
  };

  const handleRemoveFile = (tabId: string) => {
    if (!selectedOrder) return;

    const updatedTabs = selectedOrder.tabs.map(tab =>
      tab.id === tabId
        ? { ...tab, pdfFile: null, pdfDataUrl: null, fileType: null, fileWidth: null, fileHeight: null, isAutoLoaded: false, orderNumberPlaced: false, position: null }
        : tab
    );

    const updatedOrder = { ...selectedOrder, tabs: updatedTabs };
    setSelectedOrder(updatedOrder);

    setOrders(orders.map(o =>
      o.id === selectedOrder.id ? updatedOrder : o
    ));
  };

  const handlePlaceOrderNumber = (tabId: string) => {
    if (!selectedOrder) return;
    setPlacementTab({ order: selectedOrder, tabId });
  };

  const handleAdjustPosition = (tabId: string) => {
    if (!selectedOrder) return;
    setPlacementTab({ order: selectedOrder, tabId });
  };

  const handleClearPosition = (tabId: string) => {
    if (!selectedOrder) return;

    const updatedTabs = selectedOrder.tabs.map(tab =>
      tab.id === tabId
        ? { ...tab, orderNumberPlaced: false, position: null }
        : tab
    );

    const updatedOrder = { ...selectedOrder, tabs: updatedTabs };
    setSelectedOrder(updatedOrder);

    setOrders(orders.map(o =>
      o.id === selectedOrder.id ? updatedOrder : o
    ));
  };

  const handleToggleCard = (tabId: string, isCard: boolean) => {
    if (!selectedOrder) return;

    const currentTab = selectedOrder.tabs.find(t => t.id === tabId);
    if (!currentTab) return;

    // Find the paired tab (same lineIndex, same lineItemId)
    const pairedTab = selectedOrder.tabs.find(t =>
      t.id !== tabId &&
      t.lineIndex === currentTab.lineIndex &&
      t.lineItemId === currentTab.lineItemId
    );

    if (isCard) {
      // Toggling ON - check if current tab has file
      if (currentTab.pdfFile) {
        const confirmed = confirm(
          'Switching to Card Design will clear the uploaded file and create Front/Inside tabs. Continue?'
        );
        if (!confirmed) return;
      }

      let updatedTabs: UploadTab[];

      if (pairedTab) {
        // Paired tab exists, just update both to isCard=true and clear files
        updatedTabs = selectedOrder.tabs.map(tab => {
          if (tab.id === tabId || tab.id === pairedTab.id) {
            return {
              ...tab,
              isCard: true,
              pdfFile: null,
              pdfDataUrl: null,
              orderNumberPlaced: false,
              position: null,
              selectedFolder: tab.autoSelectedFolder
            };
          }
          return tab;
        });
      } else {
        // No paired tab - create Front and Inside tabs
        const baseTabNumber = currentTab.tabNumber;

        // Update the current tab to be "Front"
        // Create new "Inside" tab
        const insideTab: UploadTab = {
          id: `${currentTab.id}-inside`,
          label: 'Inside',
          tabNumber: baseTabNumber,
          sku: currentTab.sku,
          lineIndex: currentTab.lineIndex,
          lineItemId: currentTab.lineItemId,
          isCard: true,
          autoSelectedFolder: currentTab.autoSelectedFolder,
          selectedFolder: currentTab.autoSelectedFolder,
          pdfFile: null,
          pdfDataUrl: null,
          orderNumberPlaced: false,
          position: null
        };

        updatedTabs = selectedOrder.tabs.map(tab => {
          if (tab.id === tabId) {
            return {
              ...tab,
              label: 'Front',
              isCard: true,
              pdfFile: null,
              pdfDataUrl: null,
              orderNumberPlaced: false,
              position: null,
              selectedFolder: tab.autoSelectedFolder
            };
          }
          return tab;
        });

        // Insert the inside tab right after the front tab
        const currentIndex = updatedTabs.findIndex(t => t.id === tabId);
        updatedTabs.splice(currentIndex + 1, 0, insideTab);
      }

      const updatedOrder = { ...selectedOrder, tabs: updatedTabs };
      setSelectedOrder(updatedOrder);
      setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrder : o));

    } else {
      // Toggling OFF - check if any card tabs have files
      const hasFiles = currentTab.pdfFile || (pairedTab && pairedTab.pdfFile);

      if (hasFiles) {
        const confirmed = confirm(
          'Disabling Card Design will clear all uploaded files from Front and Inside tabs. Continue?'
        );
        if (!confirmed) return;
      }

      let updatedTabs: UploadTab[];

      if (pairedTab) {
        // Remove the paired tab and convert current to regular tab
        updatedTabs = selectedOrder.tabs
          .filter(tab => tab.id !== pairedTab.id)
          .map(tab => {
            if (tab.id === tabId) {
              return {
                ...tab,
                label: `${tab.tabNumber}`,
                isCard: false,
                pdfFile: null,
                pdfDataUrl: null,
                orderNumberPlaced: false,
                position: null,
                selectedFolder: tab.autoSelectedFolder
              };
            }
            return tab;
          });
      } else {
        // No paired tab, just toggle isCard flag and clear files
        updatedTabs = selectedOrder.tabs.map(tab => {
          if (tab.id === tabId) {
            return {
              ...tab,
              isCard: false,
              pdfFile: null,
              pdfDataUrl: null,
              orderNumberPlaced: false,
              position: null,
              selectedFolder: tab.autoSelectedFolder
            };
          }
          return tab;
        });
      }

      const updatedOrder = { ...selectedOrder, tabs: updatedTabs };
      setSelectedOrder(updatedOrder);
      setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrder : o));
    }
  };

  const handleFolderSelect = (tabId: string, folder: string) => {
    if (!selectedOrder) return;

    const updatedTabs = selectedOrder.tabs.map(tab =>
      tab.id === tabId
        ? { ...tab, selectedFolder: folder }
        : tab
    );

    const updatedOrder = { ...selectedOrder, tabs: updatedTabs };
    setSelectedOrder(updatedOrder);

    setOrders(orders.map(o =>
      o.id === selectedOrder.id ? updatedOrder : o
    ));
  };

  const handleSavePosition = (x: number, y: number, fontSize: number, rotation: number) => {
    if (!placementTab) return;

    const { order, tabId } = placementTab;

    const updatedTabs = order.tabs.map(tab =>
      tab.id === tabId
        ? { ...tab, orderNumberPlaced: true, position: { x, y, fontSize, rotation } }
        : tab
    );

    const updatedOrder = { ...order, tabs: updatedTabs };
    setSelectedOrder(updatedOrder);

    setOrders(orders.map(o =>
      o.id === order.id ? updatedOrder : o
    ));

    setPlacementTab(null);
  };

  const handleSaveOrder = async () => {
    if (!selectedOrder) return;

    setIsSaving(true);
    setSaveProgress('Saving design files...');

    try {
      const result = await fileSaverService.saveOrderFiles(selectedOrder);

      if (result.success) {
        let message = 'Files saved successfully!';

        if (result.savedPaths && result.savedPaths.length > 0) {
          message += `\n\nSaved (${result.savedPaths.length}):\n${result.savedPaths.join('\n')}`;
        }

        if (result.skippedPaths && result.skippedPaths.length > 0) {
          message += `\n\nSkipped (already saved, ${result.skippedPaths.length}):\n${result.skippedPaths.join('\n')}`;
        }

        alert(message);

        const updatedOrder = { ...selectedOrder, status: 'saved' as const };
        setSelectedOrder(updatedOrder);

        setOrders(orders.map(o =>
          o.id === selectedOrder.id ? updatedOrder : o
        ));

        if (currentSession) {
          const completedCount = orders.filter(o => o.status === 'saved').length + 1;

          await supabase
            .from('processing_sessions')
            .update({
              completed_orders: completedCount,
              status: completedCount === orders.length ? 'completed' : 'in_progress',
              completed_at: completedCount === orders.length ? new Date().toISOString() : null
            })
            .eq('id', currentSession.id);
        }
      } else {
        alert(`Failed to save files:\n${result.error}`);
      }
    } finally {
      setIsSaving(false);
      setSaveProgress('');
    }
  };

  const handleSaveAll = () => {
    setModalView('save-validation');
  };

  const handleBatchSave = async (selectedOrderIds: string[]) => {
    setModalView(null);

    if (selectedOrderIds.length === 0) return;

    setIsSaving(true);
    setSaveProgress(`Saving 0 of ${selectedOrderIds.length} orders...`);

    try {
      const ordersToSave = orders.filter(o => selectedOrderIds.includes(o.id));
      let savedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < ordersToSave.length; i++) {
        const order = ordersToSave[i];
        setSaveProgress(`Saving order ${i + 1} of ${ordersToSave.length}...`);

        const result = await fileSaverService.saveOrderFiles(order);

        if (result.success) {
          savedCount += result.savedPaths?.length || 0;
          skippedCount += result.skippedPaths?.length || 0;

          await supabase
            .from('order_items')
            .update({
              status: 'saved',
              saved_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);
        } else {
          errors.push(`Order ${order.order_number}: ${result.error}`);
        }
      }

      let message = 'Batch save completed!';
      message += `\n\nSaved: ${savedCount} files`;

      if (skippedCount > 0) {
        message += `\nSkipped: ${skippedCount} files (already saved)`;
      }

      if (errors.length > 0) {
        message += `\n\nErrors:\n${errors.join('\n')}`;
      }

      alert(message);

      const updatedOrders = orders.map(order =>
        selectedOrderIds.includes(order.id)
          ? { ...order, status: 'saved' as const }
          : order
      );

      setOrders(updatedOrders);

      if (selectedOrder && selectedOrderIds.includes(selectedOrder.id)) {
        setSelectedOrder({ ...selectedOrder, status: 'saved' as const });
      }

      if (currentSession) {
        const completedCount = updatedOrders.filter(o => o.status === 'saved').length;

        await supabase
          .from('processing_sessions')
          .update({
            completed_orders: completedCount,
            status: completedCount === orders.length ? 'completed' : 'in_progress',
            completed_at: completedCount === orders.length ? new Date().toISOString() : null
          })
          .eq('id', currentSession.id);
      }
    } finally {
      setIsSaving(false);
      setSaveProgress('');
    }
  };

  const handleNewSession = () => {
    setView('upload');
    setOrders([]);
    setSelectedOrder(null);
    setCurrentSession(null);
  };

  if (view === 'upload') {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="container mx-auto px-4 py-8">
            <header className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  Design Upload Manager
                </h1>
                <p className="text-gray-600">
                  Upload CSV to process orders and manage design files
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setModalView('routing')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <List className="w-5 h-5" />
                  SKU Rules
                </button>
                <button
                  onClick={() => setModalView('settings')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  Settings
                </button>
              </div>
            </header>

            <div className="space-y-6">
              <CSVUpload onCSVParsed={handleCSVParsed} />

              <div className="flex items-center gap-4 max-w-2xl mx-auto">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-gray-500 font-medium">OR</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>

              <div className="max-w-2xl mx-auto">
                <button
                  onClick={() => setModalView('session-selector')}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition-all group"
                >
                  <FolderOpen className="w-6 h-6 text-gray-600 group-hover:text-blue-600" />
                  <div className="text-left">
                    <div className="font-semibold text-gray-900 group-hover:text-blue-900">
                      Load Existing Session
                    </div>
                    <div className="text-sm text-gray-600 group-hover:text-blue-700">
                      Resume work from a previous CSV upload
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {modalView === 'settings' && (
            <SettingsScreen onClose={() => setModalView(null)} />
          )}
          {modalView === 'routing' && (
            <SKURoutingRules onClose={() => setModalView(null)} />
          )}
          {modalView === 'session-selector' && (
            <SessionSelector
              onSessionSelect={handleLoadSession}
              onClose={() => setModalView(null)}
            />
          )}
        </div>

        {isUploadingCSV && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Processing CSV</h3>
                <p className="text-gray-600 text-center">{uploadProgress}</p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Design Upload Manager</h1>
              {currentSession && (
                <p className="text-sm text-gray-600 mt-1">
                  Session: {currentSession.csv_filename} | {currentSession.completed_orders}/{currentSession.total_orders} completed
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setModalView('correction-check')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Eye className="w-5 h-5" />
              Correction Check
            </button>
            <button
              onClick={handleSaveAll}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckSquare className="w-5 h-5" />
              Save All
            </button>
            <button
              onClick={handleNewSession}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <FileUp className="w-5 h-5" />
              New Session
            </button>
            <button
              onClick={() => setModalView('routing')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <List className="w-5 h-5" />
              SKU Rules
            </button>
            <button
              onClick={() => setModalView('settings')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 border-r border-gray-200 bg-white overflow-hidden">
          <OrderDashboard
            orders={orders}
            onSelectOrder={handleSelectOrder}
            selectedOrderId={selectedOrder?.id || null}
          />
        </div>

        <div className="flex-1 overflow-hidden">
          {selectedOrder ? (
            <OrderUploadTabs
              order={selectedOrder}
              availableFolders={availableFolders}
              onTabUpdate={handleTabUpdate}
              onRemoveFile={handleRemoveFile}
              onPlaceOrderNumber={handlePlaceOrderNumber}
              onAdjustPosition={handleAdjustPosition}
              onClearPosition={handleClearPosition}
              onToggleCard={handleToggleCard}
              onFolderSelect={handleFolderSelect}
              onSaveOrder={handleSaveOrder}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Upload className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Select an order to begin</p>
                <p className="text-sm">Choose an order from the list to upload designs</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalView === 'settings' && (
        <SettingsScreen onClose={() => setModalView(null)} />
      )}
      {modalView === 'routing' && (
        <SKURoutingRules onClose={() => setModalView(null)} />
      )}
      {modalView === 'save-validation' && (
        <SaveValidationModal
          isOpen={true}
          onClose={() => setModalView(null)}
          orders={orders}
          onSaveSelected={handleBatchSave}
        />
      )}
      {modalView === 'correction-check' && (
        <CorrectionCheckModal
          isOpen={true}
          onClose={() => setModalView(null)}
          orders={orders}
        />
      )}
      {placementTab && (
        <PDFPlacementModal
          order={{
            id: placementTab.tabId,
            orderNumber: placementTab.order.order_number,
            sku: placementTab.order.tabs.find(t => t.id === placementTab.tabId)?.sku || placementTab.order.sku,
            pdfFile: placementTab.order.tabs.find(t => t.id === placementTab.tabId)?.pdfFile || null,
            pdfDataUrl: placementTab.order.tabs.find(t => t.id === placementTab.tabId)?.pdfDataUrl || null,
            fileType: placementTab.order.tabs.find(t => t.id === placementTab.tabId)?.fileType || null,
            fileWidth: placementTab.order.tabs.find(t => t.id === placementTab.tabId)?.fileWidth || null,
            fileHeight: placementTab.order.tabs.find(t => t.id === placementTab.tabId)?.fileHeight || null,
            position: null,
            hasPosition: false
          }}
          productTitle={placementTab.order.product_title}
          initialPosition={placementTab.order.tabs.find(t => t.id === placementTab.tabId)?.position || null}
          onClose={() => setPlacementTab(null)}
          onSavePosition={(_, x, y, fontSize, rotation) => handleSavePosition(x, y, fontSize, rotation)}
        />
      )}

      {isSaving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Saving Files</h3>
              <p className="text-gray-600 text-center">{saveProgress}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
