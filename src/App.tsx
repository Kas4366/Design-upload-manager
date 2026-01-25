import { useState } from 'react';
import { Settings, FileUp, List, Upload } from 'lucide-react';
import { CSVUpload } from './components/CSVUpload';
import { OrderDashboard } from './components/OrderDashboard';
import { OrderUploadTabs } from './components/OrderUploadTabs';
import { PDFPlacementModal } from './components/PDFPlacementModal';
import { SettingsScreen } from './components/SettingsScreen';
import { SKURoutingRules } from './components/SKURoutingRules';
import { supabase } from './lib/supabase';
import { parseCSV, convertCSVRowsToOrderItems, calculateTabsForOrder, createEmptyTabs, extractImageUrls } from './lib/csvParser';
import { fileSaverService } from './lib/fileSaver';
import { skuPositionService } from './lib/db';
import type { CSVRow, OrderWithTabs, ProcessingSession, UploadTab } from './lib/types';

type AppView = 'upload' | 'orders';
type ModalView = 'settings' | 'routing' | 'placement' | null;

function App() {
  const [view, setView] = useState<AppView>('upload');
  const [modalView, setModalView] = useState<ModalView>(null);
  const [orders, setOrders] = useState<OrderWithTabs[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithTabs | null>(null);
  const [currentSession, setCurrentSession] = useState<ProcessingSession | null>(null);
  const [placementTab, setPlacementTab] = useState<{ order: OrderWithTabs; tabId: string } | null>(null);

  const handleCSVParsed = async (rows: CSVRow[], filename: string) => {
    const { data: session, error } = await supabase
      .from('processing_sessions')
      .insert([{
        csv_filename: filename,
        total_orders: rows.length,
        completed_orders: 0,
        status: 'in_progress'
      }])
      .select()
      .single();

    if (error || !session) {
      alert('Failed to create session');
      return;
    }

    setCurrentSession(session);

    const orderItems = convertCSVRowsToOrderItems(rows, session.id);

    const { data: insertedOrders, error: insertError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();

    if (insertError || !insertedOrders) {
      alert('Failed to save orders');
      return;
    }

    const ordersWithTabs: OrderWithTabs[] = insertedOrders.map(order => {
      const tabCount = calculateTabsForOrder(order.sku, order.quantity, order.number_of_lines);
      const tabs = createEmptyTabs(order.sku, tabCount);
      const imageUrls = extractImageUrls(`${order.customer_note} ${order.additional_options}`);

      return {
        ...order,
        tabs,
        imageUrls
      };
    });

    setOrders(ordersWithTabs);
    setView('orders');
  };

  const handleSelectOrder = (order: OrderWithTabs) => {
    setSelectedOrder(order);
  };

  const handleTabUpdate = async (tabId: string, file: File, dataUrl: string) => {
    if (!selectedOrder) return;

    const savedPosition = await skuPositionService.getSavedPosition(selectedOrder.sku);

    const updatedTabs = selectedOrder.tabs.map(tab =>
      tab.id === tabId
        ? {
            ...tab,
            pdfFile: file,
            pdfDataUrl: dataUrl,
            orderNumberPlaced: savedPosition ? true : false,
            position: savedPosition
              ? {
                  x: savedPosition.x_position,
                  y: savedPosition.y_position,
                  fontSize: savedPosition.font_size
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
        ? { ...tab, pdfFile: null, pdfDataUrl: null, orderNumberPlaced: false, position: null }
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

  const handleSavePosition = (x: number, y: number, fontSize: number) => {
    if (!placementTab) return;

    const { order, tabId } = placementTab;

    const updatedTabs = order.tabs.map(tab =>
      tab.id === tabId
        ? { ...tab, orderNumberPlaced: true, position: { x, y, fontSize } }
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

    const result = await fileSaverService.saveOrderFiles(selectedOrder);

    if (result.success) {
      alert(`Files saved successfully!\n\nSaved to:\n${result.savedPaths?.join('\n')}`);

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
  };

  const handleNewSession = () => {
    setView('upload');
    setOrders([]);
    setSelectedOrder(null);
    setCurrentSession(null);
  };

  if (view === 'upload') {
    return (
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

          <CSVUpload onCSVParsed={handleCSVParsed} />
        </div>

        {modalView === 'settings' && (
          <SettingsScreen onClose={() => setModalView(null)} />
        )}
        {modalView === 'routing' && (
          <SKURoutingRules onClose={() => setModalView(null)} />
        )}
      </div>
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
              onTabUpdate={handleTabUpdate}
              onRemoveFile={handleRemoveFile}
              onPlaceOrderNumber={handlePlaceOrderNumber}
              onAdjustPosition={handleAdjustPosition}
              onClearPosition={handleClearPosition}
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
      {placementTab && (
        <PDFPlacementModal
          order={{
            id: placementTab.tabId,
            orderNumber: placementTab.order.order_number,
            sku: placementTab.order.sku,
            pdfFile: placementTab.order.tabs.find(t => t.id === placementTab.tabId)?.pdfFile || null,
            pdfDataUrl: placementTab.order.tabs.find(t => t.id === placementTab.tabId)?.pdfDataUrl || null,
            position: null,
            hasPosition: false
          }}
          initialPosition={placementTab.order.tabs.find(t => t.id === placementTab.tabId)?.position || null}
          onClose={() => setPlacementTab(null)}
          onSavePosition={(_, x, y, fontSize) => handleSavePosition(x, y, fontSize)}
        />
      )}
    </div>
  );
}

export default App;
